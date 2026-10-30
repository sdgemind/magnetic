(() => {
"use strict";
const C = {
  bg: "#101e32",
  field: "#17324a",
  fieldLine: "#4cddcc",
  particle: "#4cddcc",
  orange: "#ffba69",
  text: "#dce8f7",
  muted: "#91a8c4",
  grid: "#243951",
};
const SCALE = 110;
const clamp = (v, lo, hi) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
const finite = (v, fallback = 0) => (Number.isFinite(v) ? v : fallback);
const params = (p, key, fallback) => finite(Number(p[key]), fallback);
const pushTrail = (s, x, y) => {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  s.trail.push([x, y]);
  if (s.trail.length > 1100) s.trail.splice(0, s.trail.length - 1100);
};
function background(ctx, w, h, title, subtitle) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 1;
  for (let x = 50; x < w; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 50; y < h; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.fillStyle = C.text;
  ctx.font = "600 20px sans-serif";
  ctx.fillText(title, 24, 32);
  ctx.fillStyle = C.muted;
  ctx.font = "18px sans-serif";
  ctx.fillText(subtitle, 24, 58);
}
function drawTrail(ctx, trail) {
  if (trail.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(trail[0][0], trail[0][1]);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i][0], trail[i][1]);
  ctx.strokeStyle = C.fieldLine;
  ctx.lineWidth = 2.5;
  ctx.globalAlpha = 0.78;
  ctx.stroke();
  ctx.globalAlpha = 1;
}
function particle(ctx, x, y, radius = 9) {
  ctx.beginPath();
  ctx.arc(x, y, radius + 5, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(76,221,204,.16)";
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = C.particle;
  ctx.fill();
}
function fieldDots(ctx, x0, y0, x1, y1, direction = 1) {
  ctx.fillStyle = C.fieldLine;
  ctx.globalAlpha = 0.72;
  for (let y = y0 + 24; y < y1 - 12; y += 38)
    for (let x = x0 + 24; x < x1 - 12; x += 38) {
      ctx.strokeStyle = C.fieldLine;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      if (direction > 0) {
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(x - 5, y - 5);
        ctx.lineTo(x + 5, y + 5);
        ctx.moveTo(x - 5, y + 5);
        ctx.lineTo(x + 5, y - 5);
        ctx.stroke();
      }
    }
  ctx.globalAlpha = 1;
}
const baseControls = [
  {
    key: "shape",
    label: "磁场形状",
    type: "select",
    value: "circle",
    options: [
      { value: "circle", label: "圆形" },
      { value: "rect", label: "矩形" },
    ],
  },
  {
    key: "B",
    label: "磁感应强度 B",
    type: "range",
    value: 1,
    min: 0.2,
    max: 2,
    step: 0.1,
    unit: "T",
  },
  { key: "reverse", label: "磁场反向", type: "toggle", value: false },
  {
    key: "angle",
    label: "入射角",
    type: "range",
    value: 0,
    min: -35,
    max: 35,
    step: 1,
    unit: "°",
  },
  {
    key: "speed",
    label: "初速度",
    type: "range",
    value: 2,
    min: 0.5,
    max: 4,
    step: 0.1,
    unit: "m/s",
  },
  {
    key: "q",
    label: "电荷量 q",
    type: "range",
    value: 1,
    min: 0.2,
    max: 2,
    step: 0.1,
    unit: "C",
  },
  {
    key: "m",
    label: "质量 m",
    type: "range",
    value: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
    unit: "kg",
  },
  {
    key: "fieldX",
    label: "边界中心 x",
    type: "range",
    value: 650,
    min: 400,
    max: 820,
    step: 10,
    unit: "px",
  },
  {
    key: "fieldY",
    label: "边界中心 y",
    type: "range",
    value: 325,
    min: 180,
    max: 470,
    step: 5,
    unit: "px",
  },
  {
    key: "fieldW",
    label: "圆半径 / 矩形半宽",
    type: "range",
    value: 170,
    min: 80,
    max: 240,
    step: 5,
    unit: "px",
  },
  {
    key: "fieldH",
    label: "矩形高度",
    type: "range",
    value: 220,
    min: 90,
    max: 360,
    step: 10,
    unit: "px",
  },
];
function insideBounded(x, y, p) {
  const cx = params(p, "fieldX", 650),
    cy = params(p, "fieldY", 325),
    a = params(p, "fieldW", 170);
  if (p.shape === "rect")
    return (
      Math.abs(x - cx) <= a && Math.abs(y - cy) <= params(p, "fieldH", 220) / 2
    );
  return (x - cx) ** 2 + (y - cy) ** 2 <= a ** 2;
}
function resetBounded(s, p) {
  s.x = 80;
  s.y = params(p, "fieldY", 325);
  s.vx =
    params(p, "speed", 2) *
    Math.cos((params(p, "angle", 0) * Math.PI) / 180) *
    SCALE;
  s.vy =
    -params(p, "speed", 2) *
    Math.sin((params(p, "angle", 0) * Math.PI) / 180) *
    SCALE;
  s.t = 0;
  s.trail = [];
  s.active = true;
  pushTrail(s, s.x, s.y);
}
const bounded = {
  title: "有界磁场中的带电粒子",
  subtitle: "边界内受洛伦兹力，离开后沿直线运动",
  theory:
    "理想匀强磁场只存在于可调圆形或矩形边界内，边界外磁场为零。默认 B 指向画面外（+z，符号 ⊙），切换反向后指向画面内（×）。SI 量：B(T)、q(C)、m(kg)、v(m/s)；画布采用 110 px/m 的显示缩放。场内 ω=qB/m，半径 r=mv/(|q|B)；场外保持离开时的速度。磁场方向切换会反转偏转方向，入射角相对水平向右定义。数值采用小步长精确速度旋转，边界交越按子步判定。",
  controls: baseControls,
  create: () => ({}),
  reset: resetBounded,
  step(s, p, dt) {
    if (!s.active) return;
    const h = Math.min(
      0.04,
      Math.max(0, finite(dt)) /
        Math.max(1, Math.ceil(Math.max(0, finite(dt)) / 0.008)),
    );
    const n = Math.ceil(Math.max(0, finite(dt)) / 0.008);
    if (!n) return;
    for (let k = 0; k < n; k++) {
      const midx = s.x + s.vx * h * 0.5,
        midy = s.y + s.vy * h * 0.5;
      if (insideBounded(midx, midy, p)) {
        const omega =
          (params(p, "q", 1) / Math.max(0.01, params(p, "m", 1))) *
          params(p, "B", 1) *
          (p.reverse ? -1 : 1);
        const a = omega * h,
          c = Math.cos(a),
          sn = Math.sin(a),
          vx = s.vx;
        s.vx = vx * c - s.vy * sn;
        s.vy = vx * sn + s.vy * c;
      }
      s.x += s.vx * h;
      s.y += s.vy * h;
      s.t += h;
      if (k % 2 === 0) pushTrail(s, s.x, s.y);
      if (s.x < -30 || s.x > 1030 || s.y < -30 || s.y > 680) {
        s.active = false;
        return;
      }
    }
  },
  draw(ctx, w, h, s, p) {
    background(
      ctx,
      w,
      h,
      "有界磁场",
      "青色区域内有磁场；粒子离场后保持切向速度",
    );
    const cx = params(p, "fieldX", 650),
      cy = params(p, "fieldY", 325),
      r = params(p, "fieldW", 170);
    ctx.fillStyle = C.field;
    ctx.strokeStyle = C.fieldLine;
    ctx.lineWidth = 2;
    if (p.shape === "rect") {
      const hh = params(p, "fieldH", 220);
      ctx.fillRect(cx - r, cy - hh / 2, r * 2, hh);
      ctx.strokeRect(cx - r, cy - hh / 2, r * 2, hh);
      fieldDots(
        ctx,
        cx - r,
        cy - hh / 2,
        cx + r,
        cy + hh / 2,
        p.reverse ? -1 : 1,
      );
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      fieldDots(ctx, cx - r, cy - r, cx + r, cy + r, p.reverse ? -1 : 1);
      ctx.restore();
    }
    drawTrail(ctx, s.trail);
    particle(ctx, s.x, s.y);
    ctx.fillStyle = C.text;
    ctx.font = "18px sans-serif";
    ctx.fillText(
      `B = ${params(p, "B", 1).toFixed(1)} T   q/m = ${(params(p, "q", 1) / params(p, "m", 1)).toFixed(2)} C/kg`,
      24,
      h - 24,
    );
  },
  stats(s, p) {
    return [
      { label: "状态", value: s.active ? "运动中" : "已离开画布" },
      {
        label: "速度",
        value: `${(Math.hypot(s.vx, s.vy) / SCALE).toFixed(2)} m/s`,
      },
      {
        label: "回旋半径",
        value: `${((params(p, "m", 1) * Math.hypot(s.vx, s.vy)) / SCALE / Math.max(0.01, Math.abs(params(p, "q", 1) * params(p, "B", 1)))).toFixed(2)} m`,
      },
      { label: "时间", value: `${s.t.toFixed(2)} s` },
    ];
  },
  action(key, s, p) {
    if (key === "clear") s.trail = [];
    else if (key === "reset") resetBounded(s, p);
  },
};
const driftControls = [
  {
    key: "E",
    label: "电场强度 E",
    type: "range",
    value: 0.8,
    min: 0.2,
    max: 1.6,
    step: 0.1,
    unit: "V/m",
  },
  {
    key: "B",
    label: "磁感应强度 B",
    type: "range",
    value: 0.8,
    min: 0.2,
    max: 1.6,
    step: 0.1,
    unit: "T",
  },
  {
    key: "v0",
    label: "水平初速度",
    type: "range",
    value: 0.35,
    min: 0,
    max: 2.5,
    step: 0.05,
    unit: "m/s",
  },
  {
    key: "q",
    label: "电荷量 q",
    type: "range",
    value: 1,
    min: 0.2,
    max: 2,
    step: 0.1,
    unit: "C",
  },
  {
    key: "m",
    label: "质量 m",
    type: "range",
    value: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
    unit: "kg",
  },
];
function driftPosition(s, p) {
  const B = Math.max(0.01, params(p, "B", 0.8)),
    E = params(p, "E", 0.8),
    q = params(p, "q", 1),
    m = Math.max(0.01, params(p, "m", 1));
  const omega = (q * B) / m,
    u = E / B,
    wx = params(p, "v0", 0.35) - u,
    t = s.t;
  const x = 190 + (u * t + (wx * Math.sin(omega * t)) / omega) * 110;
  const y = 325 - ((wx * (Math.cos(omega * t) - 1)) / omega) * 110;
  return [x, y];
}
const drift = {
  title: "交叉电磁场与 E×B 漂移",
  subtitle: "电场沿 +y，磁场沿 +z，漂移方向为 +x",
  theory:
    "均匀电场 E 沿画布物理坐标 +y（屏幕向上），均匀磁场 B 沿 +z（画面外），正电荷的导引中心以 v_d=E×B/B²=(E/B) x̂ 漂移。SI 制，画布显示缩放 110 px/m。令 ω=qB/m、u=E/B、v⊥0=v0−u，则物理坐标 x=u t+v⊥0 sin(ωt)/ω，y=−v⊥0[1−cos(ωt)]/ω（相对初始点；屏幕 y 坐标向下，显示时反号）；这给出漂移叠加回旋的摆线族。若初速度 v0=E/B，回旋分量为零，轨迹严格成为沿 +x 的直线。理想模型忽略边缘效应与辐射。",
  controls: driftControls,
  create: () => ({ t: 0, trail: [] }),
  reset(s, p) {
    s.t = 0;
    s.trail = [];
    const [x, y] = driftPosition(s, p);
    pushTrail(s, x, y);
  },
  step(s, p, dt) {
    s.t = Math.min(1e4, s.t + clamp(finite(dt), 0, 10));
    const [x, y] = driftPosition(s, p);
    pushTrail(s, x, y);
  },
  draw(ctx, w, h, s, p) {
    background(
      ctx,
      w,
      h,
      "交叉电磁场",
      "E 向上 ↑   B 指向画面外 ⊙   E×B 漂移向右 →",
    );
    ctx.fillStyle = C.field;
    ctx.fillRect(62, 100, 876, 470);
    ctx.strokeStyle = C.fieldLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(62, 100, 876, 470);
    fieldDots(ctx, 62, 100, 938, 570, 1);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(105, 250);
    ctx.lineTo(105, 175);
    ctx.lineTo(97, 190);
    ctx.moveTo(105, 175);
    ctx.lineTo(113, 190);
    ctx.stroke();
    ctx.fillStyle = C.orange;
    ctx.font = "18px sans-serif";
    ctx.fillText("E", 116, 180);
    const [x, y] = driftPosition(s, p);
    drawTrail(ctx, s.trail);
    particle(ctx, x, y);
    ctx.fillStyle = C.text;
    ctx.font = "18px sans-serif";
    ctx.fillText(`漂移方向  +x  →`, 24, h - 26);
  },
  stats(s, p) {
    const E = params(p, "E", 0.8),
      B = Math.max(0.01, params(p, "B", 0.8)),
      u = E / B,
      omega = (params(p, "q", 1) * B) / Math.max(0.01, params(p, "m", 1));
    const [x, y] = driftPosition(s, p);
    return [
      { label: "漂移速度 E/B", value: `${u.toFixed(2)} m/s →` },
      { label: "回旋角频率", value: `${omega.toFixed(2)} rad/s` },
      {
        label: "初始回旋分量",
        value: `${(params(p, "v0", 0.35) - u).toFixed(2)} m/s`,
      },
      {
        label: "位置",
        value: `(${((x - 190) / 110).toFixed(2)}, ${((325 - y) / 110).toFixed(2)}) m`,
      },
    ];
  },
  action(key, s, p) {
    if (key === "clear") s.trail = [];
    else if (key === "reset") drift.reset(s, p);
  },
};
const cyclotronControls = [
  {
    key: "voltage",
    label: "加速电压",
    type: "range",
    value: 0.9,
    min: 0.1,
    max: 2,
    step: 0.1,
    unit: "V",
  },
  {
    key: "B",
    label: "磁感应强度 B",
    type: "range",
    value: 1.4,
    min: 0.5,
    max: 2.5,
    step: 0.1,
    unit: "T",
  },
  {
    key: "q",
    label: "电荷量 q",
    type: "range",
    value: 1,
    min: 0.2,
    max: 2,
    step: 0.1,
    unit: "C",
  },
  {
    key: "m",
    label: "质量 m",
    type: "range",
    value: 1,
    min: 0.5,
    max: 2,
    step: 0.1,
    unit: "kg",
  },
];
function resetCyclotron(s) {
  s.t = 0;
  s.trail = [];
  s.angle = 0;
  s.y0 = 0;
  s.side = 1;
  s.speed = 2.4;
  s.x = 500;
  s.y = 325;
  s.gains = 0;
  s.extracted = false;
  s.active = true;
  s.vx = 0;
  s.vy = 0;
  pushTrail(s, s.x, s.y);
}
function updateCyclotronPosition(s, p) {
  const q = params(p, "q", 1),
    m = Math.max(0.01, params(p, "m", 1)),
    B = Math.max(0.01, params(p, "B", 1.4));
  const omega = Math.abs((q * B) / m),
    r = s.speed / omega,
    a = s.angle;
  s.x = 500 + s.side * r * 70 * Math.sin(a);
  s.y = 325 + s.y0 + (s.side > 0 ? 1 : -1) * r * 70 * (1 - Math.cos(a));
  return { r, omega };
}
const cyclotron = {
  title: "回旋加速器",
  subtitle: "两个 D 形盒内回旋，粒子每次穿越缝隙时获得能量",
  theory:
    "两只 D 形盒以中央竖直窄缝相隔，磁场垂直盒面，粒子在盒内做半圆运动；每次穿越缝隙，交变电场与运动方向同步而加速。非相对论 SI 模型：ω=|q|B/m，T=2πm/(|q|B)，r=mv/(|q|B)，每次跨隙能量增加 ΔK=|q|V。画布按 70 px/m 显示，D 盒外缘半径为 280 px。轨道到达 D 盒圆形外缘即沿当时切线直线出射并停止加速，出画布后停止运动。默认初速 2.4 m/s，忽略相对论效应及边缘场。",
  controls: cyclotronControls,
  create: () => ({}),
  reset(s) {
    resetCyclotron(s);
  },
  step(s, p, dt) {
    if (!s.active) return;
    let remain = clamp(finite(dt), 0, 0.1),
      loops = 0;
    if (s.extracted) {
      s.x += s.vx * remain;
      s.y += s.vy * remain;
      s.t += remain;
      pushTrail(s, s.x, s.y);
      if (s.x < -20 || s.x > 1020 || s.y < -20 || s.y > 670) s.active = false;
      return;
    }
    while (remain > 1e-9 && loops++ < 300) {
      const { omega } = updateCyclotronPosition(s, p);
      const toEnd = (Math.PI - s.angle) / omega;
      const d = Math.min(remain, toEnd, 0.02 / omega);
      s.angle += omega * d;
      s.t += d;
      remain -= d;
      updateCyclotronPosition(s, p);
      pushTrail(s, s.x, s.y);
      if ((s.x - 500) ** 2 + (s.y - 325) ** 2 >= 280 ** 2) {
        s.extracted = true;
        s.vx = s.side * s.speed * 70 * Math.cos(s.angle);
        s.vy = s.side * s.speed * 70 * Math.sin(s.angle);
        if (remain > 0) {
          s.x += s.vx * remain;
          s.y += s.vy * remain;
          s.t += remain;
          pushTrail(s, s.x, s.y);
        }
        if (s.x < -20 || s.x > 1020 || s.y < -20 || s.y > 670) s.active = false;
        return;
      }
      if (s.angle >= Math.PI - 1e-8) {
        s.angle = 0;
        s.y0 = s.y - 325;
        s.side *= -1;
        s.speed = Math.sqrt(
          s.speed * s.speed +
            (2 * Math.abs(params(p, "q", 1)) * params(p, "voltage", 0.9)) /
              Math.max(0.01, params(p, "m", 1)),
        );
        s.gains++;
        if (s.gains > 1000) s.gains = 1000;
      }
    }
  },
  draw(ctx, w, h, s, p) {
    background(
      ctx,
      w,
      h,
      "回旋加速器",
      "半圆轨道逐次外扩；穿过中央缝隙时速度增加",
    );
    const cx = 500,
      cy = 325,
      R = 280;
    ctx.fillStyle = "#18354d";
    ctx.strokeStyle = C.fieldLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, R, Math.PI / 2, Math.PI * 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    fieldDots(ctx, cx - R, cy - R, cx + R, cy + R, 1);
    ctx.fillStyle = C.bg;
    ctx.fillRect(cx - 5, cy - R, 10, R * 2);
    ctx.strokeStyle = C.orange;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.text;
    ctx.font = "18px sans-serif";
    ctx.fillText("D₁", cx - 120, cy - 145);
    ctx.fillText("D₂", cx + 90, cy - 145);
    ctx.fillText("加速缝隙", cx + 12, cy - 16);
    const ex = s.side > 0 ? 1 : -1,
      ey = cy - 48;
    ctx.strokeStyle = C.orange;
    ctx.fillStyle = C.orange;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - ex * 20, ey);
    ctx.lineTo(cx + ex * 20, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + ex * 20, ey);
    ctx.lineTo(cx + ex * 10, ey - 7);
    ctx.lineTo(cx + ex * 10, ey + 7);
    ctx.closePath();
    ctx.fill();
    ctx.font = "18px sans-serif";
    ctx.fillText(ex > 0 ? "+" : "−", cx - 42, ey + 6);
    ctx.fillText(ex > 0 ? "−" : "+", cx + 27, ey + 6);
    drawTrail(ctx, s.trail);
    particle(ctx, s.x, s.y, 8);
    if (s.extracted) {
      ctx.fillStyle = C.orange;
      ctx.font = "18px sans-serif";
      ctx.fillText(
        s.active ? "到达外缘：沿切线直线出射" : "已出射并离开画布",
        24,
        h - 24,
      );
    }
  },
  stats(s, p) {
    const q = Math.abs(params(p, "q", 1)),
      m = Math.max(0.01, params(p, "m", 1)),
      B = Math.max(0.01, params(p, "B", 1.4)),
      omega = (q * B) / m,
      K = 0.5 * m * s.speed * s.speed;
    return [
      {
        label: "状态",
        value: !s.active
          ? "已离开画布"
          : s.extracted
            ? "外缘切线出射"
            : "加速中",
      },
      { label: "动能", value: `${K.toFixed(2)} J` },
      { label: "速度", value: `${s.speed.toFixed(2)} m/s` },
      { label: "当前半径", value: `${(s.speed / omega).toFixed(2)} m` },
      { label: "回旋周期", value: `${((2 * Math.PI) / omega).toFixed(2)} s` },
      { label: "已跨隙次数", value: String(s.gains) },
    ];
  },
  action(key, s, p) {
    if (key === "clear") s.trail = [];
    else if (key === "reset") resetCyclotron(s);
  },
};
Object.assign(globalThis.PhysicsLab.models, { bounded, drift, cyclotron });
})();

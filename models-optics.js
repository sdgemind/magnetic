const C = {
  cyan: "#4cddcc",
  orange: "#ffba69",
  text: "#dce8f7",
  muted: "#8ca3bd",
};
const range = (key, label, value, min, max, step = 1, unit = "") => ({
  key,
  label,
  type: "range",
  value,
  min,
  max,
  step,
  unit,
});
function base(c) {
  c.fillStyle = "#101e32";
  c.fillRect(0, 0, 1000, 650);
  c.strokeStyle = "#1b2e44";
  c.lineWidth = 1;
  for (let x = 0; x <= 1000; x += 50) {
    c.beginPath();
    c.moveTo(x, 0);
    c.lineTo(x, 650);
    c.stroke();
  }
  for (let y = 0; y <= 650; y += 50) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(1000, y);
    c.stroke();
  }
}
function line(c, points, color, width = 2) {
  if (!points.length) return;
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  points.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
  c.stroke();
}
function dot(c, x, y, color = C.cyan, r = 6) {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
function arrow(c, x, y, a, color = C.orange, len = 50) {
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + len * Math.cos(a), y + len * Math.sin(a));
  c.stroke();
  c.save();
  c.translate(x + len * Math.cos(a), y + len * Math.sin(a));
  c.rotate(a);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-12, -5);
  c.lineTo(-12, 5);
  c.fill();
  c.restore();
}
function label(c, t, x, y, color = C.muted) {
  c.fillStyle = color;
  c.font = "19px system-ui";
  c.fillText(t, x, y);
}
function dynParams(s, p) {
  let e = { ...p };
  if (p.auto) {
    const u = (Math.sin(s.demoTime * 0.5) + 1) / 2;
    if (p.mode === "translate") e.entry = 170 + u * 290;
    else if (p.mode === "rotate") e.angle = -55 + u * 110;
    else e.radius = 65 + u * 200;
  }
  return e;
}
function initDynamic(s, p) {
  const e = dynParams(s, p),
    a = (e.angle * Math.PI) / 180;
  Object.assign(s, {
    x: 200,
    y: e.entry,
    vx: Math.cos(a) * 160,
    vy: Math.sin(a) * 160,
    cx: 200 - e.radius * Math.sin(a),
    cy: e.entry + e.radius * Math.cos(a),
    travel: 0,
    trail: [],
    finished: false,
    hit: false,
    inside: true,
    current: e,
  });
}
const dynamic = {
  title: "动态圆与临界轨迹",
  subtitle: "平移、旋转与放缩，从几何变化观察临界条件。",
  theory:
    "匀强磁场中 r = mv / |qB|。平移圆改变入射点，旋转圆改变入射方向，放缩圆改变轨迹半径。青色虚线为完整轨迹圆，橙色为带间隙挡板；粒子触碰挡板后停止，穿过间隙则继续。磁场位于入射边界右侧，出界后做匀速直线运动。采用正电荷、垂直纸面向外的磁场；自动演示周期改变所选模型对应的参数。",
  controls: [
    {
      key: "mode",
      label: "动态圆模型",
      type: "select",
      value: "translate",
      options: [
        { value: "translate", label: "平移圆 · 改变入射点" },
        { value: "rotate", label: "旋转圆 · 改变方向" },
        { value: "scale", label: "放缩圆 · 改变半径" },
      ],
    },
    range("entry", "入射点高度", 260, 100, 520, 1),
    range("angle", "速度方向角", 0, -70, 70, 1, "°"),
    range("radius", "轨迹半径", 150, 50, 300, 1),
    range("wall", "挡板水平位置", 510, 280, 850, 1),
    range("tilt", "挡板角度", 0, -60, 60, 1, "°"),
    range("gap", "挡板间隙", 130, 0, 400, 5),
    { key: "auto", label: "自动演示所选模型", type: "toggle", value: false },
  ],
  create: () => ({ demoTime: 0 }),
  reset(s, p) {
    s.demoTime = 0;
    initDynamic(s, p);
  },
  step(s, p, dt) {
    s.demoTime += dt;
    if (p.auto) {
      initDynamic(s, p);
      const e = s.current;
      for (let i = 0; i < 200; i++) advanceDynamic(s, e, 0.018);
      return;
    }
    advanceDynamic(s, s.current, dt);
  },
  draw(c, w, h, s, p) {
    base(c);
    const e = s.current;
    c.fillStyle = "#4cddcc08";
    c.fillRect(200, 0, 800, 650);
    c.strokeStyle = "#4cddcc44";
    c.setLineDash([7, 8]);
    c.beginPath();
    c.moveTo(200, 20);
    c.lineTo(200, 610);
    c.stroke();
    c.beginPath();
    c.arc(s.cx, s.cy, e.radius, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash([]);
    for (let x = 270; x < 1000; x += 100)
      for (let y = 70; y < 600; y += 100) {
        dot(c, x, y, "#4cddcc55", 2);
        c.strokeStyle = "#4cddcc33";
        c.beginPath();
        c.arc(x, y, 9, 0, Math.PI * 2);
        c.stroke();
      }
    const a = (p.tilt * Math.PI) / 180,
      ux = Math.sin(a),
      uy = Math.cos(a);
    c.lineWidth = 7;
    c.strokeStyle = C.orange;
    for (const sign of [-1, 1]) {
      c.beginPath();
      c.moveTo(p.wall + (sign * ux * p.gap) / 2, 325 + (sign * uy * p.gap) / 2);
      c.lineTo(p.wall + sign * ux * 900, 325 + sign * uy * 900);
      c.stroke();
    }
    line(c, s.trail, C.cyan, 3);
    dot(c, 200, e.entry, C.orange, 6);
    dot(c, s.cx, s.cy, "#9bb5ce", 4);
    dot(c, s.x, s.y);
    arrow(c, 200, e.entry, (e.angle * Math.PI) / 180, C.orange, 90);
    label(c, "入射边界", 80, 80);
    label(c, "B ⊙", 850, 70, C.cyan);
    label(c, "挡板 / 间隙", Math.min(p.wall + 25, 790), 590, C.orange);
    label(c, p.auto ? "自动扫描中" : "虚线：完整轨迹圆", 35, 600);
  },
  stats(s) {
    return [
      { label: "当前轨迹半径", value: s.current.radius.toFixed(1) },
      { label: "入射方向", value: s.current.angle.toFixed(1) + "°" },
      {
        label: "运动状态",
        value: s.finished
          ? s.hit
            ? "触碰挡板"
            : "离开画面"
          : s.inside
            ? "磁场内偏转"
            : "场外直行",
      },
    ];
  },
  action(key, s) {
    if (key === "clear") s.trail = [];
  },
};
function advanceDynamic(s, p, dt) {
  if (s.finished) return;
  const n = Math.max(1, Math.ceil(dt / 0.008)),
    d = dt / n;
  for (let i = 0; i < n; i++) {
    const ox = s.x,
      oy = s.y;
    if (s.inside) {
      const a = (160 / p.radius) * d,
        cs = Math.cos(a),
        sn = Math.sin(a),
        vx = s.vx;
      s.vx = vx * cs - s.vy * sn;
      s.vy = vx * sn + s.vy * cs;
      s.x = s.cx + (ox - s.cx) * cs - (oy - s.cy) * sn;
      s.y = s.cy + (ox - s.cx) * sn + (oy - s.cy) * cs;
      if (s.x < 200 - 0.1) s.inside = false;
    } else {
      s.x += s.vx * d;
      s.y += s.vy * d;
    }
    const a = (p.tilt * Math.PI) / 180,
      nx = Math.cos(a),
      ny = -Math.sin(a),
      d0 = (ox - p.wall) * nx + (oy - 325) * ny,
      d1 = (s.x - p.wall) * nx + (s.y - 325) * ny;
    if (d0 * d1 <= 0 && d0 !== d1) {
      const f = d0 / (d0 - d1),
        ix = ox + f * (s.x - ox),
        iy = oy + f * (s.y - oy),
        along = (ix - p.wall) * Math.sin(a) + (iy - 325) * Math.cos(a);
      if (Math.abs(along) >= p.gap / 2) {
        s.x = ix;
        s.y = iy;
        s.finished = true;
        s.hit = true;
      }
    }
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 5000) s.trail.shift();
    if (s.x < -50 || s.x > 1050 || s.y < -80 || s.y > 730) s.finished = true;
    if (s.finished) break;
  }
}
const focusing = {
  title: "磁发散与磁聚焦",
  subtitle: "两片有界磁场，一束粒子的发散与再汇聚。",
  theory:
    "粒子在圆形磁场内按 r = mv / |qB| 转弯，场外沿切线直行。左侧磁场向内，右侧磁场向外；每条轨迹独立计算，不预设焦点。点源位于第一片场的上边界。匹配按钮统一场区半径与轨迹半径，并对齐两个场区；第一片场将点源的发散束变为平行束，第二片使束流重新汇聚。改变位置、角度或半径可以破坏匹配条件；场区重叠时按左场优先的分区近似处理。",
  controls: [
    range("fieldRadius", "发散磁场半径", 110, 50, 180, 1),
    range("leftX", "发散场水平位置", 210, 150, 300, 1),
    range("rightX", "聚焦场水平位置", 630, 530, 800, 1),
    range("rightY", "聚焦场垂直位置", 325, 170, 470, 1),
    range("focusRadius", "聚焦磁场半径", 110, 50, 180, 1),
    range("angle", "发射方向", 60, 10, 110, 1, "°"),
    range("spread", "发散半角", 18, 0, 40, 1, "°"),
    range("count", "粒子数量", 9, 3, 25, 2),
    range("orbit", "轨迹半径", 110, 50, 250, 1),
    { key: "match", label: "一键匹配磁场与轨迹半径", type: "action" },
    { key: "guides", label: "显示辅助线", type: "toggle", value: true },
    { key: "emit", label: "发射一束粒子", type: "action" },
  ],
  create: () => ({ beams: [] }),
  reset(s, p) {
    s.beams = [];
    s.elapsed = 0;
    emit(s, p);
  },
  step(s, p, dt) {
    s.elapsed += dt;
    const n = Math.max(1, Math.ceil(dt / 0.004)),
      d = dt / n;
    for (let k = 0; k < n; k++)
      for (const b of s.beams) {
        if (b.done) continue;
        let sign = 0;
        if (Math.hypot(b.x - p.leftX, b.y - 325) < p.fieldRadius) sign = -1;
        else if (Math.hypot(b.x - p.rightX, b.y - p.rightY) < p.focusRadius)
          sign = 1;
        const omega = (sign * 170) / p.orbit,
          ang = omega * d,
          cs = Math.cos(ang),
          sn = Math.sin(ang),
          vx = b.vx,
          vy = b.vy;
        if (sign) {
          b.x += (vx * sn + vy * (cs - 1)) / omega;
          b.y += (vx * (1 - cs) + vy * sn) / omega;
          b.vx = vx * cs - vy * sn;
          b.vy = vx * sn + vy * cs;
        } else {
          b.x += vx * d;
          b.y += vy * d;
        }
        b.tick++;
        if (b.tick % 3 === 0) b.trail.push({ x: b.x, y: b.y });
        if (b.trail.length > 2500) b.trail.shift();
        if (b.x < 0 || b.x > 1020 || b.y < 0 || b.y > 650 || b.tick > 9000)
          b.done = true;
      }
  },
  draw(c, w, h, s, p) {
    base(c);
    for (const [x, y, r, sgn] of [
      [p.leftX, 325, p.fieldRadius, "⊗"],
      [p.rightX, p.rightY, p.focusRadius, "⊙"],
    ]) {
      c.fillStyle = sgn === "⊗" ? "#ffba6910" : "#4cddcc10";
      c.strokeStyle = sgn === "⊗" ? "#ffba6970" : "#4cddcc70";
      c.lineWidth = 2;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      label(c, "B " + sgn, x - 20, y - r + 32, sgn === "⊗" ? C.orange : C.cyan);
    }
    if (p.guides) {
      c.setLineDash([6, 8]);
      line(
        c,
        [
          { x: 40, y: 325 },
          { x: 960, y: 325 },
        ],
        "#5c7188",
        1,
      );
      line(
        c,
        [
          { x: p.rightX, y: 60 },
          { x: p.rightX, y: 590 },
        ],
        "#5c7188",
        1,
      );
      c.setLineDash([]);
    }
    s.beams.forEach((b, i) => {
      const color = `hsl(${158 + (i % 25) * 2.5} 75% 67%)`;
      line(c, b.trail, color, 2);
      if (!b.done) dot(c, b.x, b.y, color, 4);
    });
    dot(c, p.leftX, 325 - p.fieldRadius, C.orange, 7);
    label(c, "点源 / 发散场", p.leftX - 85, 560, C.orange);
    label(c, "聚焦场", p.rightX - 35, 560, C.cyan);
    label(c, "场外：沿切线直行", 35, 70);
  },
  stats(s, p) {
    return [
      { label: "轨迹 / 场半径", value: (p.orbit / p.fieldRadius).toFixed(2) },
      { label: "已发射粒子", value: String(s.beams.length) },
      { label: "运动中", value: String(s.beams.filter((b) => !b.done).length) },
    ];
  },
  action(key, s, p) {
    if (key === "emit") emit(s, p);
    if (key === "clear") s.beams = [];
    if (key === "match") {
      p.orbit = p.fieldRadius;
      p.focusRadius = p.fieldRadius;
      p.rightY = 325;
      this.reset(s, p);
    }
  },
};
function emit(s, p) {
  if (s.beams.length > 150) s.beams.splice(0, p.count);
  for (let i = 0; i < p.count; i++) {
    const a =
      ((p.angle + ((i / (p.count - 1)) * 2 - 1) * p.spread) * Math.PI) / 180;
    const y = 325 - p.fieldRadius;
    s.beams.push({
      x: p.leftX,
      y,
      vx: 170 * Math.cos(a),
      vy: 170 * Math.sin(a),
      trail: [{ x: p.leftX, y }],
      tick: 0,
      done: false,
    });
  }
}
export const models = { dynamic, focusing };

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) =>
  Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
const colors = {
  bg: "#101e32",
  field: "#4cddcc",
  orange: "#ffba69",
  text: "#dce8f7",
  muted: "#8fa5c2",
  wire: "#d98e55",
};

function project(v, camera, w, h) {
  const cy = Math.cos(camera.yaw),
    sy = Math.sin(camera.yaw);
  const x = v[0] * cy - v[2] * sy;
  const z = v[0] * sy + v[2] * cy;
  const cp = Math.cos(camera.pitch),
    sp = Math.sin(camera.pitch);
  const y = v[1] * cp - z * sp;
  const depth = v[1] * sp + z * cp;
  const scale = (Math.min(w, h) * 0.31) / (1 + depth * 0.08);
  return [w * 0.5 + x * scale, h * 0.51 - y * scale];
}
function line3(ctx, camera, w, h, points, color, width = 2, dash = []) {
  if (!points.length) return;
  ctx.beginPath();
  const p = project(points[0], camera, w, h);
  ctx.moveTo(...p);
  for (let i = 1; i < points.length; i++)
    ctx.lineTo(...project(points[i], camera, w, h));
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.stroke();
  ctx.setLineDash([]);
}
function arrow3(ctx, camera, w, h, a, b, color = colors.field, size = 9) {
  const p = project(a, camera, w, h),
    q = project(b, camera, w, h);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(...p);
  ctx.lineTo(...q);
  ctx.stroke();
  const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
  ctx.beginPath();
  ctx.moveTo(...q);
  ctx.lineTo(
    q[0] - size * Math.cos(ang - 0.48),
    q[1] - size * Math.sin(ang - 0.48),
  );
  ctx.lineTo(
    q[0] - size * Math.cos(ang + 0.48),
    q[1] - size * Math.sin(ang + 0.48),
  );
  ctx.closePath();
  ctx.fill();
}
function dot3(ctx, camera, w, h, v, color = colors.orange, r = 5) {
  const p = project(v, camera, w, h);
  ctx.beginPath();
  ctx.arc(p[0], p[1], r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}
function text3(
  ctx,
  camera,
  w,
  h,
  v,
  text,
  color = colors.text,
  dx = 8,
  dy = -8,
) {
  const p = project(v, camera, w, h);
  ctx.fillStyle = color;
  ctx.font = "20px system-ui, sans-serif";
  ctx.fillText(text, p[0] + dx, p[1] + dy);
}
function background(ctx, w, h, title, subtitle) {
  ctx.fillStyle = colors.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colors.text;
  ctx.font = "bold 24px system-ui, sans-serif";
  ctx.fillText(title, 28, 38);
  ctx.fillStyle = colors.muted;
  ctx.font = "18px system-ui, sans-serif";
  ctx.fillText(subtitle, 28, 66);
}
function viewCamera(view, fallbackYaw = -0.55) {
  if (view === "俯视") return { yaw: 0, pitch: 1.47 };
  if (view === "仰视" || view === "仰视图") return { yaw: 0, pitch: -1.25 };
  if (view === "侧视") return { yaw: 1.48, pitch: 0.15 };
  if (view === "纵截面") return { yaw: -0.2, pitch: 0.13 };
  if (view === "横截面") return { yaw: 0, pitch: 1.48 };
  if (view === "立体图") return { yaw: -0.62, pitch: 0.3 };
  return { yaw: fallbackYaw, pitch: 0.44 };
}
function init(s, p, baseYaw = -0.55) {
  s.yaw = viewCamera(p.view, baseYaw).yaw;
  s.pitch = viewCamera(p.view, baseYaw).pitch;
  s.time = 0;
  s.dragging = false;
  s.trail = [];
}
function frame(ctx, w, h) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 75, w, h - 75);
  ctx.clip();
}
function finish(ctx) {
  ctx.restore();
}
function wire(ctx, cam, w, h, axis, span, color = colors.wire) {
  const pts = [];
  for (let i = -20; i <= 20; i++) {
    const t = (span * i) / 20;
    pts.push(axis === "y" ? [0, t, 0] : [t, 0, 0]);
  }
  line3(ctx, cam, w, h, pts, color, 7);
  line3(ctx, cam, w, h, pts, "#ffd49b", 2);
}
function hand(ctx, cam, w, h, axis, sign) {
  // Four distinct fingers curl around the wire; the thumb and arrow lie on its current axis.
  const point = (axial, radius, angle) =>
    axis === "y"
      ? [radius * Math.cos(angle), axial, -radius * Math.sin(angle)]
      : [axial, radius * Math.cos(angle), radius * Math.sin(angle)];
  const fingers = [];
  for (let j = 0; j < 4; j++) {
    const axial = -0.3 + j * 0.2,
      curve = [];
    for (let k = 0; k <= 18; k++) {
      const t = k / 18;
      curve.push(
        point(
          axial + sign * 0.025 * Math.sin(Math.PI * t),
          0.46 + j * 0.055,
          sign * 1.85 * t,
        ),
      );
    }
    fingers.push(curve);
  }
  for (const curve of fingers) line3(ctx, cam, w, h, curve, colors.orange, 5);
  const palm = [
    point(-0.38, 0.73, sign * 1.8),
    point(-0.38, 0.73, sign * 2.15),
    point(0.38, 0.73, sign * 2.15),
    point(0.38, 0.73, sign * 1.8),
  ];
  line3(ctx, cam, w, h, palm, colors.orange, 7);
  const thumb = [
    point(-sign * 0.58, 0.78, sign * 2.25),
    point(-sign * 0.2, 0.83, sign * 2.38),
    point(sign * 0.2, 0.83, sign * 2.38),
    point(sign * 0.58, 0.78, sign * 2.25),
  ];
  line3(ctx, cam, w, h, thumb, colors.orange, 7);
  arrow3(
    ctx,
    cam,
    w,
    h,
    point(-sign * 0.58, 0.78, sign * 2.25),
    point(sign * 0.58, 0.78, sign * 2.25),
    colors.orange,
    10,
  );
  text3(
    ctx,
    cam,
    w,
    h,
    point(sign * 0.58, 0.78, sign * 2.25),
    "拇指：电流 I",
    colors.orange,
    8,
    0,
  );
  text3(
    ctx,
    cam,
    w,
    h,
    point(0, 0.65, sign * 1.1),
    "四指绕线：磁场 B",
    colors.orange,
    8,
    0,
  );
}
function drawWire(ctx, w, h, s, p) {
  background(
    ctx,
    w,
    h,
    "直导线周围的磁场",
    "右手螺旋定则：拇指指向常规电流 I，四指弯曲方向就是磁场 B",
  );
  frame(ctx, w, h);
  const axis = p.orientation === "横放" ? "x" : "y",
    sign = p.current === "向下" ? -1 : 1;
  const cam = { yaw: s.yaw, pitch: s.pitch },
    mag = clamp(p.currentStrength, 0.2, 3);
  wire(ctx, cam, w, h, axis, 1.42);
  const endA = axis === "y" ? [0, -1.45, 0] : [-1.45, 0, 0],
    endB = axis === "y" ? [0, 1.45, 0] : [1.45, 0, 0];
  arrow3(
    ctx,
    cam,
    w,
    h,
    sign > 0 ? endA : endB,
    sign > 0 ? endB : endA,
    colors.orange,
    12,
  );
  text3(
    ctx,
    cam,
    w,
    h,
    sign > 0 ? endB : endA,
    sign > 0 ? "I ↑" : "I ↓",
    colors.orange,
    12,
    0,
  );
  if (p.showField) {
    for (const r of [0.52, 0.9, 1.28]) {
      const direction = sign * (axis === "y" ? -1 : 1);
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const t = ((TAU * i) / 96) * direction;
        pts.push(
          axis === "y"
            ? [r * Math.cos(t), 0, r * Math.sin(t)]
            : [0, r * Math.cos(t), r * Math.sin(t)],
        );
      }
      line3(ctx, cam, w, h, pts, colors.field, 2.2);
      const t = direction * 1.15,
        nextT = t + direction * 0.18;
      const point =
        axis === "y"
          ? [r * Math.cos(t), 0, r * Math.sin(t)]
          : [0, r * Math.cos(t), r * Math.sin(t)];
      const next =
        axis === "y"
          ? [r * Math.cos(nextT), 0, r * Math.sin(nextT)]
          : [0, r * Math.cos(nextT), r * Math.sin(nextT)];
      arrow3(ctx, cam, w, h, point, next, colors.field, 9);
      if (r === 0.9) {
        const moving = s.time * direction * 0.85;
        dot3(
          ctx,
          cam,
          w,
          h,
          axis === "y"
            ? [r * Math.cos(moving), 0, r * Math.sin(moving)]
            : [0, r * Math.cos(moving), r * Math.sin(moving)],
          colors.orange,
          6,
        );
      }
    }
  }
  if (p.showHand) hand(ctx, cam, w, h, axis, sign);
  text3(
    ctx,
    cam,
    w,
    h,
    axis === "y" ? [1.4, 0, 0] : [0, 1.4, 0],
    `I=${mag.toFixed(1)} A`,
    colors.text,
    8,
    5,
  );
  finish(ctx);
}

function drawSolenoid(ctx, w, h, s, p) {
  background(
    ctx,
    w,
    h,
    "通电螺线管与安培定则",
    "从 +轴端看电流逆时针，磁场指向 +轴端（N 极）；电流反向则磁场与磁极同时反转",
  );
  frame(ctx, w, h);
  const cam = { yaw: s.yaw, pitch: s.pitch },
    axis = p.orientation === "竖直" ? "y" : "x";
  const sign = p.currentDirection === "反向" ? -1 : 1,
    I = clamp(p.currentStrength, 0.2, 3);
  const axisPt = (u, v, z = 0) => (axis === "y" ? [v, u, z] : [u, v, z]);
  const section = p.view === "横截面",
    longitudinal = p.view === "纵截面";
  const length = 1.18,
    radius = section ? 0.78 : 0.62;
  if (!section) {
    const helix = [],
      n = 420,
      turns = 8;
    const winding = sign * (axis === "y" ? -1 : 1);
    for (let i = 0; i <= n; i++) {
      const u = sign * (-length + (2 * length * i) / n),
        theta = (winding * turns * TAU * i) / n;
      helix.push(
        axis === "x"
          ? [u, radius * Math.cos(theta), radius * Math.sin(theta)]
          : [radius * Math.cos(theta), u, radius * Math.sin(theta)],
      );
    }
    if (longitudinal) {
      let segment = [];
      for (const point of helix) {
        if (point[2] >= 0) segment.push(point);
        else if (segment.length > 1) {
          line3(ctx, cam, w, h, segment, colors.wire, 5);
          segment = [];
        }
      }
      if (segment.length > 1) line3(ctx, cam, w, h, segment, colors.wire, 5);
    } else line3(ctx, cam, w, h, helix, colors.wire, 5);
    for (let k = 1; k < 8; k += 2) {
      const i = Math.round((k * n) / turns);
      if (!longitudinal || helix[i][2] >= 0)
        arrow3(
          ctx,
          cam,
          w,
          h,
          helix[i],
          helix[Math.min(i + 7, n)],
          colors.orange,
          8,
        );
    }
  }
  if (section) {
    const ring = [];
    for (let i = 0; i <= 80; i++) {
      const t = (TAU * i) / 80;
      ring.push(
        axis === "x"
          ? [0, radius * Math.cos(t), radius * Math.sin(t)]
          : [radius * Math.cos(t), 0, radius * Math.sin(t)],
      );
    }
    line3(ctx, cam, w, h, ring, colors.wire, 6);
    for (let i = 0; i < 8; i++) {
      const t = (TAU * i) / 8,
        v =
          axis === "x"
            ? [0, radius * Math.cos(t), radius * Math.sin(t)]
            : [radius * Math.cos(t), 0, radius * Math.sin(t)];
      dot3(ctx, cam, w, h, v, colors.orange, 6);
      text3(ctx, cam, w, h, v, sign > 0 ? "×" : "•", colors.orange, -5, 7);
    }
    text3(ctx, cam, w, h, [0, 0, 0], "横截面：线圈电流", colors.text, -85, -30);
  }
  const N = axisPt(sign * length, 0),
    S = axisPt(-sign * length, 0);
  text3(ctx, cam, w, h, N, "N", colors.orange, 12, -4);
  text3(ctx, cam, w, h, S, "S", colors.orange, 12, -4);
  if (p.showField) {
    if (!section)
      for (const v of [-0.34, 0, 0.34])
        arrow3(
          ctx,
          cam,
          w,
          h,
          axisPt(-sign * length * 0.78, v),
          axisPt(sign * length * 0.78, v),
          colors.field,
          10,
        );
    for (const side of [-1, 1]) {
      const pts = [];
      for (let i = 0; i <= 70; i++) {
        const t = i / 70,
          axial = sign * length * (1 - 2 * t),
          radial = radius + 0.82 * Math.sin(Math.PI * t);
        pts.push(axisPt(axial, side * radial, 0));
      }
      line3(ctx, cam, w, h, pts, colors.field, 2.2);
      const a = pts[25],
        b = pts[28];
      arrow3(
        ctx,
        cam,
        w,
        h,
        sign > 0 ? a : b,
        sign > 0 ? b : a,
        colors.field,
        9,
      );
    }
    const u = sign * ((s.time % 2) - 1) * length * 0.7;
    dot3(ctx, cam, w, h, axisPt(u, 0), colors.orange, 6);
  }
  if (p.showHand) hand(ctx, cam, w, h, axis, sign);
  text3(
    ctx,
    cam,
    w,
    h,
    axisPt(0, radius + 0.35),
    `I=${I.toFixed(1)} A · 场强随安匝数增大`,
    colors.text,
    0,
    -8,
  );
  finish(ctx);
}

const righthand = {
  title: "直导线右手螺旋定则",
  subtitle: "旋转观察电流方向与环形磁场",
  theory:
    "约定常规电流方向：向上为 +竖直轴，向下为 −竖直轴；横放时沿画面右方为正。右手拇指指向电流，四指自然弯曲方向即磁场方向。直导线磁感线是以导线为轴的同心圆，电流反向则磁场方向反转。归一化场线半径仅用于示意，电流强度增大表示磁场增强。",
  controls: [
    {
      key: "current",
      label: "电流方向",
      type: "select",
      value: "向上",
      options: [
        { value: "向上", label: "向上" },
        { value: "向下", label: "向下" },
      ],
    },
    {
      key: "currentStrength",
      label: "电流强度",
      type: "range",
      value: 1.5,
      min: 0.2,
      max: 3,
      step: 0.1,
      unit: " A",
    },
    {
      key: "view",
      label: "观察视角",
      type: "select",
      value: "斜视",
      options: ["俯视", "仰视", "斜视", "侧视"].map((x) => ({
        value: x,
        label: x,
      })),
    },
    {
      key: "orientation",
      label: "导线方向",
      type: "select",
      value: "竖直",
      options: [
        { value: "竖直", label: "竖直" },
        { value: "横放", label: "横放" },
      ],
    },
    { key: "showHand", label: "右手模型", type: "toggle", value: true },
    { key: "showField", label: "磁感线", type: "toggle", value: true },
  ],
  create: () => ({
    yaw: -0.55,
    pitch: 0.44,
    time: 0,
    dragging: false,
    trail: [],
  }),
  reset: (s, p) => init(s, p),
  step: (s, p, dt) => {
    s.time += clamp(dt, 0, 0.05) * clamp(p.currentStrength, 0.2, 3);
  },
  draw: drawWire,
  stats: (s, p) => [
    { label: "电流方向", value: p.current },
    { label: "电流强度", value: `${Number(p.currentStrength).toFixed(1)} A` },
    {
      label: "磁场关系",
      value: p.current === "向上" ? "从上方看为逆时针" : "从上方看为顺时针",
    },
  ],
  pointer: (s, p, x, y, phase) => {
    if (phase === "down") {
      s.dragging = true;
      s.lastX = x;
      s.lastY = y;
    } else if (phase === "move" && s.dragging) {
      s.yaw += (x - s.lastX) * 0.009;
      s.pitch = clamp(s.pitch + (y - s.lastY) * 0.008, -1.48, 1.48);
      s.lastX = x;
      s.lastY = y;
    } else if (phase === "up" || phase === "cancel") s.dragging = false;
  },
};
const solenoid = {
  title: "通电螺线管",
  subtitle: "安培定则：四指沿线圈电流，拇指指向螺线管 N 极",
  theory:
    "约定：从螺线管 +轴端看，电流逆时针时磁场沿 +轴，+轴端为 N 极；顺时针时磁场沿 −轴，−轴端为 N 极。线圈内部磁场由 S 指向 N，外部磁感线由 N 返回 S，构成闭合曲线。横截面以 × 表示电流进入画面，以 • 表示电流出画面；电流方向反转时磁场和磁极同时反转。理想长螺线管内部场强正比于匝密度与电流。",
  controls: [
    {
      key: "currentDirection",
      label: "电流方向",
      type: "select",
      value: "正向",
      options: [
        { value: "正向", label: "从 +轴端看逆时针" },
        { value: "反向", label: "从 +轴端看顺时针" },
      ],
    },
    {
      key: "currentStrength",
      label: "电流强度",
      type: "range",
      value: 1.5,
      min: 0.2,
      max: 3,
      step: 0.1,
      unit: " A",
    },
    {
      key: "view",
      label: "显示视图",
      type: "select",
      value: "立体图",
      options: ["立体图", "纵截面", "横截面", "仰视"].map((x) => ({
        value: x,
        label: x,
      })),
    },
    {
      key: "orientation",
      label: "画面方向",
      type: "select",
      value: "水平",
      options: [
        { value: "水平", label: "水平" },
        { value: "竖直", label: "竖直" },
      ],
    },
    { key: "showHand", label: "右手模型", type: "toggle", value: true },
    { key: "showField", label: "磁感线", type: "toggle", value: true },
  ],
  create: () => ({
    yaw: -0.62,
    pitch: 0.3,
    time: 0,
    dragging: false,
    trail: [],
  }),
  reset: (s, p) => init(s, p, -0.62),
  step: (s, p, dt) => {
    s.time += clamp(dt, 0, 0.05) * clamp(p.currentStrength, 0.2, 3);
  },
  draw: drawSolenoid,
  stats: (s, p) => [
    {
      label: "电流方向",
      value: p.currentDirection === "正向" ? "+轴端逆时针" : "+轴端顺时针",
    },
    {
      label: "磁极",
      value:
        p.currentDirection === "正向"
          ? "+轴端 N / −轴端 S"
          : "−轴端 N / +轴端 S",
    },
    { label: "电流强度", value: `${Number(p.currentStrength).toFixed(1)} A` },
    { label: "场强关系", value: "B ∝ 匝密度 × I" },
  ],
  pointer: (s, p, x, y, phase) => {
    if (phase === "down") {
      s.dragging = true;
      s.lastX = x;
      s.lastY = y;
    } else if (phase === "move" && s.dragging) {
      s.yaw += (x - s.lastX) * 0.009;
      s.pitch = clamp(s.pitch + (y - s.lastY) * 0.008, -1.48, 1.48);
      s.lastX = x;
      s.lastY = y;
    } else if (phase === "up" || phase === "cancel") s.dragging = false;
  },
};
export const models = { righthand, solenoid };

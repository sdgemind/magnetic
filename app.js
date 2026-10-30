import { models as optical } from "./models-optics.js";
import { models as fields } from "./models-fields.js";
import { models as space } from "./models-space.js";
import { getHandles } from "./geometry-handles.js";
const models = { ...optical, ...fields, ...space };
const order = [
  "dynamic",
  "focusing",
  "bounded",
  "drift",
  "cyclotron",
  "righthand",
  "solenoid",
];
const names = [
  "动态圆",
  "磁发散与聚焦",
  "有界磁场",
  "复合场配速法",
  "回旋加速器",
  "右手螺旋定则",
  "通电螺线管",
];
const $ = (s) => document.querySelector(s),
  canvas = $("#scene"),
  ctx = canvas.getContext("2d");
const sessions = new Map();
let active,
  model,
  state,
  params,
  running = false,
  last = 0,
  statClock = 0;
const mobileLayout = matchMedia(
  "(max-width: 760px), (max-width: 960px) and (max-height: 500px)",
);
const camera = { zoom: 1, panX: 0, panY: 0, panorama: false, bounds: null };
let selectedParameter = "";
let playbackSpeed = 1;
function defaults(m) {
  return Object.fromEntries(
    m.controls.filter((c) => c.type !== "action").map((c) => [c.key, c.value]),
  );
}
function session(key) {
  if (!sessions.has(key)) {
    const m = models[key],
      p = defaults(m),
      s = m.create();
    m.reset(s, p);
    sessions.set(key, { p, s });
  }
  return sessions.get(key);
}
const nav = $("#model-nav");
order.forEach((key, i) => {
  const b = document.createElement("button");
  b.dataset.model = key;
  b.setAttribute("role", "tab");
  b.innerHTML = `<span>0${i + 1}</span>${names[i]}`;
  b.onclick = () => selectModel(key);
  nav.append(b);
});
nav.setAttribute("role", "tablist");
function selectModel(key) {
  active = key;
  model = models[key];
  ({ p: params, s: state } = session(key));
  running = false;
  pointers.clear();
  dragHandle = null;
  gesture = null;
  canvas.classList.remove("dragging");
  selectedParameter =
    model.controls.find((c) => c.type === "range")?.key ||
    model.controls[0].key;
  Object.assign(camera, {
    zoom: 1,
    panX: 0,
    panY: 0,
    panorama: false,
    bounds: null,
  });
  $(".settings").classList.remove("expanded");
  $("#all-parameters").setAttribute("aria-expanded", "false");
  $("#all-parameters").textContent = "更多";
  $("#model-title").textContent = model.title;
  $("#model-subtitle").textContent = model.subtitle;
  $("#experiment-number").textContent =
    `EXPERIMENT 0${order.indexOf(key) + 1} / 07`;
  $("#theory").textContent = model.theory;
  for (const b of nav.children) {
    b.setAttribute("aria-selected", String(b.dataset.model === key));
    b.tabIndex = b.dataset.model === key ? 0 : -1;
  }
  canvas.classList.toggle("draggable", !!model.pointer);
  $("#canvas-hint").textContent = model.pointer
    ? "拖动场景调整视角或边界 · 参数变化后重新计算"
    : "参数变化后，轨迹将从初始状态重新计算";
  $("#clear").disabled = ["righthand", "solenoid"].includes(key);
  renderControls();
  updateStatus();
  render();
  updateStats();
  history.replaceState(null, "", "#" + key);
}
nav.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const i = order.indexOf(active),
    n =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? 6
          : (i + (e.key === "ArrowRight" ? 1 : 6)) % 7;
  selectModel(order[n]);
  nav.children[n].focus();
  nav.children[n].scrollIntoView({ block: "nearest", inline: "nearest" });
});
function updateStatus() {
  $("#play").textContent = running ? "暂停演示" : "开始演示";
  $("#play").setAttribute("aria-pressed", String(running));
  $("#status").textContent = running ? "演示中" : "已暂停";
  $("#status").classList.toggle("running", running);
  $("#step").disabled = running;
  $("#restart").hidden = active !== "bounded";
}
function change(key, value) {
  params[key] = value;
  if (!["showHand", "showField", "guides"].includes(key))
    model.reset(state, params);
  syncControls();
  render();
  updateStats();
}
const parameterNames = {
  entry: "入射点",
  angle: "方向",
  radius: "半径",
  wall: "挡板",
  tilt: "挡板角",
  gap: "间隙",
  fieldRadius: "发散半径",
  leftX: "发散位置",
  rightX: "聚焦位置",
  rightY: "聚焦高度",
  focusRadius: "聚焦半径",
  orbit: "轨迹半径",
  count: "粒子数",
  spread: "发散角",
  B: "磁场",
  E: "电场",
  v0: "初速度",
  currentStrength: "电流强度",
  current: "电流方向",
  view: "视角",
  orientation: "摆放",
  shape: "场形状",
  reverse: "磁场方向",
  showHand: "右手",
  showField: "磁感线",
  guides: "辅助线",
  auto: "自动演示",
  mode: "圆模型",
  fieldX: "场位置 X",
  fieldY: "场位置 Y",
  fieldW: "场宽度",
  fieldH: "场高度",
  voltage: "电压",
  speed: "速度",
  q: "电荷量",
  m: "质量",
  match: "匹配",
  emit: "发射",
};
function selectParameter(key, reveal = false) {
  selectedParameter = key;
  for (const el of $("#controls").children)
    el.classList.toggle("current-control", el.dataset.key === key);
  for (const tab of $("#parameter-tabs").children) {
    const selected = tab.dataset.key === key;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && reveal)
      tab.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  render();
}
function syncControls() {
  for (const c of model.controls) {
    const el = document.getElementById("control-" + c.key);
    if (!el) continue;
    if (c.type === "range")
      for (const input of el.querySelectorAll("input"))
        input.value = params[c.key];
    for (const b of el.querySelectorAll('[role="radio"]')) {
      const selected = b.dataset.value === String(params[c.key]);
      b.setAttribute("aria-checked", String(selected));
      b.tabIndex = selected ? 0 : -1;
    }
    if (c.type === "toggle" && c.key !== "reverse") {
      const b = el.querySelector("button");
      b.setAttribute("aria-pressed", String(params[c.key]));
      b.querySelector(".tool-state").textContent = params[c.key]
        ? "开启"
        : "关闭";
    }
  }
}
function segments(c, options) {
  const group = document.createElement("div");
  group.className = "segments";
  group.id = "param-" + c.key;
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", c.label);
  for (const opt of options) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.value = String(opt.value);
    b.textContent = opt.label.split(" · ")[0];
    b.setAttribute("role", "radio");
    b.onclick = () => change(c.key, opt.value);
    group.append(b);
  }
  return group;
}
function renderControls() {
  const root = $("#controls");
  root.replaceChildren();
  $("#parameter-tabs").replaceChildren(
    ...model.controls.map((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.id = "tab-" + c.key;
      b.dataset.key = c.key;
      b.textContent = parameterNames[c.key] || c.label;
      b.setAttribute("role", "tab");
      b.setAttribute("aria-controls", "control-" + c.key);
      b.onclick = () => selectParameter(c.key);
      return b;
    }),
  );
  for (const c of model.controls) {
    const wrap = document.createElement("div");
    wrap.className = "control";
    wrap.dataset.key = c.key;
    wrap.id = "control-" + c.key;
    wrap.setAttribute("role", "tabpanel");
    wrap.setAttribute("aria-labelledby", "tab-" + c.key);
    wrap.addEventListener("focusin", () => selectParameter(c.key));
    wrap.classList.toggle("current-control", c.key === selectedParameter);
    const id = "param-" + c.key;
    if (c.type === "range") {
      const head = document.createElement("div");
      head.className = "control-head";
      const label = document.createElement("label");
      label.htmlFor = id;
      label.textContent = c.label;
      const value = document.createElement("span");
      value.className = "control-value";
      const number = document.createElement("input");
      Object.assign(number, {
        type: "number",
        min: c.min,
        max: c.max,
        step: c.step ?? 1,
        value: params[c.key],
      });
      number.setAttribute("aria-label", c.label + "精确值");
      const slider = document.createElement("input");
      Object.assign(slider, {
        id,
        type: "range",
        min: c.min,
        max: c.max,
        step: c.step ?? 1,
        value: params[c.key],
      });
      const commit = (source) => {
        const v = Number(source.value);
        if (!Number.isFinite(v) || source.value === "") {
          source.value = params[c.key];
          return;
        }
        const n = Math.min(c.max, Math.max(c.min, v)),
          step = c.step ?? 1,
          rounded = Number(
            (c.min + Math.round((n - c.min) / step) * step).toFixed(6),
          );
        slider.value = number.value = rounded;
        change(c.key, rounded);
      };
      slider.oninput = () => commit(slider);
      number.onchange = () => commit(number);
      number.onkeydown = (e) => {
        if (e.key === "Enter") {
          commit(number);
          number.blur();
        }
      };
      value.append(number, document.createTextNode(c.unit || ""));
      head.append(label, value);
      const ends = document.createElement("div");
      ends.className = "range-labels";
      ends.innerHTML = `<span>${c.min}${c.unit || ""}</span><span>${c.max}${c.unit || ""}</span>`;
      wrap.append(head, slider, ends);
    } else if (c.type === "select" || c.key === "reverse") {
      const head = document.createElement("div");
      head.className = "control-head";
      head.textContent = c.key === "reverse" ? "磁场方向" : c.label;
      const options =
        c.key === "reverse"
          ? [
              { value: false, label: "⊙ 向外" },
              { value: true, label: "⊗ 向内" },
            ]
          : c.options;
      wrap.append(head, segments(c, options));
    } else if (c.type === "toggle") {
      const b = document.createElement("button");
      b.type = "button";
      b.id = "param-" + c.key;
      b.className = "tool-toggle";
      b.append(document.createTextNode(c.label));
      const stateLabel = document.createElement("span");
      stateLabel.className = "tool-state";
      b.append(stateLabel);
      b.onclick = () => change(c.key, !params[c.key]);
      wrap.append(b);
    } else if (c.type === "action") {
      const b = document.createElement("button");
      b.textContent = c.label;
      b.onclick = () => {
        model.action?.(c.key, state, params);
        if (c.key === "emit") running = true;
        renderControls();
        updateStatus();
        render();
        updateStats();
      };
      wrap.append(b);
    }
    root.append(wrap);
  }
  selectParameter(selectedParameter, true);
  syncControls();
}
$("#play").onclick = () => {
  running = !running;
  updateStatus();
};
$("#step").onclick = () => {
  model.step(state, params, 1 / 30);
  render();
  updateStats();
};
$("#reset").onclick = () => {
  Object.assign(params, defaults(model));
  model.reset(state, params);
  running = false;
  Object.assign(camera, {
    zoom: 1,
    panX: 0,
    panY: 0,
    panorama: false,
    bounds: null,
  });
  renderControls();
  updateStatus();
  render();
  updateStats();
};
$("#clear").onclick = () => {
  if (model.action) model.action("clear", state, params);
  else state.trail = [];
  render();
  updateStats();
};
$("#restart").onclick = () => {
  model.reset(state, params);
  running = false;
  updateStatus();
  render();
  updateStats();
};
function sceneBounds() {
  if (!mobileLayout.matches || camera.panorama)
    return { x: 0, y: 0, w: 1000, h: 650 };
  return (camera.bounds ??= initialBounds());
}
function initialBounds() {
  if (active === "dynamic") {
    const r = params.radius,
      a = (params.angle * Math.PI) / 180;
    const cx = 200 - r * Math.sin(a),
      cy = params.entry + r * Math.cos(a);
    const x = Math.min(160, cx - r - 25),
      right = Math.max(cx + r + 55, Math.min(params.wall + 55, 900));
    const y = Math.min(20, cy - r - 25),
      bottom = Math.max(600, cy + r + 25);
    return { x, y, w: right - x, h: bottom - y };
  }
  if (active === "focusing")
    return {
      x: params.leftX - params.fieldRadius - 50,
      y: 100,
      w:
        params.rightX +
        params.focusRadius -
        params.leftX +
        params.fieldRadius +
        100,
      h: 470,
    };
  if (active === "cyclotron") return { x: 190, y: 15, w: 620, h: 620 };
  if (active === "righthand") return { x: 230, y: 65, w: 540, h: 560 };
  if (active === "solenoid") return { x: 150, y: 65, w: 700, h: 560 };
  return { x: 30, y: 75, w: 940, h: 540 };
}
function viewTransform() {
  // CSS and world coordinates share this transform for drawing and direct manipulation.
  const r = canvas.getBoundingClientRect(),
    b = sceneBounds();
  const scale = Math.min(r.width / b.w, r.height / b.h) * camera.zoom;
  return {
    scale,
    x: r.width / 2 - (b.x + b.w / 2) * scale + camera.panX,
    y: r.height / 2 - (b.y + b.h / 2) * scale + camera.panY,
  };
}
const handleNodes = new Map();
let dragHandle = null;
function renderHandles(t) {
  const r = canvas.getBoundingClientRect(),
    list = getHandles(active, params, state);
  const live = new Set(list.map((h) => h.id));
  for (const [id, node] of handleNodes)
    if (!live.has(id)) {
      node.remove();
      handleNodes.delete(id);
    }
  for (const h of list) {
    let b = handleNodes.get(h.id);
    if (!b) {
      b = document.createElement("button");
      b.type = "button";
      b.className = "geometry-handle";
      b.dataset.handle = h.id;
      $("#geometry-handles").append(b);
      handleNodes.set(h.id, b);
    }
    const x = h.x * t.scale + t.x,
      y = h.y * t.scale + t.y;
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.hidden = x < 20 || x > r.width - 20 || y < 20 || y > r.height - 20;
    b.dataset.label = h.label.replace("拖动", "");
    b.dataset.selected = String(h.keys.includes(selectedParameter));
    b.dataset.dragging = String(dragHandle?.handle.id === h.id);
    b.setAttribute(
      "aria-label",
      `${h.label}，${h.keys.map((k) => `${parameterNames[k] || k} ${params[k]}`).join("，")}。也可用方向键微调`,
    );
  }
}
function applyGeometry(values) {
  let changed = false;
  for (const [key, value] of Object.entries(values)) {
    const c = model.controls.find((c) => c.key === key && c.type === "range");
    if (!c || !Number.isFinite(value)) continue;
    const step = c.step ?? 1,
      clamped = Math.max(c.min, Math.min(c.max, value));
    const n = Number(
      (c.min + Math.round((clamped - c.min) / step) * step).toFixed(6),
    );
    if (n !== params[key]) {
      params[key] = n;
      changed = true;
    }
  }
  if (changed) model.reset(state, params);
  syncControls();
  render();
  updateStats();
}
function stopAutoScan() {
  if (active === "dynamic" && params.auto) {
    for (const key of ["entry", "angle", "radius"])
      params[key] = Math.round(state.current[key]);
    params.auto = false;
    model.reset(state, params);
    syncControls();
  }
}
$("#geometry-handles").addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
    return;
  const h = getHandles(active, params, state).find(
    (h) => h.id === e.target.dataset.handle,
  );
  if (!h) return;
  e.preventDefault();
  stopAutoScan();
  const vertical = ["ArrowUp", "ArrowDown"].includes(e.key);
  const key =
    h.keys.find((k) => (vertical ? /Y$/.test(k) : /X$/.test(k))) || h.keys[0];
  const c = model.controls.find((c) => c.key === key);
  const upInWorld = key === "entry" || /Y$/.test(key);
  const sign =
    e.key === "ArrowLeft" ||
    (upInWorld ? e.key === "ArrowUp" : e.key === "ArrowDown")
      ? -1
      : 1;
  selectParameter(key, true);
  applyGeometry({
    [key]: params[key] + sign * (c.step ?? 1) * (e.shiftKey ? 10 : 1),
  });
});
function render() {
  const r = canvas.getBoundingClientRect(),
    d = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(r.width * d),
    h = Math.round(r.height * d);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#101e32";
  ctx.fillRect(0, 0, w, h);
  const t = viewTransform();
  ctx.setTransform(t.scale * d, 0, 0, t.scale * d, t.x * d, t.y * d);
  ctx.save();
  model.draw(ctx, 1000, 650, state, params);
  ctx.restore();
  renderHandles(t);
  $("#zoom-in").disabled = camera.zoom >= 5;
  $("#zoom-out").disabled = camera.zoom <= 0.6;
  $("#view-hint").textContent =
    `${Math.round(camera.zoom * 100)}% · ${model.pointer ? "单指旋转 / 双指缩放、平移" : getHandles(active, params, state).length ? "拖动圆点改参数 · 空白处平移 / 双指缩放" : "拖动平移 / 双指缩放"}`;
}
function updateStats() {
  const stats = model.stats(state, params);
  $("#stats").style.gridTemplateColumns =
    `repeat(${Math.min(stats.length, 3)},minmax(0,1fr))`;
  $("#stats").replaceChildren(
    ...stats.map((item) => {
      const el = document.createElement("div");
      el.className = "stat";
      const l = document.createElement("label"),
        v = document.createElement("strong");
      l.textContent = item.label;
      v.textContent = item.value;
      el.append(l, v);
      return el;
    }),
  );
}
const pointers = new Map();
let gesture = null;
function point(e) {
  const r = canvas.getBoundingClientRect(),
    t = viewTransform();
  return [
    (e.clientX - r.left - t.x) / t.scale,
    (e.clientY - r.top - t.y) / t.scale,
  ];
}
function beginGesture() {
  const pts = [...pointers.values()];
  if (pts.length < 2) {
    gesture = null;
    return;
  }
  const [a, b] = pts,
    r = canvas.getBoundingClientRect();
  const mid = { x: (a.x + b.x) / 2 - r.left, y: (a.y + b.y) / 2 - r.top },
    t = viewTransform();
  gesture = {
    distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
    zoom: camera.zoom,
    worldX: (mid.x - t.x) / t.scale,
    worldY: (mid.y - t.y) / t.scale,
  };
}
$(".canvas-wrap").addEventListener("pointerdown", (e) => {
  const target = e.target.closest("[data-handle]");
  if (e.target !== canvas && !target) return;
  e.preventDefault();
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.setPointerCapture(e.pointerId);
  canvas.classList.add("dragging");
  if (pointers.size === 1 && target) {
    stopAutoScan();
    const handle = getHandles(active, params, state).find(
      (h) => h.id === target.dataset.handle,
    );
    if (!handle) return;
    selectParameter(handle.keys[0], true);
    const [x, y] = point(e);
    dragHandle = {
      handle,
      pointerId: e.pointerId,
      offsetX: x - handle.x,
      offsetY: y - handle.y,
    };
    target.focus({ preventScroll: true });
    render();
  } else if (pointers.size === 1)
    model.pointer?.(state, params, ...point(e), "down");
  else {
    dragHandle = null;
    model.pointer?.(state, params, ...point(e), "up");
    beginGesture();
  }
});
canvas.addEventListener("pointermove", (e) => {
  const previous = pointers.get(e.pointerId);
  if (!previous) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size >= 2 && gesture) {
    const [a, b] = [...pointers.values()],
      r = canvas.getBoundingClientRect();
    camera.zoom = Math.max(
      0.6,
      Math.min(
        5,
        (gesture.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / gesture.distance,
      ),
    );
    camera.panX = 0;
    camera.panY = 0;
    const t = viewTransform();
    camera.panX = (a.x + b.x) / 2 - r.left - (gesture.worldX * t.scale + t.x);
    camera.panY = (a.y + b.y) / 2 - r.top - (gesture.worldY * t.scale + t.y);
  } else if (dragHandle) {
    const [x, y] = point(e);
    applyGeometry(
      dragHandle.handle.update(x - dragHandle.offsetX, y - dragHandle.offsetY),
    );
  } else if (model.pointer) model.pointer(state, params, ...point(e), "move");
  else {
    camera.panX += e.clientX - previous.x;
    camera.panY += e.clientY - previous.y;
  }
  render();
  updateStats();
});
for (const event of ["pointerup", "pointercancel"])
  canvas.addEventListener(event, (e) => {
    if (!pointers.has(e.pointerId)) return;
    model.pointer?.(state, params, ...point(e), "up");
    if (dragHandle?.pointerId === e.pointerId) dragHandle = null;
    pointers.delete(e.pointerId);
    beginGesture();
    if (pointers.size === 1 && model.pointer) {
      const p = [...pointers.values()][0];
      model.pointer(
        state,
        params,
        ...point({ clientX: p.x, clientY: p.y }),
        "down",
      );
    }
    if (!pointers.size) canvas.classList.remove("dragging");
    render();
  });
$("#parameter-tabs").addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
  e.preventDefault();
  const tabs = [...$("#parameter-tabs").children],
    index = tabs.indexOf(e.target);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? tabs.length - 1
        : (index + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) %
          tabs.length;
  selectParameter(tabs[next].dataset.key, true);
  tabs[next].focus();
});
document.addEventListener("keydown", (e) => {
  if (
    e.target.getAttribute("role") !== "radio" ||
    ![
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
    ].includes(e.key)
  )
    return;
  e.preventDefault();
  const buttons = [...e.target.parentElement.children],
    index = buttons.indexOf(e.target);
  const next =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? buttons.length - 1
        : (index +
            (["ArrowRight", "ArrowDown"].includes(e.key)
              ? 1
              : buttons.length - 1)) %
          buttons.length;
  buttons[next].click();
  buttons[next].focus();
});
$("#speed-options").onclick = (e) => {
  const b = e.target.closest("[data-speed]");
  if (!b) return;
  playbackSpeed = Number(b.dataset.speed);
  for (const el of $("#speed-options").children) {
    const selected = el === b;
    el.setAttribute("aria-checked", String(selected));
    el.tabIndex = selected ? 0 : -1;
  }
};
$("#all-parameters").onclick = () => {
  const open = $(".settings").classList.toggle("expanded");
  $("#all-parameters").setAttribute("aria-expanded", String(open));
  $("#all-parameters").textContent = open ? "收起" : "更多";
  if (!open) selectParameter(selectedParameter, true);
};
$("#zoom-in").onclick = () => {
  camera.zoom = Math.min(5, camera.zoom * 1.35);
  render();
};
$("#zoom-out").onclick = () => {
  camera.zoom = Math.max(0.6, camera.zoom / 1.35);
  render();
};
$("#view-reset").onclick = () => {
  Object.assign(camera, { zoom: 1, panX: 0, panY: 0, panorama: true });
  render();
};
$("#focus-view").onclick = () => {
  const focus = document.body.classList.toggle("focus-view");
  $("#focus-view").textContent = focus ? "返回调参" : "专注";
  $("#focus-view").setAttribute("aria-pressed", String(focus));
};
$("#show-theory").onclick = () => {
  $("#dialog-title").textContent = model.title;
  $("#dialog-theory").textContent = model.theory;
  $("#dialog-stats").textContent = model
    .stats(state, params)
    .map((s) => `${s.label}：${s.value}`)
    .join("\n");
  $("#theory-dialog").showModal();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("focus-view"))
    $("#focus-view").click();
});
new ResizeObserver(() => {
  if (model) render();
}).observe(canvas);
document.addEventListener("visibilitychange", () => (last = 0));
function frame(now) {
  if (last && running && !document.hidden) {
    const dt = Math.min((now - last) / 1000, 0.05) * playbackSpeed;
    model.step(state, params, dt);
    render();
    statClock += dt;
    if (statClock > 0.15) {
      updateStats();
      statClock = 0;
    }
  }
  last = now;
  requestAnimationFrame(frame);
}
selectModel(
  order.includes(location.hash.slice(1)) ? location.hash.slice(1) : "dynamic",
);
requestAnimationFrame(frame);

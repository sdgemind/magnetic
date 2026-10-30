(() => {
"use strict";
const finite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const point = (x, y) => ({ x: finite(x), y: finite(y) });

function dynamicHandles(p, s) {
  const current = s?.current ?? p;
  const entry = finite(current.entry, finite(p.entry));
  const angle = finite(current.angle, finite(p.angle));
  const radius = finite(current.radius, finite(p.radius));
  const wall = finite(p.wall);
  const gap = finite(p.gap);
  const tilt = finite(p.tilt) * (Math.PI / 180);
  const radians = angle * (Math.PI / 180);
  const ux = Math.sin(tilt);
  const uy = Math.cos(tilt);
  const cx = 200 - radius * Math.sin(radians);
  const cy = entry + radius * Math.cos(radians);
  const tiltDistance = Math.max(120, gap / 2 + 90);
  const tiltX = wall + ux * tiltDistance;
  const tiltY = 325 + uy * tiltDistance;
  const gapX = wall + (ux * gap) / 2;
  const gapY = 325 + (uy * gap) / 2;

  return [
    {
      id: "entry",
      label: "拖动入射点",
      ...point(200, entry),
      keys: ["entry"],
      update: (_x, y) => ({ entry: finite(y, entry) }),
    },
    {
      id: "wall",
      label: "拖动挡板位置",
      ...point(wall, 325),
      keys: ["wall"],
      update: (x) => ({ wall: finite(x, wall) }),
    },
    {
      id: "tilt",
      label: "拖动挡板角度",
      ...point(tiltX, tiltY),
      keys: ["tilt"],
      update: (x, y) => {
        const dx = finite(x, tiltX) - wall;
        const dy = finite(y, tiltY) - 325;
        if (Math.hypot(dx, dy) < 1e-9) return { tilt: finite(p.tilt) };
        return { tilt: (Math.atan2(dx, dy) * 180) / Math.PI };
      },
    },
    {
      id: "gap",
      label: "拖动间隙端点",
      ...point(gapX, gapY),
      keys: ["gap"],
      update: (x, y) => ({
        gap: 2 * ((finite(x, gapX) - wall) * ux + (finite(y, gapY) - 325) * uy),
      }),
    },
    {
      id: "radius",
      label: "拖动轨迹半径",
      ...point(cx + radius, cy),
      keys: ["radius"],
      update: (x, y) => {
        const dx = 1 - Math.sin(radians),
          dy = Math.cos(radians);
        return {
          radius:
            ((finite(x, cx + radius) - 200) * dx +
              (finite(y, cy) - entry) * dy) /
            (dx * dx + dy * dy),
        };
      },
    },
    {
      id: "angle",
      label: "拖动入射方向",
      ...point(200 + 90 * Math.cos(radians), entry + 90 * Math.sin(radians)),
      keys: ["angle"],
      update: (x, y) => {
        const dx = finite(x, 200) - 200;
        const dy = finite(y, entry) - entry;
        if (Math.hypot(dx, dy) < 1e-9) return { angle };
        return { angle: (Math.atan2(dy, dx) * 180) / Math.PI };
      },
    },
  ];
}

function focusingHandles(p) {
  const leftX = finite(p.leftX, 210);
  const rightX = finite(p.rightX, 630);
  const rightY = finite(p.rightY, 325);
  const fieldRadius = finite(p.fieldRadius, 110);
  const focusRadius = finite(p.focusRadius, 110);
  return [
    {
      id: "leftX",
      label: "拖动发散场位置",
      ...point(leftX, 325),
      keys: ["leftX"],
      update: (x) => ({ leftX: finite(x, leftX) }),
    },
    {
      id: "rightCenter",
      label: "拖动聚焦场",
      ...point(rightX, rightY),
      keys: ["rightX", "rightY"],
      update: (x, y) => ({
        rightX: finite(x, rightX),
        rightY: finite(y, rightY),
      }),
    },
    {
      id: "fieldRadius",
      label: "拖动发散场半径",
      ...point(leftX + fieldRadius, 325),
      keys: ["fieldRadius"],
      update: (x, y) => ({
        fieldRadius: Math.hypot(
          finite(x, leftX + fieldRadius) - leftX,
          finite(y, 325) - 325,
        ),
      }),
    },
    {
      id: "focusRadius",
      label: "拖动聚焦场半径",
      ...point(rightX + focusRadius, rightY),
      keys: ["focusRadius"],
      update: (x, y) => ({
        focusRadius: Math.hypot(
          finite(x, rightX + focusRadius) - rightX,
          finite(y, rightY) - rightY,
        ),
      }),
    },
  ];
}

function boundedHandles(p) {
  const cx = finite(p.fieldX, 650);
  const cy = finite(p.fieldY, 325);
  const halfWidth = finite(p.fieldW, 170);
  const halfHeight = finite(p.fieldH, 220) / 2;
  const rect = p.shape === "rect";
  const handles = [
    {
      id: "fieldCenter",
      label: "拖动磁场中心",
      ...point(cx, cy),
      keys: ["fieldX", "fieldY"],
      update: (x, y) => ({ fieldX: finite(x, cx), fieldY: finite(y, cy) }),
    },
    {
      id: "fieldW",
      label: rect ? "拖动矩形半宽" : "拖动磁场半径",
      ...point(cx + halfWidth, cy),
      keys: ["fieldW"],
      update: (x, y) => ({
        fieldW: rect
          ? Math.abs(finite(x, cx + halfWidth) - cx)
          : Math.hypot(finite(x, cx + halfWidth) - cx, finite(y, cy) - cy),
      }),
    },
  ];
  if (rect) {
    handles.push({
      id: "fieldH",
      label: "拖动矩形高度",
      ...point(cx, cy + halfHeight),
      keys: ["fieldH"],
      update: (_x, y) => ({
        fieldH: 2 * Math.abs(finite(y, cy + halfHeight) - cy),
      }),
    });
  }
  return handles;
}

function getHandles(key, p = {}, s = {}) {
  if (key === "dynamic") return dynamicHandles(p, s);
  if (key === "focusing") return focusingHandles(p);
  if (key === "bounded") return boundedHandles(p);
  return [];
}
globalThis.PhysicsLab.getHandles = getHandles;
})();

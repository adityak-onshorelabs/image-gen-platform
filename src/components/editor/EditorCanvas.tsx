"use client";

import { useEffect, useRef, useState } from "react";
import type { Layer } from "@/lib/layer-types";

type Tool = "select" | "text" | "image";
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const MIN = 8; // min native px

export function EditorCanvas({
  width,
  height,
  baseImageUrl,
  version,
  layers,
  selectedId,
  tool,
  onSelect,
  onChange,
  onCreate,
}: {
  width: number;
  height: number;
  baseImageUrl: string | null;
  version: number;
  layers: Layer[];
  selectedId: string | null;
  tool: Tool;
  onSelect: (id: string | null) => void;
  onChange: (id: string, patch: Partial<Layer>) => void;
  onCreate: (box: { x: number; y: number; width: number; height: number }) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / width));
    ro.observe(el);
    setScale(el.clientWidth / width);
    return () => ro.disconnect();
  }, [width]);

  const drag = useRef<null | {
    mode: "move" | "resize" | "draw";
    handle?: Handle;
    startX: number;
    startY: number;
    orig: { x: number; y: number; width: number; height: number };
    id?: string;
  }>(null);
  const [draft, setDraft] = useState<null | {
    x: number;
    y: number;
    width: number;
    height: number;
  }>(null);

  function toNative(clientX: number, clientY: number) {
    const r = wrapRef.current!.getBoundingClientRect();
    return { nx: (clientX - r.left) / scale, ny: (clientY - r.top) / scale };
  }

  function onPointerDownCanvas(e: React.PointerEvent) {
    if (tool === "select") {
      onSelect(null);
      return;
    }
    // draw-to-create
    const { nx, ny } = toNative(e.clientX, e.clientY);
    drag.current = {
      mode: "draw",
      startX: nx,
      startY: ny,
      orig: { x: nx, y: ny, width: 0, height: 0 },
    };
    setDraft({ x: nx, y: ny, width: 0, height: 0 });
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function startLayerDrag(
    e: React.PointerEvent,
    layer: Layer,
    mode: "move" | "resize",
    handle?: Handle
  ) {
    e.stopPropagation();
    if (tool !== "select") return;
    onSelect(layer.id);
    const { nx, ny } = toNative(e.clientX, e.clientY);
    drag.current = {
      mode,
      handle,
      startX: nx,
      startY: ny,
      orig: { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
      id: layer.id,
    };
    (e.target as Element).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const { nx, ny } = toNative(e.clientX, e.clientY);
    const dx = nx - d.startX;
    const dy = ny - d.startY;

    if (d.mode === "draw") {
      const x = Math.min(d.startX, nx);
      const y = Math.min(d.startY, ny);
      setDraft({ x, y, width: Math.abs(nx - d.startX), height: Math.abs(ny - d.startY) });
      return;
    }
    if (d.mode === "move" && d.id) {
      onChange(d.id, {
        x: clamp(d.orig.x + dx, 0, width - d.orig.width),
        y: clamp(d.orig.y + dy, 0, height - d.orig.height),
      });
      return;
    }
    if (d.mode === "resize" && d.id && d.handle) {
      onChange(d.id, resize(d.orig, d.handle, dx, dy, width, height));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (d?.mode === "draw" && draft) {
      if (draft.width >= MIN && draft.height >= MIN) onCreate(roundBox(draft));
      setDraft(null);
    }
    try {
      (e.target as Element).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  const src = baseImageUrl ? `${baseImageUrl}?v=${version}` : null;

  return (
    <div className="flex justify-center">
      <div
        ref={wrapRef}
        onPointerDown={onPointerDownCanvas}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative w-full max-w-[640px] select-none overflow-hidden rounded-lg border border-neutral-800 ${
          tool === "select" ? "cursor-default" : "cursor-crosshair"
        }`}
        style={{ aspectRatio: `${width} / ${height}`, touchAction: "none" }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pointer-events-none absolute inset-0 h-full w-full" />
        ) : (
          <div className="absolute inset-0 bg-[repeating-conic-gradient(#1a1a1a_0_25%,#222_0_50%)] bg-[length:24px_24px]" />
        )}

        {[...layers]
          .filter((l) => !l.hidden)
          .map((l) => (
            <LayerBox
              key={l.id}
              layer={l}
              scale={scale}
              selected={l.id === selectedId}
              tool={tool}
              onMoveStart={(e) => startLayerDrag(e, l, "move")}
              onResizeStart={(e, h) => startLayerDrag(e, l, "resize", h)}
            />
          ))}

        {draft && (
          <div
            className="absolute border-2 border-dashed border-sky-400 bg-sky-400/10"
            style={{
              left: draft.x * scale,
              top: draft.y * scale,
              width: draft.width * scale,
              height: draft.height * scale,
            }}
          />
        )}
      </div>
    </div>
  );
}

function LayerBox({
  layer: l,
  scale,
  selected,
  tool,
  onMoveStart,
  onResizeStart,
}: {
  layer: Layer;
  scale: number;
  selected: boolean;
  tool: Tool;
  onMoveStart: (e: React.PointerEvent) => void;
  onResizeStart: (e: React.PointerEvent, h: Handle) => void;
}) {
  const style: React.CSSProperties = {
    left: l.x * scale,
    top: l.y * scale,
    width: l.width * scale,
    height: l.height * scale,
    opacity: l.opacity / 100,
  };

  return (
    <div
      onPointerDown={onMoveStart}
      className={`absolute ${tool === "select" ? "cursor-move" : "pointer-events-none"} ${
        selected ? "ring-2 ring-sky-400" : "ring-1 ring-white/30"
      }`}
      style={style}
    >
      {l.type === "text" ? (
        <div
          className="h-full w-full overflow-hidden"
          style={{
            color: l.fontColor ?? "#fff",
            fontFamily: l.fontFamily ? `"${l.fontFamily}"` : "sans-serif",
            fontWeight: l.fontWeight ?? 400,
            fontSize: (l.fontSize ?? 24) * scale,
            lineHeight: l.lineHeight ?? 1.2,
            letterSpacing: (l.letterSpacing ?? 0) * scale,
            textAlign: l.alignment ?? "left",
            display: "flex",
            flexDirection: "column",
            justifyContent:
              l.verticalAlign === "middle"
                ? "center"
                : l.verticalAlign === "bottom"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          <span>{l.defaultValue || l.name}</span>
        </div>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center bg-white/5 text-[10px] text-white/60"
          style={{ borderRadius: (l.borderRadius ?? 0) * scale }}
        >
          {l.defaultValue ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={l.defaultValue}
              alt=""
              className="h-full w-full"
              style={{
                objectFit: l.fitMode === "stretch" ? "fill" : (l.fitMode ?? "cover"),
                borderRadius: (l.borderRadius ?? 0) * scale,
              }}
            />
          ) : (
            `🖼 ${l.name}`
          )}
        </div>
      )}

      {selected && tool === "select" && (
        <>
          {HANDLES.map((h) => (
            <span
              key={h}
              onPointerDown={(e) => onResizeStart(e, h)}
              className="absolute z-10 h-2.5 w-2.5 rounded-sm border border-sky-300 bg-white"
              style={handleStyle(h)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function handleStyle(h: Handle): React.CSSProperties {
  const mid = "50%";
  const map: Record<Handle, React.CSSProperties> = {
    nw: { left: 0, top: 0, cursor: "nwse-resize" },
    n: { left: mid, top: 0, cursor: "ns-resize" },
    ne: { right: 0, top: 0, cursor: "nesw-resize" },
    e: { right: 0, top: mid, cursor: "ew-resize" },
    se: { right: 0, bottom: 0, cursor: "nwse-resize" },
    s: { left: mid, bottom: 0, cursor: "ns-resize" },
    sw: { left: 0, bottom: 0, cursor: "nesw-resize" },
    w: { left: 0, top: mid, cursor: "ew-resize" },
  };
  return { transform: "translate(-50%, -50%)", ...map[h] };
}

function resize(
  o: { x: number; y: number; width: number; height: number },
  h: Handle,
  dx: number,
  dy: number,
  maxW: number,
  maxH: number
): Partial<Layer> {
  let { x, y, width, height } = o;
  const right = o.x + o.width;
  const bottom = o.y + o.height;
  if (h.includes("w")) {
    x = clamp(o.x + dx, 0, right - MIN);
    width = right - x;
  }
  if (h.includes("n")) {
    y = clamp(o.y + dy, 0, bottom - MIN);
    height = bottom - y;
  }
  if (h.includes("e")) width = clamp(o.width + dx, MIN, maxW - o.x);
  if (h.includes("s")) height = clamp(o.height + dy, MIN, maxH - o.y);
  return { x, y, width, height };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function roundBox(b: { x: number; y: number; width: number; height: number }) {
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    width: Math.round(b.width),
    height: Math.round(b.height),
  };
}

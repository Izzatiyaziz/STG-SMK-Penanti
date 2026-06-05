import { useCallback, useEffect, useRef, useState } from "react";

export type DetectedQuad = {
  tl: { x: number; y: number };
  tr: { x: number; y: number };
  br: { x: number; y: number };
  bl: { x: number; y: number };
};

export type DocumentDetectionState = "idle" | "detecting" | "stable";

interface UseDocumentDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement>;
  overlayCanvasRef: React.RefObject<HTMLCanvasElement>;
  enabled: boolean;
  onStable: () => void;
}

const FPS = 15;
const STABILITY_FRAMES = 22; // ~1.5s at 15fps
const STABILITY_THRESHOLD = 8; // px max std deviation
const EDGE_THRESHOLD = 22; // min brightness delta to count as edge
const MIN_COVERAGE = 0.35; // paper must cover 35% of frame area
const SAMPLES = 14; // scan lines per edge

function sampleBrightness(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): number {
  const ix = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const iy = Math.max(0, Math.min(Math.floor(data.length / 4 / width) - 1, Math.floor(y)));
  const i = (iy * width + ix) * 4;
  return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
}

function stdDev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
}

function detectBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): DetectedQuad | null {
  const leftEdges: number[] = [];
  const rightEdges: number[] = [];
  const topEdges: number[] = [];
  const bottomEdges: number[] = [];

  for (let s = 0; s < SAMPLES; s++) {
    const yFrac = 0.15 + (s / SAMPLES) * 0.7;
    const y = height * yFrac;

    // Left edge: scan right
    for (let x = 2; x < width * 0.65; x += 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x - 2, y)) > EDGE_THRESHOLD) {
        leftEdges.push(x);
        break;
      }
    }
    // Right edge: scan left
    for (let x = width - 2; x > width * 0.35; x -= 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x + 2, y)) > EDGE_THRESHOLD) {
        rightEdges.push(x);
        break;
      }
    }
  }

  for (let s = 0; s < SAMPLES; s++) {
    const xFrac = 0.15 + (s / SAMPLES) * 0.7;
    const x = width * xFrac;

    // Top edge: scan down
    for (let y = 2; y < height * 0.65; y += 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x, y - 2)) > EDGE_THRESHOLD) {
        topEdges.push(y);
        break;
      }
    }
    // Bottom edge: scan up
    for (let y = height - 2; y > height * 0.35; y -= 2) {
      if (Math.abs(sampleBrightness(data, width, x, y) - sampleBrightness(data, width, x, y + 2)) > EDGE_THRESHOLD) {
        bottomEdges.push(y);
        break;
      }
    }
  }

  const minHits = Math.floor(SAMPLES * 0.4);
  if (leftEdges.length < minHits || rightEdges.length < minHits ||
      topEdges.length < minHits || bottomEdges.length < minHits) {
    return null;
  }

  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  const l = median(leftEdges);
  const r = median(rightEdges);
  const t = median(topEdges);
  const b = median(bottomEdges);

  if (r - l < width * 0.2 || b - t < height * 0.2) return null;
  const coverage = ((r - l) * (b - t)) / (width * height);
  if (coverage < MIN_COVERAGE) return null;

  return {
    tl: { x: l, y: t },
    tr: { x: r, y: t },
    br: { x: r, y: b },
    bl: { x: l, y: b },
  };
}

function drawOverlay(
  canvas: HTMLCanvasElement,
  quad: DetectedQuad,
  color: string,
  dashed: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.setLineDash(dashed ? [10, 5] : []);
  ctx.beginPath();
  ctx.moveTo(quad.tl.x, quad.tl.y);
  ctx.lineTo(quad.tr.x, quad.tr.y);
  ctx.lineTo(quad.br.x, quad.br.y);
  ctx.lineTo(quad.bl.x, quad.bl.y);
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // Corner brackets
  const B = 22;
  const corners: Array<{ x: number; y: number; dx: number; dy: number }> = [
    { ...quad.tl, dx: 1, dy: 1 },
    { ...quad.tr, dx: -1, dy: 1 },
    { ...quad.br, dx: -1, dy: -1 },
    { ...quad.bl, dx: 1, dy: -1 },
  ];
  ctx.lineWidth = 4;
  corners.forEach(({ x, y, dx, dy }) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * B, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * B);
    ctx.stroke();
  });
}

export function useDocumentDetection({
  videoRef,
  overlayCanvasRef,
  enabled,
  onStable,
}: UseDocumentDetectionOptions) {
  const [detectionState, setDetectionState] = useState<DocumentDetectionState>("idle");
  const [detectedQuad, setDetectedQuad] = useState<DetectedQuad | null>(null);
  const quadHistory = useRef<DetectedQuad[]>([]);
  const stableFiredRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);

  const clearOverlay = useCallback(() => {
    const overlay = overlayCanvasRef.current;
    if (overlay) {
      const ctx = overlay.getContext("2d");
      ctx?.clearRect(0, 0, overlay.width, overlay.height);
    }
  }, [overlayCanvasRef]);

  const resetDetection = useCallback(() => {
    quadHistory.current = [];
    stableFiredRef.current = false;
    setDetectionState("idle");
    setDetectedQuad(null);
    clearOverlay();
  }, [clearOverlay]);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      resetDetection();
      return;
    }

    const interval = 1000 / FPS;
    let lastTime = 0;

    function loop(time: number) {
      rafRef.current = requestAnimationFrame(loop);
      if (time - lastTime < interval) return;
      lastTime = time;

      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;
      if (!video || !overlay || video.readyState < 2 || !video.videoWidth) return;

      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement("canvas");
      }
      const offscreen = offscreenRef.current;
      const scale = 0.3;
      offscreen.width = Math.floor(video.videoWidth * scale);
      offscreen.height = Math.floor(video.videoHeight * scale);
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;

      const offCtx = offscreen.getContext("2d", { willReadFrequently: true });
      if (!offCtx) return;
      offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
      const imageData = offCtx.getImageData(0, 0, offscreen.width, offscreen.height);

      const rawQuad = detectBounds(imageData.data, offscreen.width, offscreen.height);

      if (!rawQuad) {
        quadHistory.current = [];
        stableFiredRef.current = false;
        setDetectionState("detecting");
        setDetectedQuad(null);
        clearOverlay();
        return;
      }

      // Scale quad back to full video dimensions
      const sx = video.videoWidth / offscreen.width;
      const sy = video.videoHeight / offscreen.height;
      const scaledQuad: DetectedQuad = {
        tl: { x: rawQuad.tl.x * sx, y: rawQuad.tl.y * sy },
        tr: { x: rawQuad.tr.x * sx, y: rawQuad.tr.y * sy },
        br: { x: rawQuad.br.x * sx, y: rawQuad.br.y * sy },
        bl: { x: rawQuad.bl.x * sx, y: rawQuad.bl.y * sy },
      };

      quadHistory.current = [...quadHistory.current.slice(-(STABILITY_FRAMES - 1)), scaledQuad];
      setDetectedQuad(scaledQuad);

      const isStable =
        quadHistory.current.length >= STABILITY_FRAMES &&
        stdDev(quadHistory.current.map((q) => q.tl.x)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.tl.y)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.br.x)) < STABILITY_THRESHOLD &&
        stdDev(quadHistory.current.map((q) => q.br.y)) < STABILITY_THRESHOLD;

      if (isStable) {
        setDetectionState("stable");
        drawOverlay(overlay, scaledQuad, "#22c55e", false);
        if (!stableFiredRef.current) {
          stableFiredRef.current = true;
          onStable();
        }
      } else {
        stableFiredRef.current = false;
        setDetectionState("detecting");
        drawOverlay(overlay, scaledQuad, "#eab308", true);
      }
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled, videoRef, overlayCanvasRef, onStable, clearOverlay, resetDetection]);

  return { detectionState, detectedQuad, resetDetection, clearOverlay };
}

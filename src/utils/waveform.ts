export function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

export function drawWaveform(canvas: HTMLCanvasElement | null, progress: number): void {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const styles = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const waveBg = styles?.getPropertyValue("--wave-bg").trim() || "#eef3f1";
  const waveDone = styles?.getPropertyValue("--wave-done").trim() || "#315fba";
  const waveRest = styles?.getPropertyValue("--wave-rest").trim() || "#b8c7c2";

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = waveBg;
  ctx.fillRect(0, 0, width, height);

  const bars = 96;
  const gap = 3;
  const barWidth = width / bars - gap;
  for (let i = 0; i < bars; i += 1) {
    const phase = i / bars;
    const amplitude = 0.22 + 0.58 * Math.abs(Math.sin(i * 0.39) * Math.cos(i * 0.17));
    const barHeight = Math.max(8, height * amplitude);
    const x = i * (barWidth + gap);
    const y = (height - barHeight) / 2;
    ctx.fillStyle = phase <= progress ? waveDone : waveRest;
    roundRect(ctx, x, y, barWidth, barHeight, 4);
    ctx.fill();
  }
}

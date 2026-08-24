import { formatDuration } from "./format";
import type { Summary } from "./session";

/**
 * Draws the post-shit receipt to a shareable PNG. Pure canvas — no libraries,
 * no external images — so it works inside the Worker-served page and produces
 * something people actually want to post.
 */
export async function renderReceipt(summary: Summary): Promise<Blob | null> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Wait for the webfont, else the first render falls back to system mono.
  try {
    await document.fonts.load("700 40px 'JetBrains Mono'");
    await document.fonts.ready;
  } catch {
    /* fall back to the stack below */
  }

  const ink = "#2B1D12";
  const faint = "#7A6650";
  const mono = "'JetBrains Mono', ui-monospace, monospace";

  // Beige ground, then a paper card with a subtle border.
  ctx.fillStyle = "#EFE4D2";
  ctx.fillRect(0, 0, W, H);
  const m = 70;
  ctx.fillStyle = "#FCF9F3";
  ctx.strokeStyle = "rgba(74,45,20,0.16)";
  ctx.lineWidth = 2;
  roundRect(ctx, m, m, W - 2 * m, H - 2 * m, 28);
  ctx.fill();
  ctx.stroke();

  const pad = m + 60;
  const right = W - m - 60;
  let y = m + 110;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${mono}`;
  ctx.textAlign = "left";
  ctx.fillText("SHAT ROULETTE", pad, y);
  ctx.fillStyle = faint;
  ctx.textAlign = "right";
  ctx.font = `400 30px ${mono}`;
  ctx.fillText(new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase(), right, y);

  y += 46;
  dashed(ctx, pad, right, y);
  y += 70;

  const rows: [string, string][] = [
    ["TOILET TIME", formatDuration(summary.toiletMs)],
    ["CHAT TIME", formatDuration(summary.chatMs)],
    ["MESSAGES", String(summary.messages)],
    ["SHITMATE", `${summary.country} · #${summary.matchNum}`],
    ["SHITMATES TODAY", String(summary.shitmatesToday)],
  ];
  for (const [label, value] of rows) {
    ctx.textAlign = "left";
    ctx.fillStyle = faint;
    ctx.font = `400 32px ${mono}`;
    ctx.fillText(label, pad, y);
    ctx.textAlign = "right";
    ctx.fillStyle = ink;
    ctx.font = `700 48px ${mono}`;
    ctx.fillText(value, right, y);
    y += 82;
  }

  y += 6;
  dashed(ctx, pad, right, y);
  y += 66;

  ctx.textAlign = "left";
  ctx.fillStyle = faint;
  ctx.font = `400 32px ${mono}`;
  ctx.fillText("PERSONAL BEST", pad, y);
  ctx.textAlign = "right";
  ctx.fillStyle = ink;
  ctx.font = `700 34px ${mono}`;
  ctx.fillText(summary.toiletMs > 31 * 60_000 ? "NEW RECORD" : "NOT EVEN CLOSE", right, y);

  // A deterministic barcode from the summary, so the same shit always looks the same.
  y += 70;
  drawBarcode(ctx, pad, right, y, 90, seedFrom(summary));
  y += 132;

  ctx.textAlign = "center";
  ctx.fillStyle = faint;
  ctx.font = `400 28px ${mono}`;
  ctx.fillText(`SR-${summary.matchNum}-${summary.country}-${formatDuration(summary.toiletMs).replace(/:/g, "")}`, W / 2, y);

  // Footer stamp so a screenshot still says what app it is.
  ctx.fillStyle = ink;
  ctx.font = `800 40px 'Bricolage Grotesque', ${mono}`;
  ctx.fillText("shatroulette", W / 2, H - m - 56);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function dashed(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number) {
  ctx.save();
  ctx.strokeStyle = "rgba(43,29,18,0.4)";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(x1, y);
  ctx.lineTo(x2, y);
  ctx.stroke();
  ctx.restore();
}

function seedFrom(s: Summary): number {
  return (s.matchNum + s.messages * 7 + Math.floor(s.toiletMs / 1000)) >>> 0;
}

function drawBarcode(ctx: CanvasRenderingContext2D, x1: number, x2: number, y: number, h: number, seed: number) {
  ctx.fillStyle = "#2B1D12";
  let s = seed || 1;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let x = x1;
  while (x < x2 - 4) {
    const w = 3 + Math.floor(rand() * 10);
    if (rand() > 0.35) ctx.fillRect(x, y, w, h);
    x += w + 3 + Math.floor(rand() * 4);
  }
}

export type MaterialStyle = "original" | "ice" | "smoke" | "cream" | "metal";
export type ArtPattern =
  | "none"
  | "star"
  | "bunny"
  | "orbit"
  | "wave"
  | "text"
  | "image";
export interface KeyArt {
  pattern: ArtPattern;
  text?: string;
  image?: HTMLCanvasElement;
  fit?: "contain" | "cover";
}
export function paintArt(
  ctx: CanvasRenderingContext2D,
  art: KeyArt,
  x: number,
  y: number,
  physicalAspect: number,
  ink: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + 7, y + 7, 114, 114);
  ctx.clip();
  if (art.pattern === "image" && art.image) {
    const aspect = art.image.width / art.image.height;
    let w = 114,
      h = 114;
    if (aspect > physicalAspect === (art.fit !== "cover"))
      h = (w * physicalAspect) / aspect;
    else w = (h * aspect) / physicalAspect;
    ctx.drawImage(art.image, x + 64 - w / 2, y + 64 - h / 2, w, h);
  } else {
    ctx.translate(x + 64, y + 64);
    ctx.scale(1 / physicalAspect, 1);
    ctx.fillStyle = ink;
    ctx.strokeStyle = ink;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (art.pattern === "text") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = Array.from(art.text || "JUDY")
        .slice(0, 18)
        .join("");
      ctx.font = "600 30px Arial, sans-serif";
      const width = ctx.measureText(label).width;
      const available = 98 * physicalAspect;
      if (width > available) ctx.scale(available / width, 1);
      ctx.fillText(label, 0, 0);
    } else if (art.pattern === "star") {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5 - Math.PI / 2,
          r = i % 2 ? 16 : 39;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (art.pattern === "bunny") {
      ctx.beginPath();
      ctx.ellipse(-14, -24, 8, 23, -0.2, 0, Math.PI * 2);
      ctx.ellipse(14, -24, 8, 23, 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 13, 29, 24, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (const a of [-10, 10]) {
        ctx.beginPath();
        ctx.arc(a, 10, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(-4, 21);
      ctx.lineTo(0, 25);
      ctx.lineTo(4, 21);
      ctx.stroke();
    } else if (art.pattern === "orbit") {
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 44, 12, -0.45, 0, Math.PI * 2);
      ctx.stroke();
    } else if (art.pattern === "wave") {
      for (let row = -1; row <= 1; row++) {
        ctx.beginPath();
        for (let i = -42; i <= 42; i++)
          ctx.lineTo(i, row * 22 + Math.sin(i / 12) * 8);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

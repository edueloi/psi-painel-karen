/**
 * Utilitários da assinatura eletrônica simples (imagem PNG com fundo transparente).
 * Funções de canvas rodam só no navegador; `pngSize` e `isSignatureDataUrl` são puras (Node/navegador).
 */

export interface SignatureImage { dataUrl: string; width: number; height: number }

export const SIGNATURE_MAX_BYTES = 300 * 1024; // limite de upload na UI (servidor aceita até ~400 KB)
export const SIGNATURE_MAX_WIDTH = 900;

const PNG_PREFIX = 'data:image/png;base64,';
export const isSignatureDataUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith(PNG_PREFIX) && v.length > PNG_PREFIX.length + 40;

const b64ToBytes = (b64: string, max: number): Uint8Array => {
  const bin = typeof atob === 'function' ? atob(b64.slice(0, Math.ceil(max / 3) * 4)) : Buffer.from(b64, 'base64').toString('binary');
  const out = new Uint8Array(Math.min(bin.length, max));
  for (let i = 0; i < out.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

/** Largura/altura lidas do cabeçalho IHDR do PNG (sem DOM). */
export function pngSize(dataUrl: string): { width: number; height: number } | null {
  if (!isSignatureDataUrl(dataUrl)) return null;
  try {
    const b = b64ToBytes(dataUrl.slice(PNG_PREFIX.length), 24);
    if (b.length < 24) return null;
    const rd = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
    const width = rd(16); const height = rd(20);
    return width > 0 && height > 0 ? { width, height } : null;
  } catch { return null; }
}

export function toSignatureImage(dataUrl: string | null | undefined): SignatureImage | null {
  if (!dataUrl || !isSignatureDataUrl(dataUrl)) return null;
  const s = pngSize(dataUrl);
  return s ? { dataUrl, ...s } : null;
}

/** Recorta o canvas ao conteúdo visível (alpha > 8) com uma pequena margem. Retorna null se estiver vazio. */
export function trimCanvas(src: HTMLCanvasElement, pad = 4): HTMLCanvasElement | null {
  const ctx = src.getContext('2d');
  if (!ctx) return null;
  const { width, height } = src;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  const x0 = Math.max(0, minX - pad); const y0 = Math.max(0, minY - pad);
  const w = Math.min(width, maxX + pad + 1) - x0; const h = Math.min(height, maxY + pad + 1) - y0;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  out.getContext('2d')!.drawImage(src, x0, y0, w, h, 0, 0, w, h);
  return out;
}

/** Remove o fundo claro por limiar simples (pixels próximos do branco ficam transparentes; bordas suavizadas). */
export function removeWhiteBackground(canvas: HTMLCanvasElement, threshold = 235): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  const soft = Math.max(1, 255 - threshold);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.min(d[i], d[i + 1], d[i + 2]); // o canal mais escuro decide: branco puro = todos altos
    if (lum >= threshold) d[i + 3] = 0;
    else if (lum >= threshold - soft) d[i + 3] = Math.round(d[i + 3] * ((threshold - lum) / soft));
  }
  ctx.putImageData(img, 0, 0);
}

/** Reduz para no máximo SIGNATURE_MAX_WIDTH de largura mantendo a proporção. */
export function downscale(src: HTMLCanvasElement, maxW = SIGNATURE_MAX_WIDTH): HTMLCanvasElement {
  if (src.width <= maxW) return src;
  const out = document.createElement('canvas');
  out.width = maxW; out.height = Math.max(1, Math.round(src.height * (maxW / src.width)));
  const ctx = out.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, out.width, out.height);
  return out;
}

export const canvasToSignature = (c: HTMLCanvasElement): SignatureImage => ({ dataUrl: c.toDataURL('image/png'), width: c.width, height: c.height });

const loadImg = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const im = new Image();
  im.onload = () => resolve(im); im.onerror = () => reject(new Error('Imagem inválida'));
  im.src = url;
});

/** Imagem enviada (PNG/JPG até 300 KB) -> PNG recortado, sem fundo branco. */
export async function fileToSignature(file: File): Promise<SignatureImage> {
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) throw new Error('Envie uma imagem PNG ou JPG.');
  if (file.size > SIGNATURE_MAX_BYTES) throw new Error('A imagem deve ter no máximo 300 KB.');
  const url = URL.createObjectURL(file);
  try {
    const im = await loadImg(url);
    const c = document.createElement('canvas');
    c.width = im.naturalWidth; c.height = im.naturalHeight;
    if (c.width < 20 || c.height < 10) throw new Error('Imagem muito pequena.');
    c.getContext('2d')!.drawImage(im, 0, 0);
    removeWhiteBackground(c);
    const trimmed = trimCanvas(c);
    if (!trimmed) throw new Error('Não foi possível encontrar a assinatura na imagem (fundo todo claro).');
    return canvasToSignature(downscale(trimmed));
  } finally { URL.revokeObjectURL(url); }
}

export const SIGNATURE_FONTS = [
  { id: 'Caveat', label: 'Caveat', css: "'Caveat', cursive" },
  { id: 'Homemade Apple', label: 'Homemade Apple', css: "'Homemade Apple', cursive" },
] as const;

let fontsRequested = false;
/** Carrega as fontes manuscritas (Google Fonts) uma única vez. Falha silenciosa (usa cursive do sistema). */
export function ensureSignatureFonts(): void {
  if (fontsRequested || typeof document === 'undefined') return;
  fontsRequested = true;
  try {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Homemade+Apple&display=swap';
    document.head.appendChild(link);
  } catch { /* sem fontes: cursive do sistema */ }
}

/** Nome digitado em fonte manuscrita -> PNG transparente recortado. */
export async function typedNameToSignature(name: string, fontCss: string, color = '#1b2a4a'): Promise<SignatureImage> {
  const text = name.trim().slice(0, 60);
  if (!text) throw new Error('Digite o nome para gerar a assinatura.');
  ensureSignatureFonts();
  try { await (document as any).fonts?.load(`64px ${fontCss}`, text); } catch { /* ok */ }
  const size = 96;
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d')!;
  ctx.font = `${size}px ${fontCss}`;
  c.width = Math.ceil(ctx.measureText(text).width) + 40; c.height = size * 2;
  const g = c.getContext('2d')!;
  g.font = `${size}px ${fontCss}`; g.fillStyle = color; g.textBaseline = 'middle';
  g.fillText(text, 20, size);
  const trimmed = trimCanvas(c);
  if (!trimmed) throw new Error('Não foi possível gerar a assinatura.');
  return canvasToSignature(downscale(trimmed));
}

import { CUSTOM_ROLE_ICON_MAX_BYTES } from './types';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

export function validateRoleIconDataUrl(dataUrl: string): { ok: true } | { ok: false; error: string } {
  if (!dataUrl.startsWith('data:image/')) {
    return { ok: false, error: 'invalid_format' };
  }
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
  if (!match) return { ok: false, error: 'invalid_format' };
  const mime = match[1];
  if (!ALLOWED_MIME.has(mime)) {
    return { ok: false, error: 'invalid_mime' };
  }
  const base64 = match[2];
  const bytes = Math.ceil((base64.length * 3) / 4);
  if (bytes > CUSTOM_ROLE_ICON_MAX_BYTES) {
    return { ok: false, error: 'too_large' };
  }
  return { ok: true };
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('read_failed'));
    reader.readAsDataURL(file);
  });
}

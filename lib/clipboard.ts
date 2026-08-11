/** Discord Activity iframe blocks Clipboard API — prefer execCommand, then clipboard. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof document !== 'undefined') {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none';
      document.body.appendChild(el);
      el.focus();
      el.select();
      el.setSelectionRange(0, el.value.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) return true;
    } catch {
      /* fall through */
    }
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* ignore */
  }

  return false;
}

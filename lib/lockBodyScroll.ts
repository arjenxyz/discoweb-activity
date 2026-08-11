/**
 * Locks document scroll without layout shift.
 * Uses scrollbar-gutter when available; otherwise compensates with padding.
 * Nested callers are ref-counted.
 */

let lockCount = 0;
let previousHtmlOverflow = '';
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';
let previousCompensation = '';
let appliedCompensation = false;

function getScrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function supportsStableScrollbarGutter() {
  try {
    return typeof CSS !== 'undefined' && CSS.supports('scrollbar-gutter', 'stable');
  } catch {
    return false;
  }
}

export function lockBodyScroll(): () => void {
  if (typeof document === 'undefined') {
    return () => undefined;
  }

  if (lockCount === 0) {
    const scrollbarWidth = supportsStableScrollbarGutter() ? 0 : getScrollbarWidth();
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverflow = document.body.style.overflow;
    previousBodyPaddingRight = document.body.style.paddingRight;
    previousCompensation =
      document.documentElement.style.getPropertyValue('--scrollbar-compensation');
    appliedCompensation = false;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      const pad = `${scrollbarWidth}px`;
      document.body.style.paddingRight = pad;
      document.documentElement.style.setProperty('--scrollbar-compensation', pad);
      appliedCompensation = true;
    }
  }

  lockCount += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount > 0) return;

    document.documentElement.style.overflow = previousHtmlOverflow;
    document.body.style.overflow = previousBodyOverflow;
    document.body.style.paddingRight = previousBodyPaddingRight;

    if (appliedCompensation) {
      if (previousCompensation) {
        document.documentElement.style.setProperty('--scrollbar-compensation', previousCompensation);
      } else {
        document.documentElement.style.removeProperty('--scrollbar-compensation');
      }
    }
  };
}

'use client';

import { useEffect } from 'react';
import { bindGlobalUiClickSound } from '@/lib/uiClickSound';

/** Soft UI click SFX for dashboard interactive elements. */
export default function UiClickSound() {
  useEffect(() => bindGlobalUiClickSound(), []);
  return null;
}

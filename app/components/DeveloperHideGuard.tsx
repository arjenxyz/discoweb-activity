"use client";
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { apiUrl } from '@/lib/api';

export default function DeveloperHideGuard() {
  const pathname = usePathname();

  useEffect(() => {
    let styleEl: HTMLStyleElement | null = null;
    let mounted = true;

    const checkAndHide = async () => {
      if (!pathname || !pathname.startsWith('/developer')) return;
      try {
        const res = await fetch(apiUrl('/api/developer/check-access'), { credentials: 'include', cache: 'no-store' });
        if (mounted && !res.ok) {
          // Inject CSS to hide common global nav/header elements so menus are not visible
          styleEl = document.createElement('style');
          styleEl.setAttribute('data-dev-guard', 'true');
          styleEl.innerHTML = `
            header, nav, [role='navigation'], .CuteNavbar, .cutenav, .dashboard-header, .top-6, .fixed.top-0 {
              display: none !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }
          `;
          document.head.appendChild(styleEl);
        }
      } catch (e) {
        // On error, be conservative and hide nav as well
        if (mounted) {
          styleEl = document.createElement('style');
          styleEl.setAttribute('data-dev-guard', 'true');
          styleEl.innerHTML = `header, nav, [role='navigation'] { display: none !important; visibility: hidden !important; pointer-events: none !important; }`;
          document.head.appendChild(styleEl);
        }
      }
    };

    checkAndHide();

    return () => {
      mounted = false;
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    };
  }, [pathname]);

  return null;
}

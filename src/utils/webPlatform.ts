import { flushSync } from 'react-dom';

let polyfillsInitialized = false;

/**
 * Conditionally load Popover and Invoker Commands polyfills strictly when native
 * browser support is missing, per modern-web-guidance.
 */
export function initModernWebPolyfills(): void {
  if (polyfillsInitialized || typeof window === 'undefined') return;
  polyfillsInitialized = true;

  if (typeof HTMLElement !== 'undefined' && !Object.hasOwn(HTMLElement.prototype, 'popover')) {
    void import('@oddbird/popover-polyfill');
  }

  if (
    typeof HTMLButtonElement !== 'undefined' &&
    !('commandForElement' in HTMLButtonElement.prototype)
  ) {
    void import('invokers-polyfill');
  }
}

let supportsDisplayTransitionCache: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransitionCache !== undefined) {
    return supportsDisplayTransitionCache;
  }
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransitionCache = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransitionCache;
}

export function supportsTopLayerExit(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

/**
 * Smoothly close a native modal <dialog> with top-layer exit fallback for browsers
 * lacking discrete `display` / `overlay` transitions (e.g. Firefox / older Safari).
 */
export async function closeDialogAnimated(dialog: HTMLDialogElement | null): Promise<void> {
  if (!dialog || !dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 450)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }

  if (dialog.open) {
    dialog.close();
  }
}

/**
 * Light-dismiss fallback for <dialog closedby="any"> in browsers without native `closedBy`,
 * testing pointer coordinates against the dialog bounding box (or inner sheet box).
 */
export function handleDialogBackdropClick(
  event: React.MouseEvent<HTMLDialogElement>,
  dialog: HTMLDialogElement | null,
  onDismiss: () => void,
  innerPanel?: HTMLElement | null
): void {
  if (!dialog) return;

  if (innerPanel) {
    if (!innerPanel.contains(event.target as Node)) {
      onDismiss();
    }
    return;
  }

  // Only needed as fallback when native closedBy isn't handling backdrop clicks
  // or when we want animated close on backdrop tap
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  const isInside =
    rect.top <= event.clientY &&
    event.clientY <= rect.top + rect.height &&
    rect.left <= event.clientX &&
    event.clientX <= rect.left + rect.width;

  if (!isInside) {
    onDismiss();
  }
}

/**
 * Execute a Same-Document View Transition with progressive enhancement fallback
 * and MANDATORY programmatic focus routing after transition completion.
 */
export function runGalleryViewTransition(
  mutateState: () => void,
  options?: {
    focusSelector?: string;
    scrollToTop?: boolean;
    onFinished?: () => void;
  }
): void {
  const finishNavigation = () => {
    if (options?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
    if (options?.focusSelector) {
      const target = document.querySelector<HTMLElement>(options.focusSelector);
      target?.focus({ preventScroll: Boolean(options?.scrollToTop) });
    }
    options?.onFinished?.();
  };

  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  if (
    typeof document === 'undefined' ||
    !('startViewTransition' in document) ||
    prefersReduced
  ) {
    mutateState();
    requestAnimationFrame(finishNavigation);
    return;
  }

  const transition = (
    document as Document & {
      startViewTransition: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> };
    }
  ).startViewTransition(() => {
    flushSync(() => {
      mutateState();
    });
    if (options?.scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  });

  transition.finished.finally(() => {
    if (options?.focusSelector) {
      const target = document.querySelector<HTMLElement>(options.focusSelector);
      target?.focus({ preventScroll: true });
    }
    options?.onFinished?.();
  });
}

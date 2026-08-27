import { useEffect } from "react";

const focusableSelector = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function DialogAccessibilityManager() {
  useEffect(() => {
    let previousFocus: HTMLElement | null = null;
    let activeDialog: HTMLElement | null = null;
    const activate = (dialog: HTMLElement) => {
      if (dialog === activeDialog) return;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      activeDialog = dialog;
      if (!dialog.hasAttribute("tabindex")) dialog.tabIndex = -1;
      window.requestAnimationFrame(() => (dialog.querySelector<HTMLElement>(focusableSelector) ?? dialog).focus());
    };
    const scan = () => {
      const dialog = document.querySelector<HTMLElement>("[role='dialog'][aria-modal='true']");
      if (dialog) activate(dialog);
      else if (activeDialog) {
        activeDialog = null;
        previousFocus?.focus();
        previousFocus = null;
      }
    };
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeDialog) return;
      if (event.key === "Escape") {
        const close = activeDialog.querySelector<HTMLButtonElement>("button[aria-label='Kapat'], button[aria-label='Close']");
        if (close) { event.preventDefault(); close.click(); }
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...activeDialog.querySelectorAll<HTMLElement>(focusableSelector)].filter((item) => item.offsetParent !== null);
      if (!focusable.length) { event.preventDefault(); activeDialog.focus(); return; }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    scan();
    return () => { observer.disconnect(); document.removeEventListener("keydown", onKeyDown); };
  }, []);
  return null;
}

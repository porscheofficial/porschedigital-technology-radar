import { useEffect } from "react";

interface UseKeyboardShortcutOptions {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  onTrigger: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcut({
  key,
  meta = false,
  ctrl = false,
  onTrigger,
  enabled = true,
}: UseKeyboardShortcutOptions): void {
  useEffect(() => {
    if (!enabled) return;
    const targetKey = key.toLowerCase();
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== targetKey) return;
      const requireModifier = meta || ctrl;
      if (requireModifier) {
        const matched = (meta && event.metaKey) || (ctrl && event.ctrlKey);
        if (!matched) return;
      }
      event.preventDefault();
      onTrigger();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [key, meta, ctrl, onTrigger, enabled]);
}

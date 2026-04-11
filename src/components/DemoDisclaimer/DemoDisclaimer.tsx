import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./DemoDisclaimer.module.scss";

const STORAGE_KEY = "radar-disclaimer-dismissed";

export function DemoDisclaimer() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* empty — localStorage may be unavailable */
    }
  }, []);

  if (!visible) return null;

  return (
    <div className={cn(styles.disclaimer)} role="status">
      <p className={styles.message}>
        This technology radar is for{" "}
        <strong>visualization purposes only</strong> and does not represent
        actual technology usage at Porsche or Porsche Digital.
      </p>
      <button
        type="button"
        className={styles.close}
        onClick={dismiss}
        aria-label="Dismiss disclaimer"
      >
        ✕
      </button>
    </div>
  );
}

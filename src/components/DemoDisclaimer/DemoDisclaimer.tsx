import { PInlineNotification } from "@porsche-design-system/components-react/ssr";
import { useCallback, useEffect, useState } from "react";
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
    <PInlineNotification
      className={styles.disclaimer}
      state="warning"
      description="This technology radar is for visualization purposes only and does not represent actual technology usage at Porsche or Porsche Digital."
      dismissButton={true}
      onDismiss={dismiss}
    />
  );
}

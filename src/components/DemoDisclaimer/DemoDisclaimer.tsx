import { PIcon } from "@porsche-design-system/components-react/ssr";
import { useCallback, useEffect, useState } from "react";
import styles from "./DemoDisclaimer.module.scss";

const STORAGE_KEY = "radar-disclaimer-dismissed";
const GITHUB_URL =
  "https://github.com/porscheofficial/porschedigital-technology-radar";

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
    <div className={styles.disclaimer} role="status">
      <PIcon
        name="exclamation"
        size="small"
        className={styles.icon}
        aria-hidden="true"
      />
      <p className={styles.text}>
        This is a showcase based on the{" "}
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
          open-source technology radar
        </a>{" "}
        for visualization purposes and does not represent actual Porsche or
        Porsche Digital technology choices.
      </p>
      <button
        type="button"
        className={styles.closeButton}
        onClick={dismiss}
        aria-label="Dismiss"
      >
        <PIcon name="close" size="small" aria-hidden="true" />
      </button>
    </div>
  );
}

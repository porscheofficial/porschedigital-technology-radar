import { PIcon, PLinkPure } from "@porsche-design-system/components-react/ssr";
import { useCallback, useEffect, useState } from "react";
import { assetUrl } from "@/lib/utils";
import styles from "./DemoDisclaimer.module.scss";

const STORAGE_KEY = "radar-disclaimer-dismissed";
const ABOUT_PATH = "/help-and-about-tech-radar";

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
        name="information"
        size="small"
        className={styles.icon}
        aria-hidden="true"
      />
      <p className={styles.text}>
        Welcome! Live showcase of the open-source Technology Radar Generator.
        Try a different theme from the{" "}
        <strong>Spotlight command palette</strong>. More on the{" "}
        <PLinkPure
          href={assetUrl(ABOUT_PATH)}
          icon="none"
          alignLabel="start"
          stretch={false}
          underline={true}
          size="x-small"
          className={styles.link}
        >
          About page
        </PLinkPure>
        .
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

import { PIcon } from "@porsche-design-system/components-react/ssr";
import type { CSSProperties } from "react";

import { useTheme } from "@/lib/ThemeContext";
import { cn } from "@/lib/utils";
import styles from "./ThemeToggle.module.scss";

type Mode = "light" | "system" | "dark";

type Option = {
  mode: Mode;
  label: string;
  icon: "sun" | "laptop" | "moon";
};

const OPTIONS: readonly Option[] = [
  { mode: "light", label: "Light", icon: "sun" },
  { mode: "system", label: "System", icon: "laptop" },
  { mode: "dark", label: "Dark", icon: "moon" },
];

export function ThemeToggle() {
  const { theme, mode, setMode } = useTheme();

  if (theme.supports.length < 2) {
    return null;
  }

  const selectedIndex = OPTIONS.findIndex((option) => option.mode === mode);
  const indicatorStyle = {
    "--rtk-theme-toggle-index": selectedIndex,
  } as CSSProperties;

  return (
    <div className={cn(styles.group)}>
      <span
        aria-hidden="true"
        className={cn(styles.indicator)}
        style={indicatorStyle}
      />
      {OPTIONS.map((option) => {
        const isSelected = option.mode === mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={isSelected}
            aria-label={`Theme mode: ${option.label}`}
            className={cn(styles.button, isSelected && styles.selected)}
            onClick={() => setMode(option.mode)}
          >
            {/* color="inherit" — default "primary" ignores parent CSS color. */}
            <PIcon
              name={option.icon}
              size="small"
              color="inherit"
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}

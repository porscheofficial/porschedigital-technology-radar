import {
  Component,
  type ElementType,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import styles from "./SafeHtml.module.scss";

interface Props {
  html: string;
  as?: ElementType;
  className?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

class SafeHtmlBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("SafeHtml render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? null;
    }

    const { html, as: Tag = "div", className } = this.props;
    return (
      <Tag
        className={cn(styles.safeHtml, className)}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SafeHtml is the dedicated error boundary for HTML content
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
}

export { SafeHtmlBoundary as SafeHtml };

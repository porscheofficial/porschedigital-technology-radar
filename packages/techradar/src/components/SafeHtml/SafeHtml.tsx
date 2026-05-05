import { PLinkPure } from "@porsche-design-system/components-react/ssr";
import parse, {
  type DOMNode,
  domToReact,
  type HTMLReactParserOptions,
} from "html-react-parser";
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

// SafeHtml is the single rendering pipeline for all markdown-derived HTML
// (technology body, revision history, help-and-about). Every <a> in the parsed
// tree is rewritten to <PLinkPure> so internal AND external links share one
// visual contract with the structured PLinkPure list in ItemDetail (currentColor
// label, native PDS focus/hover box, optional external icon). The only
// per-link difference is the icon: target="_blank" gets icon="external", every
// other link gets icon="none". The error boundary keeps a malformed input from
// crashing the whole page.
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
    const options: HTMLReactParserOptions = {
      replace: (domNode) => {
        // Detect element nodes via duck-typing on `name` + `attribs` instead of
        // `instanceof Element` — bundler / pnpm hoisting can produce two copies
        // of `domhandler` and break the instanceof check at runtime even though
        // types line up at compile time.
        if (
          !("name" in domNode) ||
          !("attribs" in domNode) ||
          domNode.name !== "a"
        ) {
          return undefined;
        }
        const attribs = domNode.attribs as Record<string, string | undefined>;
        const href = attribs.href;
        if (!href) return undefined;
        const target = attribs.target;
        const rel = attribs.rel;
        const isExternal = target === "_blank";
        const children =
          "children" in domNode ? (domNode.children as DOMNode[]) : [];
        return (
          <PLinkPure
            href={href}
            target={target}
            rel={rel}
            icon={isExternal ? "external" : "none"}
            alignLabel="start"
            stretch={false}
            underline={true}
          >
            {domToReact(children, options)}
          </PLinkPure>
        );
      },
    };

    return (
      <Tag className={cn(styles.safeHtml, className)}>
        {parse(html, options)}
      </Tag>
    );
  }
}

export { SafeHtmlBoundary as SafeHtml };

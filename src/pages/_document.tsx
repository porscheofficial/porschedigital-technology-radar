import {
  getComponentChunkLinks,
  getDSRPonyfill,
  getFontFaceStyles,
  getFontLinks,
  getIconLinks,
  getInitialStyles,
  getMetaTagsAndIconLinks,
} from "@porsche-design-system/components-react/partials";
import { Head, Html, Main, NextScript } from "next/document";
import type { CSSProperties } from "react";
import {
  getBackgroundImage,
  getBackgroundOpacity,
  getColors,
  getLabel,
} from "@/lib/data";

function buildColorVariables(): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(getColors())) {
    vars[`--${key}`] = value;
  }
  const bgImage = getBackgroundImage();
  if (bgImage) {
    vars["--background-image"] = `url("${bgImage}")`;
    vars["--background-opacity"] = String(getBackgroundOpacity());
  } else {
    vars["--background-image"] = "none";
    vars["--background-opacity"] = "0";
  }
  return vars as CSSProperties;
}

export default function Document() {
  return (
    <Html lang="en" data-scroll-behavior="smooth" style={buildColorVariables()}>
      <Head>
        {getInitialStyles({ format: "jsx" })}
        {getFontFaceStyles({ format: "jsx" })}
        {getFontLinks({ format: "jsx", weights: ["regular", "semi-bold"] })}
        {getComponentChunkLinks({ format: "jsx" })}
        {getIconLinks({ format: "jsx" })}
        {getMetaTagsAndIconLinks({
          appTitle: getLabel("title"),
          format: "jsx",
        })}
      </Head>
      <body>
        <Main />
        <NextScript />
        {getDSRPonyfill({ format: "jsx" })}
      </body>
    </Html>
  );
}

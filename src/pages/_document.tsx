import { Head, Html, Main, NextScript } from "next/document";
import { CSSProperties, useMemo } from "react";

import { getColors } from "@/lib/data";
import {
  getComponentChunkLinks,
  getDSRPonyfill,
  getFontFaceStyles,
  getFontLinks,
  getIconLinks,
  getInitialStyles,
  getMetaTagsAndIconLinks,
} from "@porsche-design-system/components-react/partials";

export default function Document() {
  const style = useMemo(() => {
    const cssVariables: Record<string, any> = {};
    const colors = getColors();

    Object.entries(colors).forEach(([key, value]) => {
      cssVariables[`--${key}`] = value;
    });

    return cssVariables as CSSProperties;
  }, []);

  return (
    <Html lang="en" style={style}>
      <Head>
        {getInitialStyles({ format: "jsx" })}
        {getFontFaceStyles({ format: "jsx" })}
        {getFontLinks({ format: "jsx", weights: ["regular", "semi-bold"] })}
        {getComponentChunkLinks({ format: "jsx" })}
        {getIconLinks({ format: "jsx" })}
        {getMetaTagsAndIconLinks({
          appTitle: "Technology Radar",
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

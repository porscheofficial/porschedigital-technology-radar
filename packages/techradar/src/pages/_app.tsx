import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";

import { Layout, type LayoutClass } from "@/components/Layout/Layout";
import config from "@/lib/config";
import { getJsUrl } from "@/lib/data";
import { RadarHighlightProvider } from "@/lib/RadarHighlightContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import { getThemes } from "@/lib/themeManifest";
import "@porsche-design-system/components-react/index.css";
import "@/styles/_globals.scss";
import "@/styles/_hljs.css";
import "@/styles/custom.scss";
import { PorscheDesignSystemProvider } from "@porsche-design-system/components-react/ssr";

const themes = getThemes();

export type CustomPage<P = Record<string, never>, InitialProps = P> = NextPage<
  P,
  InitialProps
> & {
  layoutClass?: LayoutClass;
};

type CustomAppProps = AppProps & {
  // biome-ignore lint/style/useNamingConvention: mirrors Next.js AppProps.Component
  Component: CustomPage;
};

export default function App({ Component, pageProps }: CustomAppProps) {
  const jsUrl = getJsUrl();
  return (
    <ThemeProvider themes={themes} initialThemeId={config.defaultTheme}>
      <PorscheDesignSystemProvider>
        <RadarHighlightProvider>
          <Head>
            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />
          </Head>
          <Layout layoutClass={Component.layoutClass}>
            <Component {...pageProps} />
            {jsUrl && <Script src={jsUrl} />}
          </Layout>
        </RadarHighlightProvider>
      </PorscheDesignSystemProvider>
    </ThemeProvider>
  );
}

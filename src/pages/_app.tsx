import type { NextPage } from "next";
import type { AppProps } from "next/app";
import Head from "next/head";
import Script from "next/script";

import { Layout, type LayoutClass } from "@/components/Layout/Layout";
import { getJsUrl } from "@/lib/data";
import { formatTitle } from "@/lib/format";
import { RadarHighlightProvider } from "@/lib/RadarHighlightContext";
import "@/styles/_globals.scss";
import "@/styles/_hljs.css";
import "@/styles/custom.scss";
import { PorscheDesignSystemProvider } from "@porsche-design-system/components-react/ssr";

export type CustomPage<P = Record<string, never>, IP = P> = NextPage<P, IP> & {
  layoutClass?: LayoutClass;
};

type CustomAppProps = AppProps & {
  Component: CustomPage;
};

export default function App({ Component, pageProps }: CustomAppProps) {
  const jsUrl = getJsUrl();
  return (
    <PorscheDesignSystemProvider theme="dark">
      <RadarHighlightProvider>
        <Head>
          <title>{formatTitle()}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Layout layoutClass={Component.layoutClass}>
          <Component {...pageProps} />
          {jsUrl && <Script src={jsUrl} />}
        </Layout>
      </RadarHighlightProvider>
    </PorscheDesignSystemProvider>
  );
}

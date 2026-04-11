import Head from "next/head";
import { SafeHtml } from "@/components/SafeHtml/SafeHtml";
import { formatTitle } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";
import about from "../../data/about.json";

const HelpAndAbout: CustomPage = () => {
  return (
    <>
      <Head>
        <title>{formatTitle("Help and About")}</title>
      </Head>

      <SafeHtml html={about.body} />
    </>
  );
};

export default HelpAndAbout;

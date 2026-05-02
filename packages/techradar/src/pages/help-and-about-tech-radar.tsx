import { SafeHtml } from "@/components/SafeHtml/SafeHtml";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import { stripHtml, truncate } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";
import about from "../../data/about.json";

const HelpAndAbout: CustomPage = () => {
  const description = truncate(stripHtml(about.body), 200);

  return (
    <>
      <SeoHead
        title="Help & About"
        description={description}
        path="/help-and-about-tech-radar/"
      />

      <SafeHtml html={about.body} />
    </>
  );
};

export default HelpAndAbout;

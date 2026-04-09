import Head from "next/head";
import Link from "next/link";

import Search from "@/components/Icons/Search";
import { formatTitle } from "@/lib/format";
import { PHeading, PText } from "@porsche-design-system/components-react/ssr";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>{formatTitle("404 - Page Not Found")}</title>
      </Head>
      <div style={{ textAlign: "center", margin: "0 auto" }}>
        <Search width={150} style={{ display: "inline-block" }} />
        <PHeading size="xx-large" tag="h1">
          404 - Page Not Found
        </PHeading>
        <PText>
          <Link href="/">Return to homepage</Link>
        </PText>
      </div>
    </>
  );
}

import { PHeading, PText } from "@porsche-design-system/components-react/ssr";
import Head from "next/head";
import Link from "next/link";
import Search from "@/components/Icons/Search";
import { formatTitle } from "@/lib/format";
import styles from "./404.module.scss";

export default function Custom404() {
  return (
    <>
      <Head>
        <title>{formatTitle("404 - Page Not Found")}</title>
      </Head>
      <div className={styles.container}>
        <Search width={150} className={styles.icon} />
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

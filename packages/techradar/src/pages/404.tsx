import { PHeading, PText } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";
import Search from "@/components/Icons/Search";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import styles from "./404.module.scss";

export default function Custom404() {
  return (
    <>
      <SeoHead
        title="Not found"
        description="The requested technology radar page could not be found."
        path="/404/"
      />
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

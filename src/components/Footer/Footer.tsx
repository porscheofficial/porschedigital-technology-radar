import styles from "./Footer.module.scss";

import { SocialLinks } from "@/components/SocialLinks/SocialLinks";
import { getAppName, getImprintUrl, getLabel, getLogoUrl } from "@/lib/data";
import { PLink, PText } from "@porsche-design-system/components-react/ssr";

export function Footer() {
  const logoUrl = getLogoUrl();
  return (
    <div className={styles.footer}>
      <div className={styles.branding}>
        <img src={logoUrl} className={styles.logo} alt={getAppName()} />
        <PText className={styles.description}>{getLabel("footer")}</PText>
        <SocialLinks className={styles.socialLinks} />
      </div>
      <PLink
        href={getImprintUrl()}
        className={styles.imprint}
        target="_blank"
        variant="tertiary"
      >
        {getLabel("imprint")}
      </PLink>
    </div>
  );
}

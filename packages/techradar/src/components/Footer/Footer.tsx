import type { IconName } from "@porsche-design-system/components-react/ssr";
import {
  PLinkPure,
  PText,
  PWordmark,
} from "@porsche-design-system/components-react/ssr";
import {
  getFooterLogoUrl,
  getImprintUrl,
  getLabel,
  getSocialLinks,
} from "@/lib/data";
import styles from "./Footer.module.scss";

const pdsIconMap: Record<string, IconName> = {
  x: "logo-x",
  linkedin: "logo-linkedin",
  facebook: "logo-facebook",
  instagram: "logo-instagram",
  youtube: "logo-youtube",
  xing: "logo-xing",
  pinterest: "logo-pinterest",
};

const customIconSvg: Record<string, string> = {
  github:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 496 512'%3E%3Cpath d='M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6m-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3m44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9M244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8M97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1m-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7m32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1m-11.4-14.7c-1.6 1-1.6 3.6 0 5.9s4.3 3.3 5.6 2.3c1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2'/%3E%3C/svg%3E",
  gitlab:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 496 512'%3E%3Cpath d='m487.75 200.06-.7-1.78-67.5-176.19a17.63 17.63 0 0 0-6.95-8.37c-6.44-4-14.69-3.55-20.66 1.11a18.07 18.07 0 0 0-5.99 9.09l-45.58 139.46H155.79L110.2 23.93c-.99-3.59-3.09-6.78-5.99-9.12a18.08 18.08 0 0 0-20.66-1.11 17.8 17.8 0 0 0-6.95 8.37L8.96 198.18l-.67 1.78c-19.96 52.17-3.01 111.25 41.58 144.89l.23.18.62.44 102.84 77.01 50.88 38.51 30.99 23.4a20.84 20.84 0 0 0 25.21 0l30.99-23.4 50.88-38.51L445.97 345l.26-.21c44.49-33.64 61.41-92.62 41.53-144.73Z'/%3E%3C/svg%3E",
};

export function Footer() {
  const socialLinks = getSocialLinks();
  const imprintUrl = getImprintUrl();
  const footerLogoUrl = getFooterLogoUrl();
  const footerText = getLabel("footer");
  const imprintLabel = getLabel("imprint");

  return (
    <div className={styles.footer}>
      {socialLinks.length > 0 && (
        <div className={styles.social}>
          {socialLinks.map((link) => {
            const key = link.icon.toLowerCase();
            const pdsIcon = pdsIconMap[key];
            const customSvg = customIconSvg[key];

            if (!pdsIcon && !customSvg) return null;

            return (
              <PLinkPure
                key={link.href}
                href={link.href}
                {...(pdsIcon ? { icon: pdsIcon } : { iconSource: customSvg })}
                hideLabel={true}
                size="medium"
                target="_blank"
                className={styles.socialLink}
              >
                {link.icon}
              </PLinkPure>
            );
          })}
        </div>
      )}

      {footerLogoUrl ? (
        <img src={footerLogoUrl} alt="" className={styles.footerLogo} />
      ) : (
        <PWordmark className={styles.wordmark} />
      )}

      {footerText && (
        <PText size="xx-small" className={styles.description}>
          {footerText}
        </PText>
      )}

      {imprintUrl && (
        <ul className={styles.legal}>
          <li>
            <PLinkPure
              href={imprintUrl}
              icon="none"
              size="x-small"
              underline={true}
              target="_blank"
            >
              {imprintLabel}
            </PLinkPure>
          </li>
        </ul>
      )}
    </div>
  );
}

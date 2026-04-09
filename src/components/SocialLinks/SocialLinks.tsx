import styles from "./SocialLinks.module.scss";

import { SocialGitlab, SocialXing } from "@/components/Icons";
import { getSocialLinks } from "@/lib/data";
import { cn } from "@/lib/utils";
import { PIcon } from "@porsche-design-system/components-react/ssr";

interface SocialLinksProps {
  className?: string;
}

function renderIcon(name: string) {
  switch (name.toLowerCase()) {
    case "facebook":
      return (
        <PIcon name="logo-facebook" theme="light" className={styles.icon} />
      );
    case "github":
      return <SocialGitlab className={styles.icon} />;
    case "gitlab":
      return <SocialGitlab className={styles.icon} />;
    case "instagram":
      return (
        <PIcon name="logo-instagram" theme="light" className={styles.icon} />
      );
    case "linkedin":
      return (
        <PIcon name="logo-linkedin" theme="light" className={styles.icon} />
      );
    case "x":
      return (
        <PIcon name="logo-twitter" theme="light" className={styles.icon} />
      );
    case "xing":
      return <SocialXing className={styles.icon} />;
    case "youtube":
      return (
        <PIcon name="logo-youtube" theme="light" className={styles.icon} />
      );
    default:
      return null;
  }
}

export function SocialLinks({ className }: SocialLinksProps) {
  const links = getSocialLinks();
  return (
    <ul className={cn(styles.links, className)}>
      {links.map((link, i) => {
        const icon = renderIcon(link.icon);
        return (
          icon && (
            <li key={i}>
              <a
                href={link.href}
                className={styles.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                {icon}
              </a>
            </li>
          )
        );
      })}
    </ul>
  );
}

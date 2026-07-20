import { PIcon } from "@porsche-design-system/components-react/ssr";
import Link from "next/link";

import { Chip } from "@/components/Chip/Chip";
import { cn } from "@/lib/utils";
import styles from "./Products.module.scss";

type ProductProps = {
  product: string;
  compact?: boolean;
  href?: string;
};

export function Product({ product, compact, href }: ProductProps) {
  const badge = (
    <Chip
      kind="product"
      compact={compact}
      iconSlot={<PIcon name="stack" size="x-small" aria-hidden="true" />}
    >
      {product}
    </Chip>
  );

  if (href) {
    return (
      <Link href={href} className={cn(styles.product, styles.productLink)}>
        {badge}
      </Link>
    );
  }

  return <span className={cn(styles.product)}>{badge}</span>;
}

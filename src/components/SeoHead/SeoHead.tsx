import Head from "next/head";

import config from "@/lib/config";
import { getAbsoluteUrl } from "@/lib/data";
import { formatTitle, truncate } from "@/lib/format";

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}

export function SeoHead({
  title,
  description,
  path,
  image = "/og/default.png",
  type = "website",
}: SeoHeadProps) {
  const siteName = config.labels.title || "";
  const fullTitle = title === siteName ? title : formatTitle(title);
  const normalizedDescription = truncate(description.trim(), 200);
  const canonicalUrl = getAbsoluteUrl(path);
  const normalizedImage = image.startsWith("/") ? image : `/${image}`;
  const imageUrl = /^https?:\/\//.test(image)
    ? image
    : getAbsoluteUrl(normalizedImage);

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={normalizedDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={normalizedDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={normalizedDescription} />
      <meta name="twitter:image" content={imageUrl} />
    </Head>
  );
}

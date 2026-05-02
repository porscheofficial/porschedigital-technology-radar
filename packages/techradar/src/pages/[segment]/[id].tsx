import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import { getItem, getItems, getSegment } from "@/lib/data";
import { deriveSummary } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";

interface ItemPageProps {
  segmentId: string;
  itemId: string;
}

const ItemPage: CustomPage<ItemPageProps> = ({ segmentId, itemId }) => {
  const segment = getSegment(segmentId);
  const item = getItem(itemId);

  if (!segment || !item) return null;

  const description = deriveSummary(item);
  const image = item.ogImage || `/og/${segment.id}/${item.id}.png`;

  return (
    <>
      <SeoHead
        title={item.title}
        description={description}
        path={`/${segment.id}/${item.id}/`}
        image={image}
        type="article"
      />
      <Head>
        <meta property="article:section" content={segment.title} />
      </Head>

      <ItemDetail item={item} segmentTitle={segment.title} />
    </>
  );
};

export default ItemPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const items = getItems();
  const paths = items.map((item) => ({
    params: { segment: item.segment, id: item.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<ItemPageProps> = async ({
  params,
}) => {
  return {
    props: {
      segmentId: params?.segment as string,
      itemId: params?.id as string,
    },
  };
};

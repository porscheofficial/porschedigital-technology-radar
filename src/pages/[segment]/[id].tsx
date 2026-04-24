import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import { getItem, getItems, getQuadrant } from "@/lib/data";
import { deriveSummary } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";

interface ItemPageProps {
  quadrantId: string;
  itemId: string;
}

const ItemPage: CustomPage<ItemPageProps> = ({ quadrantId, itemId }) => {
  const quadrant = getQuadrant(quadrantId);
  const item = getItem(itemId);

  if (!quadrant || !item) return null;

  const description = deriveSummary(item);
  const image = item.ogImage || `/og/${quadrant.id}/${item.id}.png`;

  return (
    <>
      <SeoHead
        title={item.title}
        description={description}
        path={`/${quadrant.id}/${item.id}/`}
        image={image}
        type="article"
      />
      <Head>
        <meta property="article:section" content={quadrant.title} />
      </Head>

      <ItemDetail item={item} quadrantTitle={quadrant.title} />
    </>
  );
};

export default ItemPage;

export const getStaticPaths: GetStaticPaths = async () => {
  const items = getItems();
  const paths = items.map((item) => ({
    params: { quadrant: item.quadrant, id: item.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<ItemPageProps> = async ({
  params,
}) => {
  return {
    props: {
      quadrantId: params?.quadrant as string,
      itemId: params?.id as string,
    },
  };
};

import type { GetStaticPaths, GetStaticProps } from "next";
import Head from "next/head";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { getItem, getItems, getQuadrant } from "@/lib/data";
import { formatTitle } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";

interface ItemPageProps {
  quadrantId: string;
  itemId: string;
}

const ItemPage: CustomPage<ItemPageProps> = ({ quadrantId, itemId }) => {
  const quadrant = getQuadrant(quadrantId);
  const item = getItem(itemId);

  if (!quadrant || !item) return null;

  return (
    <>
      <Head>
        <title>{formatTitle(item.title, quadrant.title)}</title>
        <meta name="description" content={quadrant.description} />
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

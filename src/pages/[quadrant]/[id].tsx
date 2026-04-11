import Head from "next/head";
import { useRouter } from "next/router";

import { ItemDetail } from "@/components/ItemDetail/ItemDetail";
import { getItem, getItems, getQuadrant } from "@/lib/data";
import { formatTitle } from "@/lib/format";
import type { CustomPage } from "@/pages/_app";

const ItemPage: CustomPage = () => {
  const { query } = useRouter();
  const quadrant = getQuadrant(query.quadrant as string);
  const item = getItem(query.id as string);

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

export const getStaticPaths = async () => {
  const items = getItems();
  const paths = items.map((item) => ({
    params: { quadrant: item.quadrant, id: item.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps = async () => {
  return { props: {} };
};

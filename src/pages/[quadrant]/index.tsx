import Head from "next/head";
import { useRouter } from "next/router";
import { useMemo } from "react";

import { RingList } from "@/components/RingList/RingList";
import {
  getItems,
  getQuadrant,
  getQuadrants,
  sortByFeaturedAndTitle,
} from "@/lib/data";
import { formatTitle } from "@/lib/format";
import { CustomPage } from "@/pages/_app";
import { PHeading } from "@porsche-design-system/components-react/ssr";

const QuadrantPage: CustomPage = () => {
  const { query } = useRouter();
  const quadrant = getQuadrant(query.quadrant as string);
  const items = useMemo(
    () => quadrant?.id && getItems(quadrant.id).sort(sortByFeaturedAndTitle),
    [quadrant?.id],
  );
  if (!quadrant || !items) return null;

  return (
    <>
      <Head>
        <title>{formatTitle(quadrant.title)}</title>
        <meta name="description" content={quadrant.description} />
      </Head>

      <PHeading size="xx-large" tag="h1">
        {quadrant.title}
      </PHeading>
      <PHeading size="large" tag="h2">
        {quadrant.description}
      </PHeading>

      <RingList items={items} />
    </>
  );
};

export default QuadrantPage;

export const getStaticPaths = async () => {
  const quadrants = getQuadrants();
  const paths = quadrants.map((quadrant) => ({
    params: { quadrant: quadrant.id },
  }));

  return { paths, fallback: false };
};

export const getStaticProps = async () => {
  return { props: {} };
};

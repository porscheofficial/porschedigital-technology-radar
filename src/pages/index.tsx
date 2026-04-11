import Head from "next/head";

import { Radar } from "@/components/Radar/Radar";
import { RadarFilters } from "@/components/RadarFilters/RadarFilters";
import {
  getChartConfig,
  getItems,
  getLabel,
  getQuadrants,
  getRings,
  getToggle,
} from "@/lib/data";
import type { CustomPage } from "@/pages/_app";

const Home: CustomPage = () => {
  const metaDescription = getLabel("metaDescription");
  const chartConfig = getChartConfig();
  const rings = getRings();
  const quadrants = getQuadrants();
  const items = getItems(undefined, true);

  return (
    <>
      <Head>
        {metaDescription && (
          <meta name="description" content={metaDescription} />
        )}
      </Head>

      {getToggle("showChart") && (
        <>
          <Radar
            size={chartConfig.size}
            quadrants={quadrants}
            rings={rings}
            items={items}
          />
          <RadarFilters />
        </>
      )}
    </>
  );
};

export default Home;

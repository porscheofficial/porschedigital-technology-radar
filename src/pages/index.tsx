import { DemoDisclaimer } from "@/components/DemoDisclaimer/DemoDisclaimer";
import { MobileQuadrantNav } from "@/components/MobileQuadrantNav/MobileQuadrantNav";
import { Radar } from "@/components/Radar/Radar";
import { RadarFilters } from "@/components/RadarFilters/RadarFilters";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import {
  getChartConfig,
  getItems,
  getLabel,
  getQuadrants,
  getRings,
  getToggle,
} from "@/lib/data";
import type { CustomPage } from "@/pages/_app";

import styles from "./index.module.scss";

const Home: CustomPage = () => {
  const title = getLabel("title");
  const metaDescription = getLabel("tagline") || getLabel("metaDescription");
  const chartConfig = getChartConfig();
  const rings = getRings();
  const quadrants = getQuadrants();
  const items = getItems(undefined, true);

  return (
    <>
      <SeoHead title={title} description={metaDescription || title} path="/" />

      {getToggle("showDemoDisclaimer") && <DemoDisclaimer />}

      {getToggle("showChart") && (
        <>
          <MobileQuadrantNav quadrants={quadrants} />
          <div className={styles.desktopRadar}>
            <Radar
              size={chartConfig.size}
              quadrants={quadrants}
              rings={rings}
              items={items}
            />
            <RadarFilters />
          </div>
        </>
      )}
    </>
  );
};

export default Home;

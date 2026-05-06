import { DemoDisclaimer } from "@/components/DemoDisclaimer/DemoDisclaimer";
import { MobileSegmentNav } from "@/components/MobileSegmentNav/MobileSegmentNav";
import { Radar } from "@/components/Radar/Radar";
import { RadarFilters } from "@/components/RadarFilters/RadarFilters";
import { SeoHead } from "@/components/SeoHead/SeoHead";
import {
  getChartConfig,
  getItems,
  getLabel,
  getRings,
  getSegments,
  getToggle,
} from "@/lib/data";
import type { CustomPage } from "@/pages/_app";

import styles from "./index.module.scss";

const Home: CustomPage = () => {
  const title = getLabel("title");
  const metaDescription = getLabel("tagline") || getLabel("metaDescription");
  const chartConfig = getChartConfig();
  const rings = getRings();
  const segments = getSegments();
  const items = getItems(undefined, true);

  return (
    <>
      <SeoHead title={title} description={metaDescription || title} path="/" />

      {getToggle("showDemoDisclaimer") && <DemoDisclaimer />}

      {getToggle("showChart") && (
        <>
          <MobileSegmentNav segments={segments} items={items} rings={rings} />
          <div className={styles.desktopRadar}>
            <Radar
              size={chartConfig.size}
              segments={segments}
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

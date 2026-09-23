// Decoration for the Home / Dashboard screen, and only that screen.
//
// Every piece is a PNG from public/assets/menus/home/ (see the README there),
// each named for its slot below. Home.tsx is the only importer; the other
// screens have their own compositions.

const BASE = `${import.meta.env.BASE_URL}assets/menus/home/`;

export const HOME_DECOR = {
  oliveSmall: `${BASE}01_olive_branch_small.png`,
  columnTilted: `${BASE}02_ionic_column_top.png`,
  oliveMid: `${BASE}03_olive_branch_upper_mid.png`,
  spark: `${BASE}04_spark_accent.png`,
  oliveRight: `${BASE}05_olive_branch_right.png`,
  blobWarm: `${BASE}06_pastel_blob_pink_yellow.png`,
  clouds: `${BASE}08_clouds_lilac_yellow.png`,
  columnWithOlive: `${BASE}09_ionic_column_with_olive.png`,
  lilacBranch: `${BASE}10_lilac_branch.png`,
  blobCool: `${BASE}11_pastel_blob_lilac_yellow_large.png`,
  parthenon: `${BASE}12_parthenon_hill_bottom_right.png`,
} as const;

export type HomeDecorSlot = keyof typeof HOME_DECOR;

/** One decorative piece: empty alt, aria-hidden, never draggable or a click
 * target, and .hs-deco so the square theme hides it. */
export function HomeDecorImg({ slot, className }: { slot: HomeDecorSlot; className: string }) {
  return (
    <img
      src={HOME_DECOR[slot]}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
      className={`hs-deco greek ${className}`}
    />
  );
}

/** The scene around the dashboard: washes in the corners, a tilted column and
 * branches in the left gutter beside the sidebar, branch and clouds upper
 * right, the Parthenon on its hill lower right, a column with olive leaves
 * lower left. Deliberately uneven, as in the reference. */
export function HomeFrame() {
  return (
    <div className="hs-deco home-decor" aria-hidden="true">
      <HomeDecorImg slot="blobWarm" className="hm-wash hw-tl" />
      <HomeDecorImg slot="blobCool" className="hm-wash hw-tr" />
      <HomeDecorImg slot="blobCool" className="hm-wash hw-bl" />
      <HomeDecorImg slot="blobWarm" className="hm-wash hw-br" />
      <HomeDecorImg slot="oliveSmall" className="hm hm-olive-top" />
      <HomeDecorImg slot="columnTilted" className="hm hm-column-tilt" />
      <HomeDecorImg slot="spark" className="hm hm-spark-hero" />
      <HomeDecorImg slot="spark" className="hm hm-spark-quiz" />
      <HomeDecorImg slot="oliveMid" className="hm hm-olive-mid" />
      <HomeDecorImg slot="columnWithOlive" className="hm hm-column-olive" />
      <HomeDecorImg slot="oliveRight" className="hm hm-olive-right" />
      <HomeDecorImg slot="clouds" className="hm hm-clouds" />
      <HomeDecorImg slot="spark" className="hm hm-spark-right" />
      <HomeDecorImg slot="parthenon" className="hm hm-parthenon" />
    </div>
  );
}

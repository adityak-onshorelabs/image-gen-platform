/** Template format presets (FRD §6). value = "WxH"; grouped for the picker. */
export type Preset = { label: string; width: number; height: number };

export const PRESET_GROUPS: { group: string; presets: Preset[] }[] = [
  {
    group: "Social Media",
    presets: [
      { label: "LinkedIn Carousel", width: 1080, height: 1080 },
      { label: "LinkedIn Post", width: 1200, height: 1200 },
      { label: "Instagram Square", width: 1080, height: 1080 },
      { label: "Instagram Portrait", width: 1080, height: 1350 },
      { label: "Instagram Landscape", width: 1080, height: 566 },
      { label: "X Post", width: 1600, height: 900 },
      { label: "Open Graph", width: 1200, height: 630 },
      { label: "Pinterest", width: 1000, height: 1500 },
      { label: "Pinterest Tall", width: 1000, height: 2100 },
      { label: "Youtube Thumbnail", width: 1280, height: 720 },
    ],
  },
  {
    group: "Ads",
    presets: [
      { label: "Facebook Ad", width: 1080, height: 1080 },
      { label: "Medium Rectangle", width: 300, height: 250 },
      { label: "Large Rectangle", width: 336, height: 280 },
      { label: "Wide Skyscraper", width: 160, height: 600 },
      { label: "Leaderboard", width: 728, height: 90 },
      { label: "Mobile Banner", width: 320, height: 50 },
    ],
  },
];

export const ALL_PRESETS = PRESET_GROUPS.flatMap((g) => g.presets);

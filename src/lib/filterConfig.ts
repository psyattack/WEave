/**
 * Mirror of the original Python `domain/config/workshop_filter_config.py`.
 * Used by both the Workshop and Installed filter bars so the option lists
 * stay 1:1 with the PyQt6 build the user is comparing against.
 */

export const SORT_KEYS = [
  "trend",
  "mostrecent",
  "lastupdated",
  "totaluniquesubscribers",
] as const;
export type WorkshopSortKey = (typeof SORT_KEYS)[number];

export const SORT_OPTIONS: Record<WorkshopSortKey, string> = {
  trend: "Popular",
  mostrecent: "Most Recent",
  lastupdated: "Recently Updated",
  totaluniquesubscribers: "Most Subscribed",
};

export const TIME_PERIOD_KEYS = [
  "1",
  "7",
  "30",
  "90",
  "180",
  "365",
  "-1",
] as const;
export type TimePeriodKey = (typeof TIME_PERIOD_KEYS)[number];
export const TIME_PERIODS: Record<TimePeriodKey, string> = {
  "1": "Today",
  "7": "This Week",
  "30": "This Month",
  "90": "3 Months",
  "180": "6 Months",
  "365": "This Year",
  "-1": "All Time",
};

export const LOCAL_SORT_KEYS = [
  "install_date",
  "name",
  "rating",
  "size",
  "posted_date",
  "updated_date",
] as const;
export type LocalSortKey = (typeof LOCAL_SORT_KEYS)[number];

export const LOCAL_SORT_OPTIONS: Record<LocalSortKey, string> = {
  install_date: "Install Date",
  name: "Name",
  rating: "Rating",
  size: "Size",
  posted_date: "Posted Date",
  updated_date: "Updated Date",
};

export const CATEGORY_KEYS = ["", "Wallpaper", "Preset", "Asset"] as const;
export const CATEGORIES: Record<string, string> = {
  "": "All",
  Wallpaper: "Wallpaper",
  Preset: "Preset",
  Asset: "Asset",
};

export const TYPE_KEYS = ["", "Scene", "Video", "Application", "Web"] as const;
export const TYPES: Record<string, string> = {
  "": "Any",
  Scene: "Scene",
  Video: "Video",
  Application: "Application",
  Web: "Web",
};

export const AGE_RATING_KEYS = [
  "",
  "Everyone",
  "Questionable",
  "Mature",
] as const;
export const AGE_RATINGS: Record<string, string> = {
  "": "Any",
  Everyone: "Everyone",
  Questionable: "Questionable",
  Mature: "Mature",
};

export const RESOLUTION_KEYS = [
  "",
  "1920 x 1080",
  "2560 x 1440",
  "3840 x 2160",
  "1280 x 720",
  "1366 x 768",
  "Ultrawide 2560 x 1080",
  "Ultrawide 3440 x 1440",
  "Portrait 1080 x 1920",
  "Dynamic resolution",
  "Other resolution",
] as const;
export const RESOLUTIONS: Record<string, string> = {
  "": "Any",
  "1920 x 1080": "1080p",
  "2560 x 1440": "1440p",
  "3840 x 2160": "4K",
  "1280 x 720": "720p",
  "1366 x 768": "768p",
  "Ultrawide 2560 x 1080": "UW 1080p",
  "Ultrawide 3440 x 1440": "UW 1440p",
  "Portrait 1080 x 1920": "Portrait 1080p",
  "Dynamic resolution": "Dynamic",
  "Other resolution": "Other",
};

export const MISC_TAG_KEYS = [
  "Approved",
  "Audio responsive",
  "3D",
  "Customizable",
  "Puppet Warp",
  "HDR",
  "Media Integration",
  "User Shortcut",
  "Video Texture",
  "Asset Pack",
] as const;

export const MISC_TAGS = [...MISC_TAG_KEYS];

export const GENRE_TAG_KEYS = [
  "Abstract",
  "Animal",
  "Anime",
  "Cartoon",
  "CGI",
  "Cyberpunk",
  "Fantasy",
  "Game",
  "Girls",
  "Guys",
  "Landscape",
  "Medieval",
  "Memes",
  "MMD",
  "Music",
  "Nature",
  "Pixel art",
  "Relaxing",
  "Retro",
  "Sci-Fi",
  "Sports",
  "Technology",
  "Television",
  "Vehicle",
  "Unspecified",
] as const;

export const GENRE_TAGS = [...GENRE_TAG_KEYS];

export const ASSET_TYPE_KEYS = [
  "",
  "Particle",
  "Image",
  "Sound",
  "Model",
  "Text",
  "Sprite",
  "Fullscreen",
  "Composite",
  "Script",
  "Effect",
] as const;
export type AssetTypeKey = (typeof ASSET_TYPE_KEYS)[number];
export const ASSET_TYPES: Record<AssetTypeKey, string> = {
  "": "Any",
  Particle: "Particle",
  Image: "Image",
  Sound: "Sound",
  Model: "Model",
  Text: "Text",
  Sprite: "Sprite",
  Fullscreen: "Fullscreen",
  Composite: "Composite",
  Script: "Script",
  Effect: "Effect",
};

export const ASSET_GENRE_KEYS = [
  "",
  "Audio Visualizer",
  "Background",
  "Character",
  "Clock",
  "Fire",
  "Interactive",
  "Magic",
  "Post Processing",
  "Smoke",
  "Space",
] as const;
export type AssetGenreKey = (typeof ASSET_GENRE_KEYS)[number];
export const ASSET_GENRES: Record<AssetGenreKey, string> = {
  "": "Any",
  "Audio Visualizer": "Audio Visualizer",
  Background: "Background",
  Character: "Character",
  Clock: "Clock",
  Fire: "Fire",
  Interactive: "Interactive",
  Magic: "Magic",
  "Post Processing": "Post Processing",
  Smoke: "Smoke",
  Space: "Space",
};

export const SCRIPT_TYPE_KEYS = [
  "",
  "Boolean",
  "Number",
  "Vec2",
  "Vec3",
  "Vec4",
  "String",
  "No Animation",
  "Oversized",
] as const;
export type ScriptTypeKey = (typeof SCRIPT_TYPE_KEYS)[number];
export const SCRIPT_TYPES: Record<ScriptTypeKey, string> = {
  "": "Any",
  Boolean: "Boolean",
  Number: "Number",
  Vec2: "Vec2",
  Vec3: "Vec3",
  Vec4: "Vec4",
  String: "String",
  "No Animation": "No Animation",
  Oversized: "Oversized",
};

export const REQUIRED_FLAG_OPTIONS = [
  { value: "notags:exclusive_content", label: "Exclude NSFW" },
] as const;

export function toSelectOptions<T extends string>(
  keys: readonly T[],
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return keys.map((value) => ({ value, label: labels[value] }));
}

/**
 * Translates select options using i18n.
 * @param keys - Array of option keys
 * @param labels - Fallback labels for each key
 * @param i18nPrefix - i18n key prefix (e.g., "filters.category")
 * @param i18n - i18n instance with .t() method
 */
export function toSelectOptionsI18n<T extends string>(
  keys: readonly T[],
  labels: Record<T, string>,
  i18nPrefix: string,
  i18n: any,
): { value: T; label: string }[] {
  return keys.map((value) => ({
    value,
    label: i18n.t(`${i18nPrefix}.${value || "empty"}`, {
      defaultValue: labels[value],
    }),
  }));
}

/**
 * Translates a tag using i18n.
 * @param tag - Tag to translate
 * @param i18nPrefix - i18n key prefix (e.g., "filters.misc_tags")
 * @param i18n - i18n instance with .t() method
 */
export function translateTag(
  tag: string,
  i18nPrefix: string,
  i18n: any,
): string {
  return i18n.t(`${i18nPrefix}.${tag}`, { defaultValue: tag });
}

/**
 * Maps Steam Workshop tag-category labels (as scraped by the Rust parser)
 * to the `filters.*` i18n prefix that holds translations for their values.
 */
const TAG_CATEGORY_PREFIX: Record<string, string> = {
  Genre: "filters.genre_tags",
  Miscellaneous: "filters.misc_tags",
  Misc: "filters.misc_tags",
  Type: "filters.type",
  Category: "filters.category",
  Resolution: "filters.resolution",
  "Age Rating": "filters.age_rating",
  "Asset Type": "filters.asset_type",
  "Asset Genre": "filters.asset_genre",
  "Script Type": "filters.script_type",
};

/**
 * Prefixes to probe when a tag has no known category (e.g. installed
 * wallpapers expose flat string tags without a category label).
 */
const FALLBACK_TAG_PREFIXES = [
  "filters.genre_tags",
  "filters.misc_tags",
  "filters.type",
  "filters.resolution",
  "filters.age_rating",
  "filters.asset_type",
  "filters.asset_genre",
  "filters.script_type",
  "filters.category",
] as const;

function tagKeyForPrefix(value: string, prefix: string): string {
  // Resolution keys store spaces as underscores ("1920_x_1080").
  return prefix === "filters.resolution" ? value.replace(/ /g, "_") : value;
}

/**
 * Translates a single tag *value*, given the category it belongs to. When the
 * category is unknown we probe the common filter prefixes so flat installed
 * tags still get localized. Falls back to the original value when no match.
 */
export function translateTagValue(
  value: string,
  category: string,
  i18n: any,
): string {
  const known = TAG_CATEGORY_PREFIX[category];
  const prefixes = known ? [known] : FALLBACK_TAG_PREFIXES;
  for (const prefix of prefixes) {
    const full = `${prefix}.${tagKeyForPrefix(value, prefix)}`;
    if (i18n.exists(full)) return i18n.t(full);
  }
  return value;
}

/**
 * Translates a tag *category* header (e.g. "Genre", "Age Rating") using the
 * `tag_categories.*` namespace. Falls back to the original label.
 */
export function translateTagCategory(category: string, i18n: any): string {
  return i18n.t(`tag_categories.${category}`, { defaultValue: category });
}

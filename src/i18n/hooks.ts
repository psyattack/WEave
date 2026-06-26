import { useTranslation as useI18nextTranslation } from "react-i18next";
import type { i18n as I18n } from "i18next";
import type { TranslationKey, InterpolationParams } from "./types";
import i18n from "./index";

/**
 * Type-safe wrapper around useTranslation hook.
 * Provides autocomplete for translation keys and enforces interpolation params.
 */
export function useTranslation(): {
  t: <K extends TranslationKey>(
    key: K,
    ...args: InterpolationParams<K> extends void ? [] : [InterpolationParams<K>]
  ) => string;
  i18n: I18n;
} {
  const { t: originalT, i18n } = useI18nextTranslation();

  // Type-safe translation function
  const t = <K extends TranslationKey>(
    key: K,
    ...args: InterpolationParams<K> extends void ? [] : [InterpolationParams<K>]
  ): string => {
    const params = args[0];
    return String(originalT(key, params as never));
  };

  return { t, i18n };
}

/**
 * Get translation asynchronously outside of React components.
 * Use sparingly - prefer useTranslation hook in components.
 */
export async function translate<K extends TranslationKey>(
  key: K,
  ...args: InterpolationParams<K> extends void ? [] : [InterpolationParams<K>]
): Promise<string> {
  const params = args[0];
  return String(i18n.t(key, params as never));
}

// Type definitions for i18next with type-safety
import type en from "./locales/en";

// Extract translation keys from the English locale (source of truth)
type TranslationKeys = typeof en;

// Helper type to create dot-notation paths from nested objects
type PathImpl<T, Key extends keyof T> = Key extends string
  ? T[Key] extends Record<string, unknown>
    ?
        | `${Key}.${PathImpl<T[Key], Exclude<keyof T[Key], keyof unknown[]>> &
            string}`
        | `${Key}`
    : `${Key}`
  : never;

type Path<T> = PathImpl<T, keyof T> | keyof T;

// All valid translation keys as dot-notation strings
export type TranslationKey = Path<TranslationKeys>;

// Type for values at specific translation keys
type ValueAtPath<
  T,
  P extends string,
> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? ValueAtPath<T[Key], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// Extract interpolation variables from translation strings
type ExtractInterpolation<S extends string> =
  S extends `${string}{{${infer Var}}}${infer Rest}`
    ? Var | ExtractInterpolation<Rest>
    : never;

// Get required interpolation parameters for a translation key
export type InterpolationParams<K extends TranslationKey> =
  ValueAtPath<TranslationKeys, K> extends string
    ? ExtractInterpolation<ValueAtPath<TranslationKeys, K>> extends never
      ? void
      : Record<ExtractInterpolation<ValueAtPath<TranslationKeys, K>>, string | number>
    : void;

declare module "i18next" {
  interface CustomTypeOptions {
    resources: {
      translation: TranslationKeys;
    };
    returnNull: false;
  }
}

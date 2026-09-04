import { reactive, computed } from 'vue';
import en from './locales/en';
import bn from './locales/bn';

/**
 * AgriSphere localisation.
 *
 * English is the default and the source of truth: every key exists in en.js,
 * and bn.js is a translation layer on top of it. If a Bangla string is missing
 * the English one is used, so the UI never shows a raw key.
 *
 * "AgriSphere" is a product name and is deliberately never translated.
 */

const STORAGE_KEY = 'agrisphere-lang';

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English', shortLabel: 'EN', nativeLabel: 'English' },
  { code: 'bn', label: 'Bangla', shortLabel: 'বাং', nativeLabel: 'বাংলা' },
];

const MESSAGES = { en, bn };

function readStored() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'en' || saved === 'bn' ? saved : 'en';
}

export const localeState = reactive({
  locale: readStored(),
});

export const currentLocale = computed(() => localeState.locale);
export const isBangla = computed(() => localeState.locale === 'bn');

/** Walks a dotted key path ("nav.dashboard") through a message object. */
function lookup(dictionary, key) {
  let node = dictionary;
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return typeof node === 'string' ? node : undefined;
}

/** Replaces {name} placeholders with the matching value. */
function interpolate(template, params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    params[name] === undefined || params[name] === null ? match : String(params[name])
  );
}

/**
 * Translate a key. Falls back to English, then to the key itself so a missing
 * string is obvious in development rather than rendering as an empty node.
 */
export function t(key, params) {
  if (!key) return '';
  const active = MESSAGES[localeState.locale] || en;
  const value = lookup(active, key) ?? lookup(en, key);
  if (value === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] Missing translation key: ${key}`);
    return key;
  }
  return interpolate(value, params);
}

/**
 * Picks the right field off an object that carries both languages, e.g.
 * { en: 'Rice', bn: 'ধান' }. Used for server-supplied content such as crop
 * names and advisory text.
 */
export function tf(bilingual, fallback = '') {
  if (!bilingual) return fallback;
  if (typeof bilingual === 'string') return bilingual;
  return bilingual[localeState.locale] || bilingual.en || fallback;
}

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Converts Western digits in a string to Bangla digits. */
export function toBanglaDigits(input) {
  return String(input).replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

/**
 * Formats a number for display. Bangla users see Bangla numerals, which is
 * what printed agricultural material in Bangladesh uses.
 */
export function n(value, options = {}) {
  if (value === null || value === undefined || value === '') return '';
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  const formatted = new Intl.NumberFormat('en-US', options).format(num);
  return localeState.locale === 'bn' ? toBanglaDigits(formatted) : formatted;
}

/** Formats a date. Falls back to the raw value if it cannot be parsed. */
export function d(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const locale = localeState.locale === 'bn' ? 'bn-BD' : 'en-GB';
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }
}

/** Weekday label for forecast strips ("Mon" / "সোম"). */
export function weekday(value, style = 'short') {
  return d(value, { weekday: style });
}

function applyDocumentLocale() {
  const root = document.documentElement;
  root.setAttribute('lang', localeState.locale === 'bn' ? 'bn' : 'en');
  // data-lang drives the Bangla typography adjustments in theme.css
  root.setAttribute('data-lang', localeState.locale);
}

/**
 * Switches language. This only swaps the string layer — no navigation and no
 * data reload — so the user keeps whatever they were in the middle of doing.
 */
export function setLocale(code) {
  if (!MESSAGES[code]) return;
  localeState.locale = code;
  localStorage.setItem(STORAGE_KEY, code);
  applyDocumentLocale();
}

export function toggleLocale() {
  setLocale(localeState.locale === 'bn' ? 'en' : 'bn');
}

applyDocumentLocale();

/**
 * Composable form so templates can write {{ t('nav.home') }} without importing
 * each helper separately.
 */
export function useI18n() {
  return { t, tf, n, d, weekday, locale: currentLocale, isBangla, setLocale, toggleLocale };
}

export default { t, tf, n, d, setLocale };

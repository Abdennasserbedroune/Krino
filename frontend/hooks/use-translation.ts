// Thin re-export so all components import from one predictable place.
// Usage:  import { useLanguage } from '@/hooks/use-translation';
export { useLanguage } from "@/lib/i18n/LanguageContext";
export type { Locale } from "@/lib/i18n/translations";

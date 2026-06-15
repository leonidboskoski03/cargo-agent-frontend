import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import bg from "./locales/bg.json";
import bs from "./locales/bs.json";
import en from "./locales/en.json";
import hr from "./locales/hr.json";
import mk from "./locales/mk.json";
import ro from "./locales/ro.json";
import sq from "./locales/sq.json";
import sr from "./locales/sr.json";
import tr from "./locales/tr.json";

export const supportedLanguages = ["en", "mk", "sr", "tr", "sq", "bg", "hr", "ro", "bs"] as const;
export const languageStorageKey = "cargo-agent-language";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    detection: {
      caches: ["localStorage"],
      lookupLocalStorage: languageStorageKey,
      order: ["localStorage", "navigator"],
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      bg: { translation: bg },
      bs: { translation: bs },
      en: { translation: en },
      hr: { translation: hr },
      mk: { translation: mk },
      ro: { translation: ro },
      sq: { translation: sq },
      sr: { translation: sr },
      tr: { translation: tr },
    },
    supportedLngs: supportedLanguages,
  });

export default i18n;

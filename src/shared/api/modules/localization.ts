import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type SupportedLanguage = {
  code: string;
  label: string;
  nativeName: string;
};

export const fallbackLanguages: SupportedLanguage[] = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "mk", label: "Macedonian", nativeName: "Македонски" },
];

export function listSupportedLanguages() {
  return unwrapData<SupportedLanguage[]>(apiClient.get("/localization/languages"));
}

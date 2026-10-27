"use client";

import React, { createContext, useContext, useSyncExternalStore } from "react";
import { translations } from "@/lib/i18n";

const LanguageContext = createContext({
  language: "id",
  setLanguage: () => {},
  t: translations.id,
});

function subscribe(callback) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener("calapos_language_change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("calapos_language_change", callback);
  };
}

function getSnapshot() {
  try {
    const val = localStorage.getItem("calapos_language");
    return val === "en" ? "en" : "id";
  } catch {
    return "id";
  }
}

function getServerSnapshot() {
  return "id";
}

export function LanguageProvider({ children }) {
  const language = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLanguage = (lang) => {
    if (lang !== "id" && lang !== "en") return;
    try {
      localStorage.setItem("calapos_language", lang);
      window.dispatchEvent(new Event("calapos_language_change"));
    } catch {
      // Ignore
    }
  };

  const t = translations[language] || translations.id;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

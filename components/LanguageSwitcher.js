"use client";

import React from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { IconGlobe } from "@/components/Icons";

export default function LanguageSwitcher({ className = "" }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-slate-200 bg-white p-1 text-xs font-semibold shadow-xs ${className}`}
      role="group"
      aria-label="Language Switcher"
    >
      <div className="flex items-center pl-1.5 pr-1 text-slate-400">
        <IconGlobe className="h-3.5 w-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage("id")}
        className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
          language === "id"
            ? "bg-slate-900 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        }`}
        title="Bahasa Indonesia"
      >
        ID
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-lg px-2 py-1 text-xs font-bold transition ${
          language === "en"
            ? "bg-slate-900 text-white shadow-xs"
            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}

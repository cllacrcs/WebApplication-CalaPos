"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import {
  IconDashboard,
  IconCashier,
  IconProducts,
  IconHistory,
  IconReports,
  IconExpenses,
  IconMenu,
  IconClose,
} from "@/components/Icons";

export default function AppLayout({ children, activePage, title, subtitle }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { t } = useLanguage();

  const navigationItems = [
    {
      id: "dashboard",
      href: "/",
      label: t.nav.dashboard,
      icon: IconDashboard,
    },
    {
      id: "cashier",
      href: "/kasir",
      label: t.nav.cashier,
      icon: IconCashier,
    },
    {
      id: "products",
      href: "/produk",
      label: t.nav.products,
      icon: IconProducts,
    },
    {
      id: "history",
      href: "/riwayat",
      label: t.nav.history,
      icon: IconHistory,
    },
    {
      id: "reports",
      href: "/laporan",
      label: t.nav.reports,
      icon: IconReports,
    },
    {
      id: "expenses",
      href: "/pengeluaran",
      label: t.nav.expenses,
      icon: IconExpenses,
    },
  ];

  const isCurrent = (item) => {
    if (activePage) return activePage === item.id;
    if (item.href === "/" && pathname === "/") return true;
    if (item.href !== "/" && pathname.startsWith(item.href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-800">
      {/* Desktop & Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white p-5 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand header */}
        <div className="mb-8 flex items-center justify-between px-2">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 transition hover:opacity-80"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-xs">
              C
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {t.common.appName}
              </h1>
              <p className="text-xs text-slate-500">{t.common.shopSubtitle}</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden"
            aria-label="Tutup menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          {t.nav.mainMenu}
        </p>

        {/* Navigation list */}
        <nav className="flex flex-col gap-1.5">
          {navigationItems.map((item) => {
            const active = isCurrent(item);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <ItemIcon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer badge */}
        <div className="mt-auto pt-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900">{t.common.appName}</p>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                Online
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Sistem kasir dan stok toko snack.
            </p>
            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/60">
              <span className="text-[11px] text-slate-400">{t.common.versionTag}</span>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main content wrapper */}
      <div className="min-h-screen flex flex-col lg:ml-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50 lg:hidden"
              aria-label="Buka menu"
            >
              <IconMenu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-medium text-slate-400">
                {t.common.storeTag}
              </p>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 line-clamp-1">
                {title || t.common.appName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <div className="hidden text-right sm:block pl-2 border-l border-slate-200">
              <p className="text-xs font-semibold text-slate-800">{t.common.adminLabel}</p>
              <p className="text-[11px] text-slate-400">{t.common.roleLabel}</p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-sm font-bold text-amber-800 shadow-2xs">
              A
            </div>
          </div>
        </header>

        {/* Page children */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

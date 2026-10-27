"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupiah, formatDateTimeJakarta, getTodayJakarta } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconDashboard,
  IconCashier,
  IconProducts,
  IconReports,
  IconExpenses,
  IconHistory,
  IconRefresh,
  IconArrowRight,
  IconAlertTriangle,
} from "@/components/Icons";

export default function HomePage() {
  const { t, language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todaySalesCount: 0,
    activeProductsCount: 0,
    lowStockCount: 0,
  });
  const [recentSales, setRecentSales] = useState([]);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      // 1. Calculate today's bounds in Asia/Jakarta timezone
      const todayDateStr = getTodayJakarta(); // e.g. "2026-10-27"
      const startOfDayISO = new Date(`${todayDateStr}T00:00:00+07:00`).toISOString();
      const endOfDayISO = new Date(`${todayDateStr}T23:59:59.999+07:00`).toISOString();

      // 2. Fetch today's sales
      const { data: salesToday, error: salesTodayError } = await supabase
        .from("sales")
        .select("id, receipt_number, total, status, created_at")
        .gte("created_at", startOfDayISO)
        .lte("created_at", endOfDayISO);

      if (salesTodayError) throw salesTodayError;

      const completedToday = (salesToday || []).filter(
        (sale) => sale.status === "completed"
      );
      const totalRevenue = completedToday.reduce(
        (sum, sale) => sum + Number(sale.total || 0),
        0
      );

      // 3. Fetch products to get active count and low-stock count
      const { data: products, error: prodError } = await supabase
        .from("products")
        .select("id, stock_quantity, min_stock, is_active");

      if (prodError) throw prodError;

      const activeList = (products || []).filter((p) => p.is_active);
      const lowStockList = activeList.filter(
        (p) => Number(p.stock_quantity ?? 0) <= Number(p.min_stock ?? 0)
      );

      setStats({
        todayRevenue: totalRevenue,
        todaySalesCount: completedToday.length,
        activeProductsCount: activeList.length,
        lowStockCount: lowStockList.length,
      });

      // 4. Fetch the 5 most recent sales
      const { data: recent, error: recentError } = await supabase
        .from("sales")
        .select(`
          id,
          receipt_number,
          total,
          payment_method,
          status,
          created_at,
          sale_items (
            id,
            product_name,
            quantity
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;
      setRecentSales(recent || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
      setErrorMsg(
        err.message ||
          "Gagal memuat data dashboard. Periksa koneksi Supabase Anda."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const quickActions = [
    {
      id: "cashier",
      href: "/kasir",
      title: t.dashboard.quickCashierTitle,
      description: t.dashboard.quickCashierDesc,
      icon: IconCashier,
      highlight: true,
    },
    {
      id: "products",
      href: "/produk",
      title: t.dashboard.quickProductsTitle,
      description: t.dashboard.quickProductsDesc,
      icon: IconProducts,
    },
    {
      id: "reports",
      href: "/laporan",
      title: t.dashboard.quickReportsTitle,
      description: t.dashboard.quickReportsDesc,
      icon: IconReports,
    },
    {
      id: "expenses",
      href: "/pengeluaran",
      title: t.dashboard.quickExpensesTitle,
      description: t.dashboard.quickExpensesDesc,
      icon: IconExpenses,
    },
  ];

  return (
    <AppLayout activePage="dashboard" title={t.nav.dashboard}>
      {/* Banner / Title */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.dashboard.summaryLabel}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.dashboard.title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            {t.dashboard.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
            title={t.common.reload}
          >
            <IconRefresh className="h-3.5 w-3.5" />
            <span>{loading ? t.common.loading : t.common.reload}</span>
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t.dashboard.liveMode}
          </span>
        </div>
      </div>

      {/* Error state */}
      {errorMsg && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-semibold">{t.common.errorOccurred}</p>
          <p className="mt-1">{errorMsg}</p>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Today's Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.todaySales}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <IconExpenses className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {loading ? "..." : formatRupiah(stats.todayRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.dashboard.todaySalesNote}
          </p>
        </div>

        {/* Total Transactions Today */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.todayTransactions}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <IconHistory className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {loading ? "..." : stats.todaySalesCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.dashboard.todayTransactionsNote}
          </p>
        </div>

        {/* Active Products */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.activeProducts}
            </p>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <IconProducts className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {loading ? "..." : stats.activeProductsCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.dashboard.activeProductsNote}
          </p>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.dashboard.lowStock}
            </p>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                stats.lowStockCount > 0
                  ? "bg-red-50 text-red-600 animate-pulse"
                  : "bg-slate-50 text-slate-400"
              }`}
            >
              <IconAlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              stats.lowStockCount > 0 ? "text-red-600" : "text-slate-900"
            }`}
          >
            {loading ? "..." : stats.lowStockCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.dashboard.lowStockNote}
          </p>
        </div>
      </div>

      {/* Main Grid: Recent Activity & Quick Access */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent Sales Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs xl:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base sm:text-lg">
                {t.dashboard.recentSales}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {t.dashboard.recentSalesDesc}
              </p>
            </div>
            <Link
              href="/riwayat"
              className="flex items-center gap-1 text-xs font-semibold text-slate-700 hover:text-black underline underline-offset-4"
            >
              <span>{t.dashboard.viewAllHistory}</span>
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">
              {t.common.loading}
            </div>
          ) : recentSales.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-xs">
                <IconHistory className="h-6 w-6" />
              </span>
              <p className="text-sm font-semibold text-slate-700">
                {t.dashboard.noRecentSales}
              </p>
              <Link
                href="/kasir"
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                <IconCashier className="h-3.5 w-3.5" />
                <span>{t.cashier.title}</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 font-semibold">{t.history.colReceipt}</th>
                    <th className="pb-3 font-semibold">{t.history.colDate}</th>
                    <th className="pb-3 font-semibold">{t.history.colPayment}</th>
                    <th className="pb-3 font-semibold text-right">{t.history.colTotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 font-medium text-slate-900">
                        {sale.receipt_number}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {formatDateTimeJakarta(sale.created_at, language)}
                      </td>
                      <td className="py-3 text-xs uppercase text-slate-600 font-medium">
                        {sale.payment_method || "tunai"}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-900">
                        {formatRupiah(sale.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Access */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
          <h2 className="font-bold text-slate-900 text-base sm:text-lg">
            {t.dashboard.quickAccess}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {t.dashboard.quickAccessDesc}
          </p>

          <div className="mt-5 flex flex-col gap-3">
            {quickActions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <Link
                  key={action.id}
                  href={action.href}
                  className={`flex items-center gap-3.5 rounded-xl border p-3.5 transition ${
                    action.highlight
                      ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-800"
                      : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                      action.highlight
                        ? "bg-white/10 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    <ActionIcon className="h-5 w-5" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">
                      {action.title}
                    </span>
                    <span
                      className={`mt-0.5 block text-xs ${
                        action.highlight ? "text-slate-300" : "text-slate-400"
                      }`}
                    >
                      {action.description}
                    </span>
                  </span>
                  <span
                    className={`${
                      action.highlight ? "text-white/60" : "text-slate-400"
                    }`}
                  >
                    <IconArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row">
        <p>{t.dashboard.footerTag}</p>
        <p>Asia/Jakarta (WIB) · {getTodayJakarta()}</p>
      </footer>
    </AppLayout>
  );
}

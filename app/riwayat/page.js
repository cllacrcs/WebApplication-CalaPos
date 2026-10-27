"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupiah, formatDateTimeJakarta } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconPrinter,
  IconClose,
  IconRefresh,
} from "@/components/Icons";

export default function RiwayatPage() {
  const { t, language } = useLanguage();

  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSale, setSelectedSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSales = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("sales")
      .select(`
        id,
        receipt_number,
        subtotal,
        total,
        payment_amount,
        change_amount,
        payment_method,
        status,
        created_at,
        sale_items (
          id,
          product_name,
          quantity,
          unit,
          unit_price,
          subtotal
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Gagal mengambil riwayat:", error);
      setErrorMessage(
        error.message ||
          "Riwayat gagal dimuat. Periksa koneksi Supabase Anda."
      );
      setLoading(false);
      return;
    }

    setSales(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSales();
  }, [loadSales]);

  const filteredSales = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return sales.filter((sale) => {
      const matchesSearch =
        !keyword ||
        (sale.receipt_number || "").toLowerCase().includes(keyword);

      let matchesStatus = true;
      if (statusFilter !== "all") {
        matchesStatus = sale.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [sales, search, statusFilter]);

  const totalPenjualan = useMemo(
    () =>
      filteredSales
        .filter((sale) => sale.status === "completed")
        .reduce((sum, sale) => sum + Number(sale.total || 0), 0),
    [filteredSales]
  );

  return (
    <AppLayout activePage="history" title={t.nav.history}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.history.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.history.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadSales}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          <span>{loading ? t.common.loading : t.common.reload}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.history.totalTransactions}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {filteredSales.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {filteredSales.filter((s) => s.status === "completed").length}{" "}
            {t.history.statusCompleted}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.history.totalRevenue}
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatRupiah(totalPenjualan)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.reports.grossRevenueNote}
          </p>
        </section>
      </div>

      {/* Filter Toolbar & List */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-md">
            <input
              id="search-receipt"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.history.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">{t.common.all} Status</option>
              <option value="completed">{t.history.statusCompleted}</option>
              <option value="cancelled">{t.history.statusCancelled}</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {errorMessage}
          </div>
        )}

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.common.loading}
          </p>
        ) : filteredSales.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {search ? t.history.notFound : t.history.noHistory}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colReceipt}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colDate}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colTotal}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colPayment}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colStatus}</th>
                  <th className="px-5 py-3.5 font-semibold text-right">{t.history.colDetails}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-slate-50 transition"
                  >
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {sale.receipt_number}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {formatDateTimeJakarta(sale.created_at, language)}
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-900">
                      {formatRupiah(sale.total)}
                    </td>
                    <td className="px-5 py-4 uppercase font-medium text-slate-600">
                      {sale.payment_method || "tunai"}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          sale.status === "completed"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {sale.status === "completed"
                          ? t.history.statusCompleted
                          : t.history.statusCancelled}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 shadow-2xs hover:bg-slate-50"
                      >
                        {t.history.viewDetail}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-500">
          {filteredSales.length} {t.history.totalTransactions.toLowerCase()}
        </div>
      </section>

      {/* DETAIL MODAL WITH PRINT CAPABILITY */}
      {selectedSale && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs"
          onClick={() => setSelectedSale(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Detail transaksi"
            className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 sm:text-lg">
                  {t.history.detailTitle}
                </h2>
                <p className="mt-0.5 text-xs font-semibold text-slate-600">
                  {selectedSale.receipt_number}
                </p>
                <p className="text-[11px] text-slate-400">
                  {formatDateTimeJakarta(selectedSale.created_at, language)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                aria-label="Tutup detail"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>

            {/* Line items list */}
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t.history.itemSummary}
            </p>
            <div className="space-y-2 border-b border-slate-100 pb-3 text-xs">
              {(selectedSale.sale_items || []).map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-start"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {item.product_name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.quantity} {item.unit || "bungkus"} ×{" "}
                      {formatRupiah(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-medium text-slate-900">
                    {formatRupiah(item.subtotal)}
                  </p>
                </div>
              ))}
            </div>

            {/* Payment Summary */}
            <div className="mt-3 space-y-1.5 text-xs border-b border-slate-100 pb-3">
              <div className="flex justify-between text-slate-500">
                <span>{t.common.subtotal}</span>
                <span>{formatRupiah(selectedSale.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-sm">
                <span>{t.common.total}</span>
                <span>{formatRupiah(selectedSale.total)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.cashier.paymentMethodLabel}</span>
                <span className="uppercase font-medium text-slate-800">
                  {selectedSale.payment_method || "tunai"}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.history.cashReceived}</span>
                <span>{formatRupiah(selectedSale.payment_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.history.changeGiven}</span>
                <span className="font-semibold text-emerald-700">
                  {formatRupiah(selectedSale.change_amount)}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center justify-center gap-1.5 flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs"
              >
                <IconPrinter className="h-4 w-4" />
                <span>{t.common.printReceipt}</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
              >
                {t.history.closeDetail}
              </button>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  );
}

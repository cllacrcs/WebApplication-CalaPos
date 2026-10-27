"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  formatRupiah,
  formatDateTimeJakarta,
  getTodayJakarta,
} from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconPrinter,
  IconFileCsv,
  IconFileExcel,
} from "@/components/Icons";

export default function LaporanPage() {
  const { t, language } = useLanguage();

  const [period, setPeriod] = useState("month"); // 'today', '7days', 'month', 'custom'
  const [customStart, setCustomStart] = useState(getTodayJakarta());
  const [customEnd, setCustomEnd] = useState(getTodayJakarta());

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [sales, setSales] = useState([]);
  const [productsMap, setProductsMap] = useState({});
  const [expenses, setExpenses] = useState([]);

  // Calculate start & end ISO strings based on selected period in Asia/Jakarta timezone
  const getDateRange = useCallback(() => {
    const todayStr = getTodayJakarta(); // YYYY-MM-DD
    let startStr = todayStr;
    let endStr = todayStr;

    if (period === "today") {
      startStr = todayStr;
      endStr = todayStr;
    } else if (period === "7days") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      startStr = d.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
      endStr = todayStr;
    } else if (period === "month") {
      const [year, month] = todayStr.split("-");
      startStr = `${year}-${month}-01`;
      endStr = todayStr;
    } else if (period === "custom") {
      startStr = customStart || todayStr;
      endStr = customEnd || todayStr;
    }

    const startISO = new Date(`${startStr}T00:00:00+07:00`).toISOString();
    const endISO = new Date(`${endStr}T23:59:59.999+07:00`).toISOString();

    return { startISO, endISO, startStr, endStr };
  }, [period, customStart, customEnd]);

  // Load report data from Supabase
  const loadReportData = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");

    try {
      const { startISO, endISO } = getDateRange();

      // 1. Fetch sales in date range
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select(`
          id,
          receipt_number,
          subtotal,
          total,
          payment_method,
          status,
          created_at,
          sale_items (
            id,
            product_id,
            product_name,
            quantity,
            unit,
            unit_price,
            subtotal
          )
        `)
        .gte("created_at", startISO)
        .lte("created_at", endISO)
        .order("created_at", { ascending: false });

      if (salesError) throw salesError;

      // 2. Fetch products to get cost_price mapping
      const { data: prodsData, error: prodsError } = await supabase
        .from("products")
        .select("id, name, cost_price, selling_price");

      if (prodsError) throw prodsError;

      const pMap = {};
      (prodsData || []).forEach((p) => {
        pMap[p.id] = {
          name: p.name,
          cost_price: Number(p.cost_price || 0),
          selling_price: Number(p.selling_price || 0),
        };
      });

      // 3. Fetch expenses in date range
      const { data: expensesData, error: expError } = await supabase
        .from("expenses")
        .select("id, description, amount, category, expense_date, notes")
        .gte("created_at", startISO)
        .lte("created_at", endISO);

      if (expError) {
        console.warn("Expenses fetch non-fatal notice:", expError);
      }

      setSales(salesData || []);
      setProductsMap(pMap);
      setExpenses(expensesData || []);
    } catch (err) {
      console.error("Error loading report:", err);
      setErrorMsg(
        err.message || "Gagal memuat data laporan dari database."
      );
    } finally {
      setLoading(false);
    }
  }, [getDateRange]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Completed transactions
  const completedSales = useMemo(
    () => sales.filter((s) => s.status === "completed"),
    [sales]
  );

  // Financial calculations
  const grossRevenue = useMemo(
    () => completedSales.reduce((sum, s) => sum + Number(s.total || 0), 0),
    [completedSales]
  );

  // Calculate COGS (Cost of Goods Sold)
  const estimatedCOGS = useMemo(() => {
    let totalCogs = 0;
    completedSales.forEach((sale) => {
      (sale.sale_items || []).forEach((item) => {
        const prod = productsMap[item.product_id];
        const costPrice = prod ? prod.cost_price : 0;
        totalCogs += costPrice * Number(item.quantity || 0);
      });
    });
    return totalCogs;
  }, [completedSales, productsMap]);

  // Estimated gross profit
  const grossProfit = Math.max(0, grossRevenue - estimatedCOGS);

  // Operating expenses
  const totalExpenses = useMemo(
    () => expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [expenses]
  );

  // Net Profit
  const netProfit = grossProfit - totalExpenses;

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const counts = { tunai: 0, qris: 0, transfer: 0, debit: 0 };
    const amounts = { tunai: 0, qris: 0, transfer: 0, debit: 0 };

    completedSales.forEach((s) => {
      const method = (s.payment_method || "tunai").toLowerCase();
      const target = counts[method] !== undefined ? method : "tunai";
      counts[target] = (counts[target] || 0) + 1;
      amounts[target] = (amounts[target] || 0) + Number(s.total || 0);
    });

    return [
      { id: "tunai", label: t.cashier.methodCash, count: counts.tunai, total: amounts.tunai },
      { id: "qris", label: t.cashier.methodQris, count: counts.qris, total: amounts.qris },
      { id: "transfer", label: t.cashier.methodTransfer, count: counts.transfer, total: amounts.transfer },
      { id: "debit", label: t.cashier.methodDebit, count: counts.debit, total: amounts.debit },
    ];
  }, [completedSales, t.cashier]);

  // CSV Export with formula injection sanitization and UTF-8 BOM
  const handleExportCSV = () => {
    if (completedSales.length === 0) {
      alert("Tidak ada data untuk diekspor pada periode ini.");
      return;
    }

    const { startStr, endStr } = getDateRange();

    // Sanitize values to prevent spreadsheet formula injection
    const sanitize = (val) => {
      let str = String(val ?? "").replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = "'" + str;
      }
      return `"${str}"`;
    };

    const headers = [
      "No. Struk",
      "Tanggal & Waktu",
      "Status",
      "Metode Pembayaran",
      "Subtotal",
      "Total Penjualan",
      "Jumlah Barang",
    ];

    const rows = completedSales.map((s) => {
      const itemCount = (s.sale_items || []).reduce(
        (sum, item) => sum + Number(item.quantity || 0),
        0
      );
      return [
        sanitize(s.receipt_number),
        sanitize(formatDateTimeJakarta(s.created_at, language)),
        sanitize(s.status),
        sanitize(s.payment_method || "tunai"),
        s.subtotal,
        s.total,
        itemCount,
      ].join(",");
    });

    // Summary block
    rows.push("");
    rows.push(`"TOTAL OMZET",,,,,"${grossRevenue}"`);
    rows.push(`"TOTAL TRANSAKSI",,,,,"${completedSales.length}"`);
    rows.push(`"ESTIMASI HPP",,,,,"${estimatedCOGS}"`);
    rows.push(`"ESTIMASI LABA KOTOR",,,,,"${grossProfit}"`);
    rows.push(`"PENGELUARAN OPERASIONAL",,,,,"${totalExpenses}"`);
    rows.push(`"ESTIMASI LABA BERSIH",,,,,"${netProfit}"`);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CalaPOS_Laporan_${startStr}_sampai_${endStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Excel (.xls) HTML Spreadsheet export
  const handleExportExcel = () => {
    if (completedSales.length === 0) {
      alert("Tidak ada data untuk diekspor pada periode ini.");
      return;
    }

    const { startStr, endStr } = getDateRange();

    const tableRows = completedSales
      .map(
        (s) => `
      <tr>
        <td>${s.receipt_number}</td>
        <td>${formatDateTimeJakarta(s.created_at, language)}</td>
        <td>${s.status}</td>
        <td>${s.payment_method || "tunai"}</td>
        <td>${s.subtotal}</td>
        <td>${s.total}</td>
      </tr>`
      )
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"/></head>
      <body>
        <h2>Laporan Penjualan CalaPOS</h2>
        <p>Periode: ${startStr} s/d ${endStr}</p>
        <p>Gross Revenue: Rp ${grossRevenue.toLocaleString()} | Estimasi Laba Kotor: Rp ${grossProfit.toLocaleString()}</p>
        <table border="1">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th>No. Struk</th>
              <th>Tanggal</th>
              <th>Status</th>
              <th>Metode</th>
              <th>Subtotal (Rp)</th>
              <th>Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CalaPOS_Laporan_${startStr}_sampai_${endStr}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout activePage="reports" title={t.nav.reports}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.reports.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.reports.subtitle}
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <IconFileCsv className="h-4 w-4 text-slate-500" />
            <span>{t.common.downloadCsv}</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <IconFileExcel className="h-4 w-4 text-emerald-600" />
            <span>{t.common.downloadExcel}</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition"
          >
            <IconPrinter className="h-4 w-4 text-white" />
            <span>{t.common.print}</span>
          </button>
        </div>
      </div>

      {/* Date Filter Toolbar */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-2">
              {t.reports.periodLabel}:
            </span>
            {[
              { id: "today", label: t.reports.periodToday },
              { id: "7days", label: t.reports.period7Days },
              { id: "month", label: t.reports.periodMonth },
              { id: "custom", label: t.reports.periodCustom },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  period === p.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          {period === "custom" && (
            <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
              <label className="text-xs text-slate-500 flex items-center gap-1">
                {t.reports.startDate}:
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                />
              </label>
              <label className="text-xs text-slate-500 flex items-center gap-1">
                {t.reports.endDate}:
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs"
                />
              </label>
              <button
                type="button"
                onClick={loadReportData}
                className="rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-white"
              >
                {t.reports.applyFilter}
              </button>
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
          {errorMsg}
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.reports.grossRevenue}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatRupiah(grossRevenue)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {completedSales.length} {t.reports.validTransactions.toLowerCase()}
          </p>
        </div>

        {/* Estimated COGS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.reports.cogsLabel}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-700">
            {loading ? "..." : formatRupiah(estimatedCOGS)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.reports.cogsNote}
          </p>
        </div>

        {/* Estimated Gross Profit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.reports.estimatedProfit}
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {loading ? "..." : formatRupiah(grossProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.reports.profitNote}
          </p>
        </div>

        {/* Operating Expenses & Net Profit */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.reports.netProfitEstimated}
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              netProfit >= 0 ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {loading ? "..." : formatRupiah(netProfit)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Biaya ops: {formatRupiah(totalExpenses)}
          </p>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">
          {t.reports.paymentBreakdown}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {paymentBreakdown.map((pm) => (
            <div
              key={pm.id}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <p className="text-xs font-semibold text-slate-600 uppercase">
                {pm.label}
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">
                {formatRupiah(pm.total)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {pm.count} transaksi
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Sales Transactions in Period Table */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-base font-bold text-slate-900">
            {t.reports.salesListTitle}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            {t.reports.cogsDisclaimer}
          </p>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.common.loading}
          </p>
        ) : completedSales.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.reports.noSalesInPeriod}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colReceipt}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colDate}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.history.colPayment}</th>
                  <th className="px-5 py-3.5 font-semibold">{t.common.subtotal}</th>
                  <th className="px-5 py-3.5 font-semibold text-right">{t.common.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition">
                    <td className="px-5 py-3.5 font-semibold text-slate-900">
                      {sale.receipt_number}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {formatDateTimeJakarta(sale.created_at, language)}
                    </td>
                    <td className="px-5 py-3.5 uppercase text-slate-600 font-medium">
                      {sale.payment_method || "tunai"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {formatRupiah(sale.subtotal)}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      {formatRupiah(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-500 flex justify-between">
          <span>{completedSales.length} transaksi selesai</span>
          <span className="font-bold text-slate-900">
            Total Omzet: {formatRupiah(grossRevenue)}
          </span>
        </div>
      </section>
    </AppLayout>
  );
}

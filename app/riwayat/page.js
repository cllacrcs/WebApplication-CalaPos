
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const formatTanggal = (date) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));

export default function RiwayatPage() {
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState("");
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
        "Riwayat gagal dimuat. Periksa izin akses tabel sales dan sale_items di Supabase."
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

    if (!keyword) return sales;

    return sales.filter((sale) =>
      (sale.receipt_number || "").toLowerCase().includes(keyword)
    );
  }, [sales, search]);

  const totalPenjualan = filteredSales
    .filter((sale) => sale.status === "completed")
    .reduce((sum, sale) => sum + Number(sale.total || 0), 0);

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-slate-500">
              CalaPOS / Riwayat Transaksi
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Riwayat Transaksi
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Lihat transaksi penjualan yang tersimpan di database.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadSales}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "Memuat..." : "↻ Muat ulang"}
            </button>
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              ← Dashboard
            </a>
          </div>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Jumlah transaksi ditemukan
            </p>
            <p className="mt-2 text-2xl font-bold">
              {filteredSales.length}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Total penjualan transaksi selesai
            </p>
            <p className="mt-2 text-2xl font-bold">
              {formatRupiah(totalPenjualan)}
            </p>
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5">
            <label
              htmlFor="search-receipt"
              className="mb-2 block text-sm font-semibold"
            >
              Cari nomor struk
            </label>
            <input
              id="search-receipt"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Contoh: CAL-..."
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500 sm:max-w-md"
            />
          </div>

          {errorMessage && (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {loading && (
            <p className="py-10 text-center text-sm text-slate-500">
              Memuat riwayat transaksi...
            </p>
          )}

          {!loading && !errorMessage && filteredSales.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500">
              {search
                ? "Nomor struk tidak ditemukan."
                : "Belum ada transaksi."}
            </p>
          )}

          {!loading && !errorMessage && filteredSales.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-semibold">Nomor struk</th>
                    <th className="px-3 py-3 font-semibold">Tanggal</th>
                    <th className="px-3 py-3 font-semibold">Total</th>
                    <th className="px-3 py-3 font-semibold">Pembayaran</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.map((sale) => (
                    <tr
                      key={sale.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-4 font-semibold">
                        {sale.receipt_number}
                      </td>
                      <td className="px-3 py-4 text-slate-600">
                        {formatTanggal(sale.created_at)}
                      </td>
                      <td className="px-3 py-4 font-semibold">
                        {formatRupiah(sale.total)}
                      </td>
                      <td className="px-3 py-4 uppercase text-slate-600">
                        {sale.payment_method}
                      </td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            sale.status === "completed"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {sale.status === "completed"
                            ? "Selesai"
                            : "Dibatalkan"}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => setSelectedSale(sale)}
                          className="font-semibold text-slate-700 underline underline-offset-4 hover:text-slate-500"
                        >
                          Lihat detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedSale && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
            onClick={() => setSelectedSale(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-label="Detail transaksi"
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">Detail Transaksi</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedSale.receipt_number}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSale(null)}
                  aria-label="Tutup detail"
                  className="rounded-lg border border-slate-200 px-3 py-1.5"
                >
                  ✕
                </button>
              </div>

              <p className="mb-4 text-sm text-slate-500">
                {formatTanggal(selectedSale.created_at)}
              </p>

              <div className="space-y-4">
                {(selectedSale.sale_items || []).map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between gap-4 border-b border-slate-100 pb-3"
                  >
                    <div>
                      <p className="font-semibold">{item.product_name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantity} {item.unit} ×{" "}
                        {formatRupiah(item.unit_price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatRupiah(item.subtotal)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatRupiah(selectedSale.subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatRupiah(selectedSale.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uang pembayaran</span>
                  <span>{formatRupiah(selectedSale.payment_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Kembalian</span>
                  <span>{formatRupiah(selectedSale.change_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode pembayaran</span>
                  <span className="uppercase">
                    {selectedSale.payment_method}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedSale(null)}
                className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-700"
              >
                Tutup
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

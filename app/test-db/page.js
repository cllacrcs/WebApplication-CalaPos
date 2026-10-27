"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AppLayout from "@/components/AppLayout";

export default function TestDatabasePage() {
  const [results, setResults] = useState({
    products: "Mengecek...",
    sales: "Mengecek...",
    expenses: "Mengecek...",
  });

  useEffect(() => {
    async function checkDatabase() {
      // Products check
      const { error: pErr } = await supabase
        .from("products")
        .select("id")
        .limit(1);

      // Sales check
      const { error: sErr } = await supabase
        .from("sales")
        .select("id")
        .limit(1);

      // Expenses check
      const { error: eErr } = await supabase
        .from("expenses")
        .select("id")
        .limit(1);

      setResults({
        products: pErr ? `Gagal: ${pErr.message}` : "Berhasil terhubung (Tabel products OK)",
        sales: sErr ? `Gagal: ${sErr.message}` : "Berhasil terhubung (Tabel sales OK)",
        expenses: eErr ? `Gagal: ${eErr.message}` : "Berhasil terhubung (Tabel expenses OK)",
      });
    }

    checkDatabase();
  }, []);

  return (
    <AppLayout title="Diagnostik Database">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs max-w-xl">
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Diagnostik Koneksi Supabase CalaPOS
        </h1>
        <p className="text-xs text-slate-500 mb-6">
          Halaman pengujian aman untuk memverifikasi kesiapan tabel database.
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-semibold block text-slate-700">Tabel Produk (products):</span>
            <span className="text-slate-600">{results.products}</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-semibold block text-slate-700">Tabel Penjualan (sales):</span>
            <span className="text-slate-600">{results.sales}</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <span className="font-semibold block text-slate-700">Tabel Pengeluaran (expenses):</span>
            <span className="text-slate-600">{results.expenses}</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

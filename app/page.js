
"use client";

import { useState } from "react";

const menuItems = [
  { id: "dashboard", icon: "▦", label: "Dashboard" },
  { id: "cashier", icon: "▣", label: "Kasir" },
  { id: "products", icon: "□", label: "Produk & Stok" },
  { id: "reports", icon: "▤", label: "Laporan" },
  { id: "expenses", icon: "↗", label: "Pengeluaran" },
];

export default function Home() {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentMenu = menuItems.find((item) => item.id === activeMenu);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-800">
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-slate-200 bg-white p-5 transition-transform duration-200 lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
            C
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CalaPOS</h1>
            <p className="text-xs text-slate-500">Snack Store Management</p>
          </div>
        </div>

        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
          Menu utama
        </p>

        <nav className="flex flex-col gap-2">
          {menuItems.map((item) => (
            
<button

onClick={() => {
  setMobileMenuOpen(false);

  if (item.id === "cashier") {
    window.location.href = "/kasir";
    return;
  }

  if (item.id === "products") {
    window.location.href = "/produk";
    return;
  }

  setActiveMenu(item.id);
}}

              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${
                activeMenu === item.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="w-5 text-center text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-slate-50 p-4">
          <p className="text-sm font-semibold">CalaPOS</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Sistem kasir dan stok untuk toko snack keluarga.
          </p>
          <div className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs text-slate-500 ring-1 ring-slate-200">
            Versi awal
          </div>
        </div>
      </aside>

      {mobileMenuOpen && (
        <button
          aria-label="Tutup menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden"
        />
      )}

      <main className="min-h-screen lg:ml-64">
        <header className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-lg lg:hidden"
              aria-label="Buka menu"
            >
              ☰
            </button>
            <div>
              <p className="text-xs text-slate-500">CalaPOS / Toko Snack</p>
              <h2 className="text-lg font-bold">{currentMenu?.label}</h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">Admin Toko</p>
              <p className="text-xs text-slate-500">Pengelola</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 font-bold text-amber-800">
              A
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-5 sm:p-8">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-500">
                Ringkasan toko
              </p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Selamat datang di CalaPOS
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Kelola penjualan, produk, dan stok dalam satu tempat.
              </p>
            </div>
            <span className="w-fit rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600">
              ● Mode pratinjau
            </span>
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Penjualan hari ini",
                value: "Rp0",
                note: "Belum ada transaksi",
                icon: "↗",
              },
              {
                label: "Total transaksi",
                value: "0",
                note: "Transaksi hari ini",
                icon: "▤",
              },
              {
                label: "Produk aktif",
                value: "0",
                note: "Menunggu data produk",
                icon: "□",
              },
              {
                label: "Stok menipis",
                value: "0",
                note: "Perlu diperiksa",
                icon: "!",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-100/70"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm text-slate-500">{stat.label}</p>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-lg text-slate-700">
                    {stat.icon}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                <p className="mt-2 text-xs text-slate-500">{stat.note}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/70 xl:col-span-2">
              <div className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold">Aktivitas penjualan</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Ringkasan transaksi terbaru
                  </p>
                </div>
                <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Hari ini
                </span>
              </div>

              <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                  ▤
                </span>
                <p className="text-sm font-semibold">Belum ada transaksi</p>
                <p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">
                  Transaksi yang tercatat nantinya akan muncul di bagian ini.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100/70">
              <h3 className="font-bold">Akses cepat</h3>
              <p className="mt-1 text-sm text-slate-500">
                Menu yang sering digunakan
              </p>

              <div className="mt-5 flex flex-col gap-3">
                {[
                  {
                    id: "cashier",
                    title: "Mulai transaksi",
                    description: "Buka halaman kasir",
                    icon: "▣",
                  },
                  {
                    id: "products",
                    title: "Kelola produk",
                    description: "Atur harga dan stok",
                    icon: "□",
                  },
                  {
                    id: "reports",
                    title: "Lihat laporan",
                    description: "Pantau hasil penjualan",
                    icon: "▤",
                  },
                ].map((action) => (
                  <button
                    key={action.id}
                    onClick={() => {
  if (action.id === "products") {
    window.location.href = "/produk";
    return;
  }

  if (action.id === "cashier") {
    window.location.href = "/kasir";
    return;
  }

  setActiveMenu(action.id);
}}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg">
                      {action.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {action.title}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {action.description}
                      </span>
                    </span>
                    <span className="ml-auto text-slate-400">→</span>
                  </button>
                ))}
              </div>
            </section>
          </div>

          <footer className="mt-8 flex flex-col justify-between gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row">
            <p>CalaPOS · Sistem kasir toko snack</p>
            <p>Pratinjau antarmuka · Data belum tersambung</p>
          </footer>
        </div>
      </main>
    </div>
  );
}

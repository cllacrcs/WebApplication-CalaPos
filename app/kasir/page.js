
"use client";

import { useMemo, useState } from "react";

const initialProducts = [
  { id: 1, name: "Keripik Singkong", category: "Keripik", price: 5000, stock: 30 },
  { id: 2, name: "Makaroni Pedas", category: "Makaroni", price: 4000, stock: 25 },
  { id: 3, name: "Keripik Pisang", category: "Keripik", price: 6000, stock: 20 },
  { id: 4, name: "Kacang Koro", category: "Kacang", price: 5000, stock: 18 },
  { id: 5, name: "Keripik Kaca", category: "Keripik", price: 3000, stock: 22 },
  { id: 6, name: "Kuping Gajah", category: "Tradisional", price: 5000, stock: 15 },
  { id: 7, name: "Stik Keju", category: "Snack", price: 7000, stock: 12 },
  { id: 8, name: "Keripik Sukun", category: "Keripik", price: 6000, stock: 10 },
];

const formatRupiah = (amount) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

export default function KasirPage() {
  const [products, setProducts] = useState(initialProducts);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [payment, setPayment] = useState("");
  const [notice, setNotice] = useState("");

  const categories = [
    "Semua",
    ...new Set(products.map((product) => product.category)),
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "Semua" || product.category === category;

    return matchesSearch && matchesCategory;
  });

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const paid = Number(payment) || 0;
  const change = paid - total;

  function addToCart(product) {
    setNotice("");

    const existing = cart.find((item) => item.id === product.id);
    const quantityInCart = existing ? existing.quantity : 0;

    if (quantityInCart >= product.stock) {
      setNotice("Jumlah barang melebihi stok contoh yang tersedia.");
      return;
    }

    if (existing) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  }

  function updateQuantity(id, amount) {
    setNotice("");

    const item = cart.find((product) => product.id === id);
    const product = products.find((product) => product.id === id);

    if (!item || !product) return;

    const nextQuantity = item.quantity + amount;

    if (nextQuantity <= 0) {
      setCart(cart.filter((product) => product.id !== id));
      return;
    }

    if (nextQuantity > product.stock) {
      setNotice("Jumlah barang melebihi stok contoh yang tersedia.");
      return;
    }

    setCart(
      cart.map((product) =>
        product.id === id
          ? { ...product, quantity: nextQuantity }
          : product
      )
    );
  }

  function finishTransaction() {
    if (cart.length === 0) {
      setNotice("Keranjang masih kosong. Pilih produk terlebih dahulu.");
      return;
    }

    if (paid < total) {
      setNotice("Uang pembayaran belum mencukupi.");
      return;
    }

    setProducts(
      products.map((product) => {
        const item = cart.find((cartItem) => cartItem.id === product.id);
        return item
          ? { ...product, stock: product.stock - item.quantity }
          : product;
      })
    );

    setCart([]);
    setPayment("");
    setNotice(
      `Transaksi contoh berhasil! Kembalian: ${formatRupiah(change)}. Data belum tersimpan permanen.`
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-slate-500">
              CalaPOS / Kasir
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">
              Kasir
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Pilih produk dan hitung pembayaran pelanggan.
            </p>
          </div>

          <a
            href="/"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            ← Dashboard
          </a>
        </div>

        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
          <strong>Mode demo:</strong> Produk dan stok di halaman ini masih
          data contoh. Transaksi belum tersimpan ke database.
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <label
                htmlFor="product-search"
                className="mb-2 block text-sm font-semibold"
              >
                Cari produk
              </label>
              <input
                id="product-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Contoh: keripik singkong..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-2">
              {categories.map((item) => (
                <button
                  key={item}
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                    category === item
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock === 0}
                  className="rounded-xl border border-slate-200 p-4 text-left transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-xl">
                    ◇
                  </div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {product.category}
                  </p>
                  <div className="mt-4 flex flex-wrap items-end justify-between gap-2">
                    <span className="text-sm font-bold">
                      {formatRupiah(product.price)}
                    </span>
                    <span className="text-xs text-slate-500">
                      Stok: {product.stock}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-700">
                    + Tambah ke keranjang
                  </p>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <p className="py-10 text-center text-sm text-slate-500">
                Produk tidak ditemukan.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Keranjang</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} barang
                </p>
              </div>
              <button
                onClick={() => {
                  setCart([]);
                  setPayment("");
                  setNotice("");
                }}
                className="text-xs font-semibold text-slate-500 hover:text-red-600"
              >
                Kosongkan
              </button>
            </div>

            <div className="max-h-72 space-y-4 overflow-y-auto">
              {cart.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <p className="text-sm font-semibold">Keranjang kosong</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Pilih produk untuk memulai transaksi.
                  </p>
                </div>
              )}

              {cart.map((item) => (
                <div
                  key={item.id}
                  className="border-b border-slate-100 pb-4"
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {formatRupiah(item.price)} / bungkus
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200"
                      aria-label={`Kurangi ${item.name}`}
                    >
                      −
                    </button>
                    <span className="min-w-5 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200"
                      aria-label={`Tambah ${item.name}`}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold">{formatRupiah(total)}</span>
              </div>

              <div>
                <label
                  htmlFor="payment"
                  className="mb-2 block text-sm font-semibold"
                >
                  Uang pembayaran (Rp)
                </label>
                <input
                  id="payment"
                  type="number"
                  min="0"
                  value={payment}
                  onChange={(event) => setPayment(event.target.value)}
                  placeholder="Masukkan nominal"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Kembalian</span>
                <span className="font-semibold">
                  {formatRupiah(Math.max(0, change))}
                </span>
              </div>

              {notice && (
                <p
                  role="status"
                  className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900"
                >
                  {notice}
                </p>
              )}

              <button
                onClick={finishTransaction}
                className="w-full rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Selesaikan transaksi demo
              </button>
              <p className="text-center text-xs leading-5 text-slate-400">
                Transaksi hanya simulasi dan belum tersimpan permanen.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

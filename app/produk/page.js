"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

const rupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);

const emptyForm = {
  name: "",
  category: "Keripik",
  unit: "bungkus",
  cost: "",
  price: "",
  stock: "",
  minStock: "5",
};

const categoryOptions = [
  "Keripik",
  "Makaroni",
  "Kacang",
  "Tradisional",
  "Snack",
  "Lainnya",
];

const unitOptions = ["bungkus", "pcs", "kg", "gram", "toples", "dus"];

export default function ProdukPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, cost_price, selling_price, stock_quantity, stock_unit, min_stock, is_active"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice(`Gagal memuat produk: ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts(
      (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        cost: Number(item.cost_price ?? 0),
        price: Number(item.selling_price ?? 0),
        stock: Number(item.stock_quantity ?? 0),
        unit: item.stock_unit,
        minStock: Number(item.min_stock ?? 0),
      }))
    );

    setLoading(false);
  }

  const categories = [
    "Semua",
    ...new Set(products.map((product) => product.category)),
  ];

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesName = product.name
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesCategory =
          category === "Semua" || product.category === category;

        return matchesName && matchesCategory;
      }),
    [products, search, category]
  );

  const lowStock = products.filter(
    (product) => product.stock <= product.minStock
  ).length;

  function openAddForm() {
    setEditingId(null);
    setForm(emptyForm);
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(product) {
    setEditingId(product.id);

    setForm({
      name: product.name,
      category: product.category,
      unit: product.unit,
      cost: String(product.cost),
      price: String(product.price),
      stock: String(product.stock),
      minStock: String(product.minStock),
    });

    setNotice("");
    setShowForm(true);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setNotice("");

    const cost = Number(form.cost);
    const price = Number(form.price);
    const stock = Number(form.stock);
    const minStock = Number(form.minStock);

    if (
      !form.name.trim() ||
      !form.category ||
      !form.unit ||
      form.cost === "" ||
      form.price === "" ||
      form.stock === "" ||
      form.minStock === "" ||
      !Number.isFinite(cost) ||
      !Number.isFinite(price) ||
      !Number.isFinite(stock) ||
      !Number.isFinite(minStock) ||
      cost < 0 ||
      price < 0 ||
      stock < 0 ||
      minStock < 0
    ) {
      setNotice(
        "Periksa kembali nama, harga, stok, dan stok minimum."
      );
      return;
    }

    const productData = {
      name: form.name.trim(),
      category: form.category,
      cost_price: cost,
      selling_price: price,
      stock_quantity: stock,
      stock_unit: form.unit,
      min_stock: minStock,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    try {
      let error;

      if (editingId !== null) {
        ({ error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingId));
      } else {
        ({ error } = await supabase
          .from("products")
          .insert(productData));
      }

      if (error) {
        setNotice(`Gagal menyimpan produk: ${error.message}`);
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      setNotice(
        editingId !== null
          ? "Produk berhasil diperbarui."
          : "Produk berhasil ditambahkan."
      );

      await loadProducts();
    } catch (error) {
      setNotice(
        `Terjadi kesalahan: ${
          error.message || "Tidak dapat menghubungi database."
        }`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] p-4 text-slate-800 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="mb-1 text-sm text-slate-500">
              CalaPOS / Produk & Stok
            </p>

            <h1 className="text-2xl font-bold sm:text-3xl">
              Produk & Stok
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Kelola daftar snack, harga, dan jumlah persediaan.
            </p>
          </div>

          <div className="flex gap-2">
            <a
              href="/"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"
            >
              ← Dashboard
            </a>

            <button
              onClick={openAddForm}
              className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700"
            >
              + Tambah produk
            </button>
          </div>
        </header>

        <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
          Data produk dimuat dan disimpan melalui database Supabase.
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Jumlah produk</p>
            <p className="mt-3 text-2xl font-bold">
              {products.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Total stok satuan
            </p>

            <p className="mt-3 text-2xl font-bold">
              {products.reduce(
                (sum, product) => sum + product.stock,
                0
              )}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Satuan mengikuti masing-masing produk
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">
              Produk stok menipis
            </p>

            <p className="mt-3 text-2xl font-bold">{lowStock}</p>

            <p className="mt-1 text-xs text-slate-400">
              Sudah mencapai stok minimum
            </p>
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-slate-200 bg-white p-4 text-sm"
          >
            {notice}

            <button
              onClick={() => setNotice("")}
              className="ml-3 font-semibold underline"
            >
              Tutup
            </button>
          </div>
        )}

        {showForm && (
          <form
            onSubmit={saveProduct}
            className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
          >
            <h2 className="mb-5 text-lg font-bold">
              {editingId !== null
                ? "Edit produk"
                : "Tambah produk baru"}
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-sm font-medium">
                Nama produk *
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      name: event.target.value,
                    })
                  }
                  placeholder="Contoh: Keripik singkong"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-slate-500"
                />
              </label>

              <label className="text-sm font-medium">
                Kategori *
                <select
                  required
                  value={form.category}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      category: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"
                >
                  {categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Satuan stok *
                <select
                  required
                  value={form.unit}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      unit: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal"
                >
                  {unitOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Harga modal per satuan (Rp) *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      cost: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Harga jual per satuan (Rp) *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      price: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Stok saat ini *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.stock}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      stock: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>

              <label className="text-sm font-medium">
                Batas stok minimum *
                <input
                  required
                  type="number"
                  min="0"
                  step="0.001"
                  value={form.minStock}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      minStock: event.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan produk"}
              </button>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-bold">Daftar produk</h2>

              <p className="mt-1 text-sm text-slate-500">
                Cari produk atau perbarui informasi stok.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama produk..."
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />

              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Produk</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4">Modal</th>
                  <th className="px-5 py-4">Harga jual</th>
                  <th className="px-5 py-4">Stok</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Aksi</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((product) => {
                  const isLow =
                    product.stock <= product.minStock;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Satuan: {product.unit}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {product.category}
                      </td>

                      <td className="px-5 py-4">
                        {rupiah(product.cost)}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {rupiah(product.price)}
                      </td>

                      <td className="px-5 py-4">
                        {product.stock} {product.unit}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {isLow
                            ? "Stok menipis"
                            : "Tersedia"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => openEditForm(product)}
                          className="font-semibold text-slate-700 underline underline-offset-4 hover:text-black"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {loading ? (
            <p className="p-10 text-center text-sm text-slate-500">
              Memuat data produk...
            </p>
          ) : filteredProducts.length === 0 ? (
            <p className="p-10 text-center text-sm text-slate-500">
              {search || category !== "Semua"
                ? "Produk tidak ditemukan."
                : "Belum ada produk. Klik Tambah produk untuk mulai mengisi."}
            </p>
          ) : null}

          <div className="border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
            Menampilkan {filteredProducts.length} dari{" "}
            {products.length} produk.
          </div>
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-400">
          Catatan: satuan kg dan gram tersedia untuk pencatatan
          sederhana. Konversi stok dari kiloan ke bungkus belum
          diterapkan agar stok tidak tercatat ganda.
        </p>
      </div>
    </main>
  );
}
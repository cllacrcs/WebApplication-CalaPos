"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupiah } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconPlus,
  IconClose,
  IconRefresh,
} from "@/components/Icons";

const emptyForm = {
  name: "",
  category: "Keripik",
  unit: "bungkus",
  cost: "",
  price: "",
  stock: "",
  minStock: "5",
  is_active: true,
};

const categoryOptions = [
  "Keripik",
  "Makaroni",
  "Kacang",
  "Tradisional",
  "Snack",
  "Minuman",
  "Lainnya",
];

const unitOptions = ["bungkus", "pcs", "kg", "gram", "toples", "dus"];

export default function ProdukPage() {
  const { t } = useLanguage();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'low', 'inactive'

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select(
        "id, name, category, cost_price, selling_price, stock_quantity, stock_unit, min_stock, is_active, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      setNotice(`${t.products.saveError} ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }

    setProducts(
      (data ?? []).map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category || "Snack",
        cost: Number(item.cost_price ?? 0),
        price: Number(item.selling_price ?? 0),
        stock: Number(item.stock_quantity ?? 0),
        unit: item.stock_unit || "bungkus",
        minStock: Number(item.min_stock ?? 0),
        is_active: Boolean(item.is_active),
      }))
    );

    setLoading(false);
  }, [t.products.saveError]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const categories = useMemo(() => {
    const list = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return [t.common.all, ...list];
  }, [products, t.common.all]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesName = !q || product.name.toLowerCase().includes(q);
      const matchesCategory =
        category === t.common.all ||
        category === "Semua" ||
        product.category === category;

      let matchesStatus = true;
      if (statusFilter === "active") matchesStatus = product.is_active;
      else if (statusFilter === "inactive") matchesStatus = !product.is_active;
      else if (statusFilter === "low")
        matchesStatus = product.is_active && product.stock <= product.minStock;

      return matchesName && matchesCategory && matchesStatus;
    });
  }, [products, search, category, statusFilter, t.common.all]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.is_active && p.stock <= p.minStock).length,
    [products]
  );

  const totalStockUnits = useMemo(
    () => products.reduce((sum, p) => sum + p.stock, 0),
    [products]
  );

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
      is_active: product.is_active,
    });
    setNotice("");
    setShowForm(true);
  }

  async function toggleProductStatus(product) {
    const nextStatus = !product.is_active;
    const confirmMessage = nextStatus
      ? `Aktifkan produk ${product.name}?`
      : t.products.deactivateConfirm;

    if (!window.confirm(confirmMessage)) return;

    setNotice(t.common.saving);
    const { error } = await supabase
      .from("products")
      .update({
        is_active: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (error) {
      setNotice(`${t.products.saveError} ${error.message}`);
      return;
    }

    setNotice(
      nextStatus
        ? `Produk ${product.name} berhasil diaktifkan.`
        : `Produk ${product.name} telah dinonaktifkan.`
    );
    await loadProducts();
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
      setNotice(t.products.validationError);
      return;
    }

    const productPayload = {
      name: form.name.trim(),
      category: form.category,
      cost_price: cost,
      selling_price: price,
      stock_quantity: stock,
      stock_unit: form.unit,
      min_stock: minStock,
      is_active: form.is_active,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);

    try {
      let error;
      if (editingId !== null) {
        ({ error } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", editingId));
      } else {
        ({ error } = await supabase.from("products").insert(productPayload));
      }

      if (error) {
        setNotice(`${t.products.saveError} ${error.message}`);
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);

      setNotice(
        editingId !== null
          ? t.products.saveSuccessEdit
          : t.products.saveSuccessAdd
      );

      await loadProducts();
    } catch (err) {
      setNotice(`${t.common.errorOccurred}: ${err.message || "Database error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout activePage="products" title={t.nav.products}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.products.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.products.subtitle}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadProducts}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            <span>{loading ? t.common.loading : t.common.reload}</span>
          </button>

          <button
            type="button"
            onClick={openAddForm}
            className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition"
          >
            <IconPlus className="h-4 w-4" />
            <span>{t.products.addProduct}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.products.totalProducts}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {products.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {products.filter((p) => p.is_active).length} {t.products.statusActive}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.products.totalUnits}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalStockUnits}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.products.unitsSubtitle}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.products.lowStockProducts}
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              lowStockCount > 0 ? "text-amber-600" : "text-slate-900"
            }`}
          >
            {lowStockCount}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t.products.lowStockSubtitle}
          </p>
        </div>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-xs"
        >
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-black"
          >
            <IconClose className="h-3.5 w-3.5" />
            <span>{t.common.close}</span>
          </button>
        </div>
      )}

      {/* Add / Edit Form Modal / Card */}
      {showForm && (
        <form
          onSubmit={saveProduct}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs animate-in fade-in duration-150"
        >
          <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">
              {editingId !== null
                ? t.products.formEditTitle
                : t.products.formAddTitle}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldName} *
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Keripik Singkong Balado"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldCategory} *
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              >
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldUnit} *
              <select
                required
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              >
                {unitOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldCost} *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                placeholder="Contoh: 3000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldPrice} *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="Contoh: 5000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldStock} *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="Contoh: 25"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.products.fieldMinStock} *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                placeholder="Contoh: 5"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-normal outline-none focus:border-slate-500"
              />
            </label>

            <div className="flex items-center gap-3 pt-6">
              <input
                id="is_active_checkbox"
                type="checkbox"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-500"
              />
              <label
                htmlFor="is_active_checkbox"
                className="text-xs font-semibold text-slate-800"
              >
                {t.products.statusActive} ({t.products.activeDesc})
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? t.common.saving : t.common.save}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t.common.cancel}
            </button>
          </div>
        </form>
      )}

      {/* Catalog Table Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Table Filters Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.products.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">{t.common.all} Status</option>
              <option value="active">{t.products.statusActive}</option>
              <option value="low">{t.products.statusLow}</option>
              <option value="inactive">{t.products.statusInactive}</option>
            </select>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">{t.products.colProduct}</th>
                <th className="px-5 py-3.5 font-semibold">{t.products.colCategory}</th>
                <th className="px-5 py-3.5 font-semibold">{t.products.colCost}</th>
                <th className="px-5 py-3.5 font-semibold">{t.products.colPrice}</th>
                <th className="px-5 py-3.5 font-semibold">{t.products.colStock}</th>
                <th className="px-5 py-3.5 font-semibold">{t.products.colStatus}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{t.products.colActions}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((product) => {
                const isLow =
                  product.is_active && product.stock <= product.minStock;

                return (
                  <tr
                    key={product.id}
                    className={`transition hover:bg-slate-50 ${
                      !product.is_active ? "bg-slate-50/50 opacity-70" : ""
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Satuan: {product.unit} · Min: {product.minStock}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {product.category}
                    </td>

                    <td className="px-5 py-4 text-slate-600">
                      {formatRupiah(product.cost)}
                    </td>

                    <td className="px-5 py-4 font-bold text-slate-900">
                      {formatRupiah(product.price)}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      <span
                        className={
                          product.stock <= 0
                            ? "text-red-600 font-bold"
                            : isLow
                            ? "text-amber-600 font-bold"
                            : "text-slate-800"
                        }
                      >
                        {product.stock} {product.unit}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {!product.is_active ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
                          {t.products.statusInactive}
                        </span>
                      ) : isLow ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
                          {t.products.statusLow}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold text-emerald-800">
                          {t.products.statusAvailable}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(product)}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          {t.common.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleProductStatus(product)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                            product.is_active
                              ? "text-slate-400 hover:text-red-600"
                              : "text-emerald-700 hover:text-emerald-900 bg-emerald-50"
                          }`}
                        >
                          {product.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty / Loading */}
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.common.loading}
          </p>
        ) : filteredProducts.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {search || category !== t.common.all
              ? t.products.noProductsFound
              : t.products.emptyProductList}
          </p>
        ) : null}

        {/* Table footer count */}
        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-500">
          {t.products.showingCount
            .replace("{shown}", String(filteredProducts.length))
            .replace("{total}", String(products.length))}
        </div>
      </section>
    </AppLayout>
  );
}

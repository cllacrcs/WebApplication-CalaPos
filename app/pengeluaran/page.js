"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupiah, formatDateJakarta, getTodayJakarta } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconPlus,
  IconClose,
  IconRefresh,
} from "@/components/Icons";

const emptyExpenseForm = {
  description: "",
  amount: "",
  category: "Stok",
  expense_date: getTodayJakarta(),
  notes: "",
};

export default function PengeluaranPage() {
  const { t, language } = useLanguage();

  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyExpenseForm);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categoryOptions = [
    { id: "Stok", label: t.expenses.categoryStock },
    { id: "Kemasan", label: t.expenses.categoryPackaging },
    { id: "Operasional", label: t.expenses.categoryUtility },
    { id: "Transport", label: t.expenses.categoryTransport },
    { id: "Lainnya", label: t.expenses.categoryOther },
  ];

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setNotice("");

    const { data, error } = await supabase
      .from("expenses")
      .select("id, description, amount, category, expense_date, notes, created_at")
      .order("expense_date", { ascending: false });

    if (error) {
      console.error("Gagal mengambil data pengeluaran:", error);
      setNotice(`Gagal memuat pengeluaran: ${error.message}`);
      setExpenses([]);
      setLoading(false);
      return;
    }

    setExpenses(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((exp) => {
      const matchText =
        !q ||
        (exp.description || "").toLowerCase().includes(q) ||
        (exp.notes || "").toLowerCase().includes(q);
      const matchCat =
        categoryFilter === "all" || exp.category === categoryFilter;
      return matchText && matchCat;
    });
  }, [expenses, search, categoryFilter]);

  const totalExpenseAmount = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [filteredExpenses]
  );

  function openAddForm() {
    setEditingId(null);
    setForm({
      ...emptyExpenseForm,
      expense_date: getTodayJakarta(),
    });
    setNotice("");
    setShowForm(true);
  }

  function openEditForm(exp) {
    setEditingId(exp.id);
    setForm({
      description: exp.description || "",
      amount: String(exp.amount || ""),
      category: exp.category || "Stok",
      expense_date: exp.expense_date ? exp.expense_date.split("T")[0] : getTodayJakarta(),
      notes: exp.notes || "",
    });
    setNotice("");
    setShowForm(true);
  }

  async function handleDeleteExpense(id) {
    if (!window.confirm(t.expenses.deleteConfirm)) return;

    setNotice(t.common.saving);
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      setNotice(`Gagal menghapus: ${error.message}`);
      return;
    }

    setNotice("Catatan pengeluaran berhasil dihapus.");
    await loadExpenses();
  }

  async function handleSaveExpense(e) {
    e.preventDefault();
    setNotice("");

    const amt = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amt) || amt <= 0) {
      setNotice("Mohon isi keterangan dan nominal biaya yang valid.");
      return;
    }

    setSaving(true);
    const payload = {
      description: form.description.trim(),
      amount: amt,
      category: form.category,
      expense_date: form.expense_date || getTodayJakarta(),
      notes: form.notes.trim() || null,
    };

    try {
      let error;
      if (editingId !== null) {
        ({ error } = await supabase
          .from("expenses")
          .update(payload)
          .eq("id", editingId));
      } else {
        ({ error } = await supabase.from("expenses").insert(payload));
      }

      if (error) {
        setNotice(`Gagal menyimpan: ${error.message}`);
        return;
      }

      setShowForm(false);
      setEditingId(null);
      setForm(emptyExpenseForm);
      setNotice(t.expenses.saveSuccess);
      await loadExpenses();
    } catch (err) {
      setNotice(`${t.common.errorOccurred}: ${err.message || "Database error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout activePage="expenses" title={t.nav.expenses}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.expenses.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.expenses.subtitle}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadExpenses}
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
            <span>{t.expenses.addExpense}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.expenses.totalExpenses}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : formatRupiah(totalExpenseAmount)}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {filteredExpenses.length} {t.expenses.expenseCount.toLowerCase()}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {t.expenses.expenseCount}
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {loading ? "..." : filteredExpenses.length}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Tercatat di database
          </p>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div
          role="status"
          className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-800 shadow-xs"
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

      {/* Add / Edit Expense Form */}
      {showForm && (
        <form
          onSubmit={handleSaveExpense}
          className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs animate-in fade-in duration-150"
        >
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              {editingId !== null
                ? t.expenses.formEditTitle
                : t.expenses.formTitle}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
              {t.expenses.fieldDescription} *
              <input
                required
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Contoh: Beli kemasan plastik 500 pcs"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.expenses.fieldAmount} *
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="Contoh: 75000"
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.expenses.fieldCategory} *
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-normal outline-none focus:border-slate-500"
              >
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold text-slate-700">
              {t.expenses.fieldDate} *
              <input
                required
                type="date"
                value={form.expense_date}
                onChange={(e) =>
                  setForm({ ...form, expense_date: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-slate-500"
              />
            </label>

            <label className="text-xs font-semibold text-slate-700 sm:col-span-3">
              {t.expenses.fieldNotes}
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan tambahan seperti nama toko atau nota..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-normal outline-none focus:border-slate-500"
              />
            </label>
          </div>

          <div className="mt-5 flex gap-2 pt-3 border-t border-slate-100">
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

      {/* Expenses Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {/* Filter bar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari keterangan pengeluaran..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none"
            >
              <option value="all">{t.common.all} Kategori</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table content */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-5 py-3.5 font-semibold">{t.expenses.colDescription}</th>
                <th className="px-5 py-3.5 font-semibold">{t.expenses.colCategory}</th>
                <th className="px-5 py-3.5 font-semibold">{t.expenses.colDate}</th>
                <th className="px-5 py-3.5 font-semibold">{t.expenses.colAmount}</th>
                <th className="px-5 py-3.5 font-semibold">{t.expenses.colNotes}</th>
                <th className="px-5 py-3.5 font-semibold text-right">{t.common.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50 transition">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">
                    {exp.description}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {formatDateJakarta(exp.expense_date, language)}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-900">
                    {formatRupiah(exp.amount)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                    {exp.notes || "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(exp)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        {t.common.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-red-500 hover:text-red-700 font-semibold"
                      >
                        {t.common.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.common.loading}
          </p>
        ) : filteredExpenses.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">
            {t.expenses.noExpenses}
          </p>
        ) : null}

        <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-500 flex justify-between">
          <span>{filteredExpenses.length} catatan pengeluaran</span>
          <span className="font-bold text-slate-900">
            Total: {formatRupiah(totalExpenseAmount)}
          </span>
        </div>
      </section>
    </AppLayout>
  );
}

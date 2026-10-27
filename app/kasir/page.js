"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatRupiah, formatDateTimeJakarta } from "@/lib/i18n";
import AppLayout from "@/components/AppLayout";
import {
  IconCart,
  IconPrinter,
  IconAlertTriangle,
  IconCheck,
  IconRefresh,
  IconProducts,
} from "@/components/Icons";

export default function KasirPage() {
  const { t, language } = useLanguage();

  // State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productError, setProductError] = useState("");

  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");

  const [customerName, setCustomerName] = useState("");
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState("tunai"); // tunai, qris, transfer, debit
  const [payment, setPayment] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Receipt Modal state
  const [completedSale, setCompletedSale] = useState(null);

  // Load products from Supabase
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    setProductError("");

    const { data, error } = await supabase
      .from("products")
      .select("id, name, category, selling_price, stock_quantity, stock_unit, is_active")
      .eq("is_active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Gagal mengambil produk:", error);
      setProductError(
        error.message || "Produk gagal dimuat. Silakan periksa koneksi database."
      );
      setLoadingProducts(false);
      return;
    }

    const mappedProducts = (data || []).map((product) => ({
      id: product.id,
      name: product.name,
      category: product.category || "Snack",
      price: Number(product.selling_price || 0),
      stock: Number(product.stock_quantity || 0),
      unit: product.stock_unit || "bungkus",
    }));

    setProducts(mappedProducts);
    setLoadingProducts(false);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Categories list
  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);
    return [t.cashier.allCategories, ...unique];
  }, [products, t.cashier.allCategories]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch = !q || product.name.toLowerCase().includes(q);
      const matchesCategory =
        category === t.cashier.allCategories ||
        category === "Semua" ||
        product.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, category, t.cashier.allCategories]);

  // Cart total
  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  // Numeric payment and change calculation
  const paid = Number(payment) || 0;
  const change = Math.max(0, paid - total);

  // When payment method changes, automatically handle non-cash exact amounts
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    if (method !== "tunai") {
      setPayment(String(total));
    }
  };

  // Quick denomination adder for cash
  const handleAddNominal = (nominal) => {
    const current = Number(payment) || 0;
    setPayment(String(current + nominal));
  };

  // Add product to cart
  function addToCart(product) {
    setNotice("");

    const existing = cart.find((item) => item.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > product.stock) {
      setNotice(`${t.cashier.exceedStockNotice} (${product.name}: ${product.stock} ${product.unit})`);
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
      setCart([
        ...cart,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          unit: product.unit,
          quantity: 1,
          maxStock: product.stock,
        },
      ]);
    }
  }

  // Update item quantity in cart
  function updateQuantity(id, delta) {
    setNotice("");
    const item = cart.find((p) => p.id === id);
    const product = products.find((p) => p.id === id);

    if (!item) return;

    const nextQty = item.quantity + delta;

    if (nextQty <= 0) {
      setCart(cart.filter((p) => p.id !== id));
      return;
    }

    const availableStock = product ? product.stock : item.maxStock;
    if (nextQty > availableStock) {
      setNotice(t.cashier.exceedStockNotice);
      return;
    }

    setCart(
      cart.map((p) =>
        p.id === id ? { ...p, quantity: nextQty } : p
      )
    );
  }

  // Clear cart
  function handleClearCart() {
    setCart([]);
    setPayment("");
    setNotice("");
  }

  // Complete checkout
  async function finishTransaction() {
    setNotice("");

    if (cart.length === 0) {
      setNotice(t.cashier.cartEmptyNotice);
      return;
    }

    const finalPaid = paymentMethod === "tunai" ? paid : total;

    if (finalPaid < total) {
      setNotice(t.cashier.insufficientPayment);
      return;
    }

    setIsSubmitting(true);
    setNotice(t.cashier.processing);

    try {
      // 1. Call atomic complete_sale RPC
      const { data, error } = await supabase.rpc("complete_sale", {
        p_payment_amount: finalPaid,
        p_items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      });

      if (error) {
        console.error("Gagal menyimpan transaksi:", error);
        setNotice(`${t.common.errorOccurred}: ${error.message}`);
        setIsSubmitting(false);
        return;
      }

      // 2. Update payment_method on the newly created sale record
      if (data && data.receipt_number) {
        await supabase
          .from("sales")
          .update({ payment_method: paymentMethod })
          .eq("receipt_number", data.receipt_number);
      }

      // 3. Prepare receipt data for the receipt modal
      const receiptData = {
        receipt_number: data.receipt_number,
        total: Number(data.total || total),
        payment_amount: finalPaid,
        change_amount: Number(data.change_amount || Math.max(0, finalPaid - total)),
        payment_method: paymentMethod,
        customer_name: isCustomCustomer && customerName.trim() ? customerName.trim() : t.cashier.walkInCustomer,
        created_at: new Date().toISOString(),
        items: [...cart],
      };

      // 4. Update local product stock
      setProducts((currentProducts) =>
        currentProducts.map((p) => {
          const cartItem = cart.find((c) => c.id === p.id);
          return cartItem
            ? { ...p, stock: Math.max(0, p.stock - cartItem.quantity) }
            : p;
        })
      );

      // 5. Reset cashier form and show receipt
      setCart([]);
      setPayment("");
      setCustomerName("");
      setIsCustomCustomer(false);
      setCompletedSale(receiptData);
    } catch (err) {
      console.error("Kesalahan checkout:", err);
      setNotice(`${t.common.errorOccurred}: ${err.message || "Gagal menghubungi database."}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AppLayout activePage="cashier" title={t.nav.cashier}>
      {/* Title & Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {t.cashier.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.cashier.subtitle}
          </p>
        </div>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loadingProducts}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
        >
          <IconRefresh className="h-3.5 w-3.5" />
          <span>{loadingProducts ? t.common.loading : t.common.reload}</span>
        </button>
      </div>

      {/* Main Grid: Catalog (Left) + Cart & Payment (Right) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Section: Product Catalog */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-xs">
          {/* Search Input */}
          <div className="mb-4">
            <label
              htmlFor="product-search"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              {t.common.search}
            </label>
            <input
              id="product-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.cashier.searchPlaceholder}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-100"
            />
          </div>

          {/* Category Tabs */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  category === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Loading / Error States */}
          {loadingProducts && (
            <p className="py-12 text-center text-sm text-slate-400">
              {t.common.loading}
            </p>
          )}

          {productError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {productError}
            </div>
          )}

          {/* Products Grid */}
          {!loadingProducts && !productError && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => {
                const isOutOfStock = product.stock <= 0;
                const inCart = cart.find((item) => item.id === product.id);

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={isOutOfStock || isSubmitting}
                    className={`group relative flex flex-col justify-between rounded-xl border p-3.5 text-left transition ${
                      isOutOfStock
                        ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                        : inCart
                        ? "border-slate-900 bg-slate-50/50 shadow-xs hover:border-black"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs"
                    }`}
                  >
                    <div>
                      {/* Icon & Category Tag */}
                      <div className="mb-3 flex items-center justify-between">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                          <IconProducts className="h-4 w-4" />
                        </span>
                        {inCart && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {inCart.quantity}
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-slate-900 text-sm line-clamp-2 leading-snug">
                        {product.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {product.category}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-900">
                        {formatRupiah(product.price)}
                      </span>
                      <span
                        className={`text-[11px] font-medium ${
                          isOutOfStock
                            ? "text-red-500 font-semibold"
                            : product.stock <= 5
                            ? "text-amber-600"
                            : "text-slate-400"
                        }`}
                      >
                        {isOutOfStock
                          ? t.cashier.outOfStock
                          : `${product.stock} ${product.unit}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {!loadingProducts && !productError && filteredProducts.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400">
              {t.products.noProductsFound}
            </div>
          )}
        </section>

        {/* Right Section: Shopping Cart & Checkout */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs lg:sticky lg:top-24">
          {/* Cart Header */}
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {t.cashier.cartTitle}
              </h2>
              <p className="text-xs text-slate-400">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} {t.cashier.cartItemCount}
              </p>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={handleClearCart}
                className="text-xs font-medium text-slate-400 hover:text-red-600 transition"
              >
                {t.cashier.clearCart}
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="max-h-64 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {cart.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center">
                <span className="mb-2 flex justify-center text-slate-300">
                  <IconCart className="h-8 w-8" />
                </span>
                <p className="text-xs font-semibold text-slate-600">
                  {t.cashier.emptyCart}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  {t.cashier.emptyCartDesc}
                </p>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-100 bg-slate-50/40 p-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {formatRupiah(item.price)} / {item.unit}
                      </p>
                    </div>
                    <p className="text-xs font-bold text-slate-900">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100"
                        aria-label={`Kurangi ${item.name}`}
                      >
                        −
                      </button>
                      <span className="min-w-6 text-center text-xs font-bold text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-100"
                        aria-label={`Tambah ${item.name}`}
                      >
                        +
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, -item.quantity)}
                      className="text-[11px] text-red-500 hover:text-red-700"
                    >
                      {t.common.delete}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Customer Selection */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-slate-600">
                {t.cashier.customerType}
              </span>
              <button
                type="button"
                onClick={() => setIsCustomCustomer(!isCustomCustomer)}
                className="text-[11px] text-slate-500 underline"
              >
                {isCustomCustomer ? t.cashier.walkInCustomer : t.cashier.customCustomer}
              </button>
            </div>
            {isCustomCustomer ? (
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder={t.cashier.customerNamePlaceholder}
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-slate-500"
              />
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                {t.cashier.walkInCustomer}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t.cashier.paymentMethodLabel}
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "tunai", label: t.cashier.methodCash },
                { id: "qris", label: t.cashier.methodQris },
                { id: "transfer", label: t.cashier.methodTransfer },
                { id: "debit", label: t.cashier.methodDebit },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handlePaymentMethodChange(m.id)}
                  className={`rounded-xl border py-2 px-2.5 text-xs font-semibold transition ${
                    paymentMethod === m.id
                      ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {paymentMethod !== "tunai" && (
              <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200/60">
                <IconAlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                <span>{t.cashier.manualNotice}</span>
              </div>
            )}
          </div>

          {/* Subtotal & Payment Calculation */}
          <div className="mt-4 space-y-2.5 border-t border-slate-200 pt-3 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">{t.common.subtotal}</span>
              <span className="text-base font-bold text-slate-900">
                {formatRupiah(total)}
              </span>
            </div>

            {/* Cash input only if paymentMethod is cash */}
            {paymentMethod === "tunai" ? (
              <div>
                <label
                  htmlFor="payment-input"
                  className="mb-1 block font-semibold text-slate-700"
                >
                  {t.cashier.paymentAmount}
                </label>
                <input
                  id="payment-input"
                  type="number"
                  min="0"
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  placeholder={t.cashier.paymentPlaceholder}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-100"
                />

                {/* Quick denomination buttons */}
                <div className="mt-2 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => setPayment(String(total))}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    {t.cashier.exactAmount}
                  </button>
                  {[10000, 20000, 50000, 100000].map((nominal) => (
                    <button
                      key={nominal}
                      type="button"
                      onClick={() => handleAddNominal(nominal)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      +{formatRupiah(nominal)}
                    </button>
                  ))}
                </div>

                <div className="mt-3 flex justify-between items-center text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">{t.cashier.change}</span>
                  <span
                    className={`font-bold text-sm ${
                      paid >= total && total > 0 ? "text-emerald-600" : "text-slate-400"
                    }`}
                  >
                    {formatRupiah(change)}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Error or validation notice */}
            {notice && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900"
              >
                {notice}
              </div>
            )}

            {/* Checkout Action Button */}
            <button
              type="button"
              onClick={finishTransaction}
              disabled={isSubmitting || cart.length === 0}
              className="mt-3 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? t.cashier.processing : t.cashier.finishSale}
            </button>
          </div>
        </section>
      </div>

      {/* SUCCESS RECEIPT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-xs">
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Printable Receipt Area */}
            <div className="text-center pb-4 border-b border-dashed border-slate-200">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-lg font-bold text-white">
                C
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                {t.common.appName}
              </h2>
              <p className="text-xs text-slate-400">{t.common.shopSubtitle}</p>
              <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                <p>
                  {t.cashier.receiptNo}: <strong>{completedSale.receipt_number}</strong>
                </p>
                <p>{formatDateTimeJakarta(completedSale.created_at, language)}</p>
                <p>
                  {t.cashier.customerType}: {completedSale.customer_name}
                </p>
              </div>
            </div>

            {/* Itemized List */}
            <div className="my-4 max-h-48 overflow-y-auto space-y-2 border-b border-dashed border-slate-200 pb-3 text-xs">
              {completedSale.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {item.quantity} {item.unit} × {formatRupiah(item.price)}
                    </p>
                  </div>
                  <p className="font-medium text-slate-900">
                    {formatRupiah(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals & Payment */}
            <div className="space-y-1.5 text-xs pb-4 border-b border-dashed border-slate-200">
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>{t.common.total}</span>
                <span>{formatRupiah(completedSale.total)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.cashier.paymentMethodLabel}</span>
                <span className="uppercase font-medium text-slate-800">
                  {completedSale.payment_method}
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.history.cashReceived}</span>
                <span>{formatRupiah(completedSale.payment_amount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>{t.cashier.change}</span>
                <span className="font-semibold text-emerald-700">
                  {formatRupiah(completedSale.change_amount)}
                </span>
              </div>
            </div>

            {/* Footer Thank You */}
            <div className="mt-3 text-center text-[11px] text-slate-400">
              <p>{t.cashier.thankYou}</p>
              <p>{t.cashier.keepReceipt}</p>
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
                onClick={() => setCompletedSale(null)}
                className="flex items-center justify-center gap-1.5 flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 shadow-2xs"
              >
                <IconCheck className="h-4 w-4" />
                <span>{t.cashier.newTransaction}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

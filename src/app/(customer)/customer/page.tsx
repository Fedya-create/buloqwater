"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, cn } from "@/lib/utils";
import { getCustomerProducts } from "@/actions/customer-order-actions";
import { CustomerCart } from "./components/cart";

type Category = "ALL" | "WATER" | "PROMO" | "ACCESSORIES";

interface Product {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  category: string;
  isBottle: boolean;
  isActive: boolean;
  company?: { name: string };
}

export default function CustomerStorePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<Category>("ALL");
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const r = await getCustomerProducts();
      if (r.success && r.data) setProducts(r.data as any);
      setLoading(false);
    })();
  }, []);

  const addToCart = (productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) newCart[productId]--;
      else delete newCart[productId];
      return newCart;
    });
  };

  const cartItems = Object.entries(cart).map(([productId, quantity]) => {
    const product = products.find((p) => p.id === productId);
    return { productId, quantity, product };
  }).filter((item) => item.product);

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.product!.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = activeCategory === "ALL"
    ? products
    : products.filter((p) => p.category === activeCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-10 w-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-primary-500 to-blue-600">
        <div className="px-6 py-8 sm:px-10 sm:py-12 text-white relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Toza Suv — Sog'lom Hayot 💧</h1>
          <p className="text-sm sm:text-base text-white/80 mb-4 max-w-md">
            Eng sifatli tog' suvlarini uyingizgacha yetkazib beramiz. Bugun buyurtma bering — ertaga eshigingizda!
          </p>
          <Button className="bg-white text-primary-600 hover:bg-gray-100 shadow-lg" onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
            🛒 Buyurtma berish
          </Button>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 opacity-20">
          <img src="/image.png" alt="" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2" id="products">
        {([
          { key: "ALL", label: "Barchasi", icon: "🏪" },
          { key: "WATER", label: "Suvlar", icon: "💧" },
          { key: "PROMO", label: "Aksiyalar", icon: "🔥" },
          { key: "ACCESSORIES", label: "Aksessuarlar", icon: "🔧" },
        ] as { key: Category; label: string; icon: string }[]).map((cat) => (
          <button
            key={cat.key}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeCategory === cat.key
                ? "bg-primary-500 text-white shadow-md"
                : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            )}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            <p className="text-4xl mb-2">📦</p>
            <p>Bu toifada mahsulot yo'q</p>
          </div>
        ) : (
          filteredProducts.map((product) => {
            const inCart = cart[product.id] || 0;
            return (
              <div
                key={product.id}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden",
                  inCart > 0 ? "border-primary-300 dark:border-primary-600 ring-1 ring-primary-100" : "border-gray-100 dark:border-gray-700"
                )}
              >
                {/* Product Image */}
                <div className="h-32 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center relative overflow-hidden">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl">{product.category === "WATER" ? "💧" : product.category === "PROMO" ? "🔥" : product.category === "ACCESSORIES" ? "🔧" : "💧"}</span>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      product.category === "WATER" ? "bg-blue-100 text-blue-700 border-blue-200" :
                      product.category === "PROMO" ? "bg-orange-100 text-orange-700 border-orange-200" :
                      "bg-gray-100 text-gray-700 border-gray-200"
                    }`}>
                      {product.category === "WATER" ? "💧 Suv" : product.category === "PROMO" ? "🔥 Aksiya" : "🔧 Aksessuar"}
                    </span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(product.price)}</p>
                      {product.isBottle && (
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">🫙 Baxla hisoblanadi</span>
                      )}
                    </div>

                    {/* Add/Remove buttons */}
                    {inCart > 0 ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(product.id)}
                          className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold hover:bg-gray-200 active:scale-90 transition-all"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-gray-900 dark:text-white">{inCart}</span>
                        <button
                          onClick={() => addToCart(product.id)}
                          className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold hover:bg-primary-600 active:scale-90 transition-all"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product.id)}
                        className="px-4 py-2 bg-primary-500 text-white text-xs font-medium rounded-full hover:bg-primary-600 active:scale-95 transition-all shadow-sm"
                      >
                        + Savatga
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Cart */}
      {totalItems > 0 && (
        <CustomerCart
          items={cartItems as any}
          totalAmount={totalAmount}
          totalItems={totalItems}
          onClear={() => setCart({})}
        />
      )}
    </div>
  );
}

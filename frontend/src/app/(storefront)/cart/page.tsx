"use client";
import { useEffect, useState } from "react";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { CartPanel } from "@/components/sections/CartPanel";
import type { CartLine, Product } from "@/types/product";
import { getAllProducts } from "@/services/api/products";
import { getOrCreateGuestCart, removeCartItem, updateCartItem, type ApiCart } from "@/services/api/cart";

function toCartLines(cart: ApiCart, products: Product[]): CartLine[] {
  return cart.lineItems.filter((item) => !item.savedForLater).flatMap((item) => {
    const product = products.find((p) => p.shades?.some((shade) => shade.id === item.variantId));
    if (!product) return [];
    const shade = product.shades?.find((s) => s.id === item.variantId);
    return [{
      productId: item.id,
      productName: product.name,
      shadeName: shade?.name,
      quantity: item.quantity,
      unitPrice: product.salePrice ?? product.price,
      imageUrl: product.imageUrl,
    }];
  });
}

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refreshCart() {
    setLoading(true);
    setError(null);
    try {
      const [cart, products] = await Promise.all([getOrCreateGuestCart(), getAllProducts()]);
      setLines(toCartLines(cart, products));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your cart.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refreshCart(); }, []);

  async function changeQuantity(lineItemId: string, quantity: number) {
    try {
      await updateCartItem(lineItemId, quantity);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update your cart.");
    }
  }

  async function removeItem(lineItemId: string) {
    try {
      await removeCartItem(lineItemId);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove the item.");
    }
  }

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Your Cart</h1>
      {error && <p role="alert" className="mt-4 rounded-md bg-paper p-3 text-[13px] leading-[18px] text-error">{error}</p>}
      <div className="mt-6">
        {loading ? <p className="text-base text-stone">Loading your cart…</p> : <CartPanel lines={lines} onQuantityChange={changeQuantity} onRemove={removeItem} />}
      </div>
    </div>
  );
}

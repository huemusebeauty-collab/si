"use client";
import { useState } from "react";
import { Breadcrumb } from "@/components/patterns/Breadcrumb";
import { CartPanel } from "@/components/sections/CartPanel";
import type { CartLine } from "@/types/product";

// Cart page — client component: cart state is inherently interactive
// (quantity changes, removal) and, per Sprint 2 scope, held in local
// component state against mock lines. Real persisted cart state (Sprint
// 2.9's `state/` folder — e.g. a CartContext) lands with the first
// feature that needs cross-page cart persistence.
const INITIAL_LINES: CartLine[] = [
  {
    productId: "p-001",
    productName: "Muse Rose Nail Lacquer",
    shadeName: "Muse Rose",
    quantity: 2,
    unitPrice: 18,
    imageUrl: "/mock/product-001.jpg",
  },
];

export default function CartPage() {
  const [lines, setLines] = useState<CartLine[]>(INITIAL_LINES);

  return (
    <div className="py-6">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cart" }]} />
      <h1 className="mt-4 font-display text-[32px] leading-10 font-semibold text-ink">Your Cart</h1>
      <div className="mt-6">
        <CartPanel
          lines={lines}
          onQuantityChange={(id, qty) =>
            setLines((ls) => ls.map((l) => (l.productId === id ? { ...l, quantity: qty } : l)))
          }
          onRemove={(id) => setLines((ls) => ls.filter((l) => l.productId !== id))}
        />
      </div>
    </div>
  );
}

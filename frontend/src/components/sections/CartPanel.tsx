"use client";
import Image from "next/image";
import { QuantitySelector } from "@/components/composite/QuantitySelector";
import { EmptyState } from "@/components/patterns/EmptyState";
import { Button } from "@/components/basic/Button";
import type { CartLine } from "@/types/product";
import { formatCurrency } from "@/utils/formatCurrency";

export function CartPanel({
  lines,
  onQuantityChange,
  onRemove,
}: {
  lines: CartLine[];
  onQuantityChange: (productId: string, next: number) => void;
  onRemove: (productId: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <EmptyState
        heading="Your cart is empty"
        body="Browse the collection to find your next favorite shade."
        actionLabel="Shop Now"
        onAction={() => {
          window.location.href = "/shop";
        }}
      />
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
      <ul className="flex flex-col divide-y divide-fog sm:col-span-2">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-4 py-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md bg-paper">
              <Image src={line.imageUrl} alt={line.productName} fill sizes="96px" className="object-cover" />
            </div>
            <div className="flex flex-1 flex-col justify-between">
              <div>
                <p className="font-semibold text-ink">{line.productName}</p>
                {line.shadeName && <p className="text-[13px] leading-[18px] text-stone">{line.shadeName}</p>}
              </div>
              <div className="flex items-center justify-between">
                <QuantitySelector value={line.quantity} onChange={(n) => onQuantityChange(line.productId, n)} />
                <span className="font-semibold text-ink">{formatCurrency(line.unitPrice * line.quantity)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRemove(line.productId)}
              className="self-start text-[13px] leading-[18px] text-stone hover:text-error"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <div className="h-fit rounded-md bg-white p-6 shadow-rest">
        <div className="flex justify-between text-base text-ink">
          <span>Subtotal</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
        </div>
        <p className="mt-1 text-[13px] leading-[18px] text-stone">Shipping and taxes calculated at checkout.</p>
        <Button variant="primary" fullWidth className="mt-4">
          Checkout
        </Button>
      </div>
    </div>
  );
}

import { Icon } from "@/components/basic/Icon";

// Trust Signal Strip — Phase 4 §17 Reusable Patterns / §8 Information
// Card. Trust/guarantee messaging (free shipping, returns, secure
// checkout) used across PDP and cart.
const SIGNALS = [
  { label: "Free shipping over Rs 500" },
  { label: "30-day returns" },
  { label: "Secure checkout" },
  { label: "Cruelty-free formulas" },
];

export function TrustSignalStrip() {
  return (
    <ul className="flex flex-wrap justify-center gap-6 border-y border-fog bg-paper px-4 py-6">
      {SIGNALS.map((s) => (
        <li key={s.label} className="flex items-center gap-2 text-[13px] leading-[18px] text-charcoal">
          <Icon size={16} label="">
            <path d="M20 6 9 17l-5-5" />
          </Icon>
          {s.label}
        </li>
      ))}
    </ul>
  );
}

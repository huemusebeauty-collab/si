import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Sprint 7 — Shipping Settings (Phase 6 §10: "Configure available
// shipping methods, rates, and delivery estimate ranges shown in Cart
// and Checkout"). Sprint 7 scope: stores the configuration Cart's
// `estimateShipping` (Sprint 3/4 stub — see cart.service.ts) would read
// from once it's wired up (Known Issues — the stub still returns
// "not yet implemented" regardless of what's configured here).
@Entity("shipping_zones")
export class ShippingZoneEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string; // e.g. "Continental US", "Alaska & Hawaii"

  @Column({ type: "jsonb" })
  regions!: string[]; // region/state codes covered

  @Column({ type: "jsonb" })
  methods!: { name: string; rate: number; estimatedDaysMin: number; estimatedDaysMax: number }[];

  @Column({ default: true })
  active!: boolean;
}

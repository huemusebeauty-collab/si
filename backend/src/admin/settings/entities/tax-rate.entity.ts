import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Sprint 7 — Tax Settings (Phase 6 §10: "Configure applicable tax
// rates by region as required for order calculation"). Sprint 7 scope:
// stores the configuration; actual order-total tax calculation wiring
// into OrdersService.createOrder is flagged in Known Issues as a
// Sprint 8+ addition (Sprint 4's order total computation doesn't
// currently apply tax — this entity makes rates configurable but
// doesn't yet change checkout math).
@Entity("tax_rates")
export class TaxRateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  region!: string; // e.g. "US-CA", "US-NY" — state/province code

  @Column({ type: "decimal", precision: 5, scale: 4 })
  rate!: string; // e.g. "0.0725" for 7.25%

  @Column({ default: true })
  active!: boolean;
}

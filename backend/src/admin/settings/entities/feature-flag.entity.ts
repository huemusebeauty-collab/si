import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

// Sprint 7.5 — Feature Flags. Did not exist at all before this sprint.
// Keyed by a stable string (not a UUID) since flags are referenced by
// name in code (`isFeatureEnabled("reviews.mediaUploads")`), not looked
// up by a generated ID a caller would have to know in advance.
@Entity("feature_flags")
export class FeatureFlagEntity {
  @PrimaryColumn()
  key!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: "text", nullable: true })
  description?: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

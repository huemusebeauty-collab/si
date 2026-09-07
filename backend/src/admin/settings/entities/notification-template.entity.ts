import { Column, Entity, PrimaryColumn, UpdateDateColumn } from "typeorm";

// Sprint 7.5 — Notification Templates, DB-backed at last. Flagged as a
// gap since Sprint 7.3 (validator existed with nothing to validate
// against) and Sprint 7.4 (QA'd the 5 hardcoded Sprint 5.4 templates
// with no path to ever edit them). `templateKey` matches
// EMAIL_TEMPLATES' object keys exactly (`welcome`, `orderConfirmation`,
// etc.) — EmailService checks this table FIRST and falls back to the
// hardcoded template only if no row exists, so a missing/never-seeded
// row never breaks transactional email (see EmailService's own
// comment for the fallback logic).
@Entity("notification_templates")
export class NotificationTemplateEntity {
  @PrimaryColumn()
  templateKey!: string;

  @Column()
  subject!: string;

  @Column({ type: "text" })
  html!: string;

  @Column({ type: "text" })
  text!: string;

  @Column({ nullable: true })
  lastEditedByAdminId?: string;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}

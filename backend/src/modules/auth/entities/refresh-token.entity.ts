import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// Sprint 3.3 — Authentication Foundation / Sprint 3.4 — refresh-token
// architecture. Tokens are stored hashed (never the raw token), per the
// same principle Phase 16 §16.2 applies to passwords.
@Entity("refresh_tokens")
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  customerId!: string;

  @Column()
  tokenHash!: string;

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

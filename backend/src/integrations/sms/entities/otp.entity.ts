import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// Sprint 5.5 — OTP generation/verification/expiry. Code is stored
// hashed (same principle as password storage — Sprint 3's
// password.util.ts, reused here) so a database read alone never
// reveals a usable code.
@Entity("otp_codes")
export class OtpEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column()
  phoneNumber!: string;

  @Column()
  codeHash!: string;

  @Column()
  purpose!: string; // "login" | "order-verification" | ...

  @Column({ type: "timestamptz" })
  expiresAt!: Date;

  @Column({ default: false })
  consumed!: boolean;

  @Column({ default: 0 })
  attemptCount!: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

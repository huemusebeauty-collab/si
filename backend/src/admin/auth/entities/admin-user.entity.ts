import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AdminRole } from "../../common/admin-role";

@Entity("admin_users")
export class AdminUserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index({ unique: true })
  @Column()
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  firstName!: string;

  @Column()
  lastName!: string;

  @Column({ type: "varchar" })
  role!: AdminRole;

  @Column({ default: true })
  active!: boolean;

  @Column({ type: "varchar", nullable: true })
  phoneNumber?: string;

  @Column({ type: "varchar", nullable: true })
  otpHash?: string;

  @Column({ type: "timestamptz", nullable: true })
  otpExpiresAt?: Date;

  @Column({ type: "integer", default: 0 })
  otpAttempts!: number;

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

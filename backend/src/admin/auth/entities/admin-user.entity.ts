import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";
import { AdminRole } from "../../common/admin-role";

// Sprint 6 — Admin identity is a genuinely separate realm from Customer
// (Phase 8 §3 draws this boundary; Sprint 3's AuthService already
// reserved `validateAdminSession` as a deferred method for exactly this
// reason). This fixes a real latent bug carried since Sprint 3:
// `@Roles("admin")` has been checked on every admin-gated endpoint
// across Sprints 3-5, but no code path has ever issued a JWT with
// role "admin" (or anything but "customer") — meaning every one of
// those guards has been unsatisfiable by any real login until this
// entity/auth flow exists. See RolesGuard's compatibility fix and
// SPRINT_6_VALIDATION.md for the full account.
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

  @Column({ type: "timestamptz", nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}

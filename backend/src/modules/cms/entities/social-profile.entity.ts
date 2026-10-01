import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("social_profiles")
@Unique(["platform"])
export class SocialProfileEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  platform!: string;

  @Column()
  profileUrl!: string;

  @Column({ default: true })
  enabled!: boolean;

  @Column({ type: "int", default: 0 })
  displayOrder!: number;
}

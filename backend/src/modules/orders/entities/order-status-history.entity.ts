import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { OrderEntity, type OrderStatus } from "./order.entity";

@Entity("order_status_history")
export class OrderStatusHistoryEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => OrderEntity, (order) => order.statusHistory, { onDelete: "CASCADE" })
  order!: OrderEntity;

  @Column({ type: "varchar" })
  status!: OrderStatus;

  @CreateDateColumn({ type: "timestamptz" })
  changedAt!: Date;
}

import { Column, Entity, PrimaryColumn } from "typeorm";

@Entity("invoice_sequences")
export class InvoiceSequenceEntity {
  @PrimaryColumn({ type: "varchar", length: 9 })
  financialYear!: string;

  @Column({ type: "integer", default: 1 })
  nextNumber!: number;
}

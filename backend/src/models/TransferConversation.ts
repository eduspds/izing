/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  DataType
} from "sequelize-typescript";
/* eslint-disable @typescript-eslint/no-unused-vars */
import Ticket from "./Ticket";

@Table({ tableName: "MensagemTransferencias" })
class MensagemTransferencia extends Model<MensagemTransferencia> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  mensagemTransferencia: string;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MensagemTransferencia;

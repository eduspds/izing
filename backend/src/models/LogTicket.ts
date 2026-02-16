import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey,
  AllowNull,
  AutoIncrement
} from "sequelize-typescript";
import Ticket from "./Ticket";
import User from "./User";
import Queue from "./Queue";

@Table
class LogTicket extends Model<LogTicket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column(DataType.TEXT)
  type: string;

  @AllowNull
  @Column(DataType.TEXT)
  description: string;

  @AllowNull
  @Column(DataType.JSON)
  metadata: object;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Ticket)
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => User)
  @Default(null)
  @AllowNull
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => User)
  @Default(null)
  @AllowNull
  @Column
  toUserId: number;

  @BelongsTo(() => User, "toUserId")
  toUser: User;

  @ForeignKey(() => Queue)
  @AllowNull
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Queue)
  @AllowNull
  @Column
  fromQueueId: number;

  @BelongsTo(() => Queue, "fromQueueId")
  fromQueue: Queue;
}

export default LogTicket;

import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AutoIncrement
} from "sequelize-typescript";
import FastReply from "./FastReply";
import Queue from "./Queue";

@Table({ freezeTableName: true })
class FastReplyQueues extends Model<FastReplyQueues> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => FastReply)
  @Column
  fastReplyId: number;

  @BelongsTo(() => FastReply)
  fastReply: FastReply;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  tableName: "FastReplyQueues";
}

export default FastReplyQueues;


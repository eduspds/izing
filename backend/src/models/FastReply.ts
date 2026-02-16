import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  BelongsToMany,
  AutoIncrement,
  AllowNull
} from "sequelize-typescript";
import Tenant from "./Tenant";
import User from "./User";
import Queue from "./Queue";
import FastReplyQueues from "./FastReplyQueues";

@Table({ freezeTableName: true })
class FastReply extends Model<FastReply> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  key: string;

  @AllowNull(false)
  @Column
  message: string;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @BelongsToMany(() => Queue, () => FastReplyQueues, "fastReplyId", "queueId")
  queues: Queue[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  tableName: "FastReply";
}

export default FastReply;

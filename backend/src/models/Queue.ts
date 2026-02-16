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
  Default
} from "sequelize-typescript";
import Tenant from "./Tenant";
import User from "./User";
import Tags from "./Tag";
import TagQueues from "./TagQueues";
import FastReply from "./FastReply";
import FastReplyQueues from "./FastReplyQueues";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  queue: string;

  @Default(true)
  @Column
  isActive: boolean;

  @Default(false)
  @Column
  isConfidential: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

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

  @BelongsToMany(() => Tags, () => TagQueues, "queueId", "tagId")
  tags: Tags[];

  @BelongsToMany(() => FastReply, () => FastReplyQueues, "queueId", "fastReplyId")
  fastReplies: FastReply[];
}

export default Queue;

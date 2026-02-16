import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  BelongsTo,
  ForeignKey,
  AutoIncrement
} from "sequelize-typescript";
import InternalMessage from "./InternalMessage";
import User from "./User";

@Table({ tableName: "MessageReadReceipts" })
class MessageReadReceipt extends Model<MessageReadReceipt> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => InternalMessage)
  @Column
  messageId: number;

  @BelongsTo(() => InternalMessage)
  message: InternalMessage;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @Column(DataType.DATE(6))
  readAt: Date;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default MessageReadReceipt;


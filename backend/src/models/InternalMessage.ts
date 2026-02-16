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
  AutoIncrement,
  HasMany
} from "sequelize-typescript";
import User from "./User";
import InternalGroup from "./InternalGroup";
import Tenant from "./Tenant";
import type MessageReadReceipt from "./MessageReadReceipt";

@Table({ tableName: "InternalMessages" })
class InternalMessage extends Model<InternalMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column
  senderId: number;

  @BelongsTo(() => User, { as: "sender", foreignKey: "senderId" })
  sender: User;

  @AllowNull(true)
  @ForeignKey(() => User)
  @Column
  recipientId: number;

  @BelongsTo(() => User, { as: "recipient", foreignKey: "recipientId" })
  recipient: User;

  @AllowNull(true)
  @ForeignKey(() => InternalGroup)
  @Column
  groupId: number;

  @BelongsTo(() => InternalGroup, { foreignKey: "groupId" })
  group: InternalGroup;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      const { BACKEND_URL, PROXY_PORT } = process.env;
      const value = this.getDataValue("mediaUrl");
      
      if (!BACKEND_URL) {
        return `/public/${value}`;
      }
      
      // Se BACKEND_URL já tiver porta, não adicionar novamente
      const baseUrl = BACKEND_URL.includes(":")
        ? BACKEND_URL
        : `${BACKEND_URL}:${PROXY_PORT || ""}`;
      
      return `${baseUrl}/public/${value}`;
    }
    return null;
  }

  @AllowNull(true)
  @Column(DataType.STRING)
  mediaType: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  mediaName: string;

  @Default(false)
  @Column
  isRead: boolean;

  @Default(false)
  @Column
  isEdited: boolean;

  @Default(false)
  @Column
  isDeleted: boolean;

  @AllowNull(true)
  @ForeignKey(() => InternalMessage)
  @Column
  quotedMessageId: number;

  @BelongsTo(() => InternalMessage, { foreignKey: "quotedMessageId" })
  quotedMessage: InternalMessage;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @HasMany(() => require("./MessageReadReceipt").default)
  readReceipts: typeof MessageReadReceipt[];
}

export default InternalMessage;


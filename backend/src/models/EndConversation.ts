/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  PrimaryKey,
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  AutoIncrement,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
/* eslint-enable @typescript-eslint/no-unused-vars */
import User from "./User";
import Tenant from "./Tenant";

@Table
class EndConversation extends Model<EndConversation> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  message: string;

  @AllowNull(false)
  @Default(false)
  @Column
  canKanban: boolean;

  @CreatedAt
  @Default(new Date())
  @Column
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
}

export default EndConversation;

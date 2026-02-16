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
import Tenant from "./Tenant";
import InternalGroupMember from "./InternalGroupMember";

@Table({ tableName: "InternalGroups" })
class InternalGroup extends Model<InternalGroup> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  avatar: string;

  @ForeignKey(() => User)
  @Column
  createdBy: number;

  @BelongsTo(() => User, { as: "creator", foreignKey: "createdBy" })
  creator: User;

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @AllowNull(true)
  @Column(DataType.STRING)
  department: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  allowedProfile: string;

  @HasMany(() => InternalGroupMember)
  members: InternalGroupMember[];

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;
}

export default InternalGroup;


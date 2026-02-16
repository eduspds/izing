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
import User from "./User";
import Permission from "./Permission";

@Table({ tableName: "UserPermissions" })
class UserPermission extends Model<UserPermission> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @ForeignKey(() => Permission)
  @Column
  permissionId: number;

  @BelongsTo(() => Permission)
  permission: Permission;

  @CreatedAt
  @Column
  createdAt: Date;

  @UpdatedAt
  @Column
  updatedAt: Date;
}

export default UserPermission;

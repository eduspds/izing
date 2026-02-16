import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  BelongsToMany
} from "sequelize-typescript";
import User from "./User";
import UserPermission from "./UserPermission";

@Table({ tableName: "Permissions" })
class Permission extends Model<Permission> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @AllowNull
  @Column
  description: string;

  @CreatedAt
  @Column
  createdAt: Date;

  @UpdatedAt
  @Column
  updatedAt: Date;

  @BelongsToMany(() => User, () => UserPermission, "permissionId", "userId")
  users: User[];
}

export default Permission;

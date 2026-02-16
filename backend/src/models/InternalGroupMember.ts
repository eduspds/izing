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
import User from "./User";
import InternalGroup from "./InternalGroup";

@Table({ tableName: "InternalGroupMembers" })
class InternalGroupMember extends Model<InternalGroupMember> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User)
  user: User;

  @AllowNull(false)
  @ForeignKey(() => InternalGroup)
  @Column
  groupId: number;

  @BelongsTo(() => InternalGroup)
  group: InternalGroup;

  @Default("member")
  @Column(DataType.ENUM("admin", "member"))
  role: string;

  @Default(true)
  @Column
  isActive: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  joinedAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @AllowNull(true)
  @Column(DataType.DATE(6))
  leftAt: Date;
}

export default InternalGroupMember;


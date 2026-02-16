import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  CreatedAt,
  UpdatedAt
} from "sequelize-typescript";

@Table({
  tableName: "InternalChatConfigs",
  timestamps: true
})
class InternalChatConfig extends Model<InternalChatConfig> {
  @PrimaryKey
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true
  })
  id!: number;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  tenantId!: number;

  // Restrições de comunicação
  @Default("none")
  @Column(DataType.ENUM("none", "sameQueue", "sameProfile"))
  communicationRestriction!: "none" | "sameQueue" | "sameProfile";

  // Permissões de grupos
  @Default(true)
  @Column(DataType.BOOLEAN)
  allowUsersCreateGroups!: boolean;

  @Default(true)
  @Column(DataType.BOOLEAN)
  allowUsersAddMembers!: boolean;

  // Restrições para gerentes
  @Default(false)
  @Column(DataType.BOOLEAN)
  onlyManagersCreateGroups!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  onlyManagersAddMembers!: boolean;

  // Restrições por departamento para grupos
  @Default(false)
  @Column(DataType.BOOLEAN)
  restrictGroupsByQueue!: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  restrictGroupsByProfile!: boolean;

  @CreatedAt
  @Column(DataType.DATE)
  createdAt!: Date;

  @UpdatedAt
  @Column(DataType.DATE)
  updatedAt!: Date;
}

export default InternalChatConfig;

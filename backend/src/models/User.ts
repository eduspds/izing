import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  BeforeCreate,
  BeforeUpdate,
  PrimaryKey,
  AutoIncrement,
  Default,
  HasMany,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import { hash, compare } from "bcryptjs";
import Ticket from "./Ticket";
import Queue from "./Queue";
import UsersQueues from "./UsersQueues";
import UserManagerQueues from "./UserManagerQueues";
import Tenant from "./Tenant";
import Contact from "./Contact";
import TicketKanban from "./TicketKanban";
import TicketKanbanUser from "./TicketKanbanUser";
import Permission from "./Permission";
import UserPermission from "./UserPermission";

@Table
class User extends Model<User> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  email: string;

  @Column
  status: string;

  @Default("ACTIVE")
  @Column
  accountStatus: string;

  @AllowNull
  @Column
  resetPasswordToken: string;

  @AllowNull
  @Column
  resetPasswordExpires: Date;

  @Column(DataType.VIRTUAL)
  password: string;

  @Column
  passwordHash: string;

  @Default(0)
  @Column
  tokenVersion: number;

  @Default("admin")
  @Column
  profile: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => UsersQueues, "userId", "queueId")
  queues: Queue[];

  @BelongsToMany(() => Queue, () => UserManagerQueues, "userId", "queueId")
  managerQueues: Queue[];

  @BelongsToMany(() => Contact, () => Ticket, "userId", "contactId")
  Contact: Contact[];

  @ForeignKey(() => Tenant)
  @Column
  tenantId: number;

  @BelongsTo(() => Tenant)
  tenant: Tenant;

  @Column
  lastLogin: Date;

  @Column
  lastOnline: Date;

  @Column
  lastLogout: Date;

  @Column
  isOnline: boolean;

  @Default({})
  @AllowNull
  @Column(DataType.JSON)
  // eslint-disable-next-line @typescript-eslint/ban-types
  configs: object;

  @Default(false)
  @Column
  isInactive: boolean;

  @AllowNull
  @Column(DataType.DATE)
  inactiveUntil: Date;

  @AllowNull
  @Column
  inactiveReason: string;

  @BeforeUpdate
  @BeforeCreate
  static hashPassword = async (instance: User): Promise<void> => {
    if (instance.password) {
      instance.passwordHash = await hash(instance.password, 8);
    }
  };

  public checkPassword = async (password: string): Promise<boolean> => {
    return compare(password, this.getDataValue("passwordHash"));
  };

  // Relacionamento com TicketKanban
  @BelongsToMany(() => TicketKanban, () => TicketKanbanUser, "userId", "ticketKanbanId")
  ticketKanbans: TicketKanban[];

  @BelongsToMany(() => Permission, () => UserPermission, "userId", "permissionId")
  permissions: Permission[];
}

export default User;

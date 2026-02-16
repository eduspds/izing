import { AllowNull, AutoIncrement, BelongsTo, Column, CreatedAt, Default, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import TicketKanban from "./TicketKanban";
import User from "./User";


@Table({ freezeTableName: true, tableName: "TicketKanbanUsers" })
class TicketKanbanUser extends Model<TicketKanbanUser> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @ForeignKey(() => TicketKanban)
    @AllowNull(false)
    @Column
    ticketKanbanId: number;

    @BelongsTo(() => TicketKanban)
    ticketKanban: TicketKanban;

    @ForeignKey(() => User)
    @AllowNull(false)
    @Column
    userId: number;

    @BelongsTo(() => User)
    user: User;

    @CreatedAt
    @Default(new Date())
    @Column
    createdAt: Date;

    @UpdatedAt
    @Column
    updatedAt: Date;
}

export default TicketKanbanUser;
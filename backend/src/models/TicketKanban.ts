import { AllowNull, AutoIncrement, BelongsTo, BelongsToMany, Column, CreatedAt, DataType, Default, ForeignKey, Model, PrimaryKey, Table, UpdatedAt } from "sequelize-typescript";
import Ticket from "./Ticket";
import User from "./User";
import TicketKanbanUser from "./TicketKanbanUser";


@Table
class TicketKanban extends Model<TicketKanban> {
    @PrimaryKey
    @AutoIncrement
    @Column
    id: number;

    @AllowNull(false)
    @Column
    title: string;

    @AllowNull(true)
    @Column
    description: string;

    @AllowNull(false)
    @Column(DataType.ENUM("low", "medium", "high"))
    priority: string;

    @AllowNull(false)
    @Default("pending")
    @Column(DataType.ENUM("pending", "in_progress", "completed", "cancelled"))
    status: string;

    @AllowNull(false)
    @Column
    startDate: Date;

    @AllowNull(false)
    @Column
    endDate: Date;

    @Column(DataType.VIRTUAL)
    get mediaName(): string | null {
        return this.getDataValue("mediaUrl");
    }

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

    @Column
    mediaType: string;


    @ForeignKey(() => Ticket)
    @AllowNull(true)
    @Column(DataType.INTEGER)
    ticketId: number | null;

    @BelongsTo(() => Ticket)
    ticket: Ticket;


    @BelongsToMany(() => User, () => TicketKanbanUser, "ticketKanbanId", "userId")
    users: User[];

    @CreatedAt
    @Default(new Date())
    @Column
    createdAt: Date;

    @UpdatedAt
    @Column
    updatedAt: Date;
}

export default TicketKanban;
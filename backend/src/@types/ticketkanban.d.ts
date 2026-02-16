export interface TicketKanbanCreateData {
    title: string;
    description?: string;
    priority: string;
    status: string;
    startDate: Date;
    endDate: Date;
    mediaUrl?: string;
    mediaType?: string;
    ticketId?: number | null;
    userId: number[];
}

export interface TicketKanbanUpdateData {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
    mediaUrl?: string;
    mediaType?: string;
    ticketId?: number | null;
    userId?: number[];
}   
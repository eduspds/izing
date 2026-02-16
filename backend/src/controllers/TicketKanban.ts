import { Request, Response } from "express";
import { TicketKanbanCreateData, TicketKanbanUpdateData } from "../@types/ticketkanban";
import CreateTicketKanbanService from "../services/TicketKanbanServices/CreateTicketKanbanService";
import UpdateTicketKanbanService from "../services/TicketKanbanServices/UpdateTicketKanbanService";
import UpdateStatusTicketKanbanService from "../services/TicketKanbanServices/UpdateStatusTicketKanbanService";
import DeleteTicketKanbanService from "../services/TicketKanbanServices/DeleteTicketKanbanService";
import FindOneTicketKanbanService from "../services/TicketKanbanServices/FindOneTicketKanbanService";
import FindAllTicketKanbanService from "../services/TicketKanbanServices/FindAllTicketKanbanService";
import * as Yup from "yup";
import AppError from "../errors/AppError";


export const createTicketKanban = async (req: Request, res: Response):Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const ticketKanbanData: TicketKanbanCreateData = req.body;

    const schema = Yup.object().shape({
        title: Yup.string().required(),
        description: Yup.string().optional(),
        priority: Yup.string().required(),
        status: Yup.string().optional(),
        startDate: Yup.date().optional(),
        endDate: Yup.date().optional(),
        mediaUrl: Yup.string().optional(),
        mediaType: Yup.string().optional(),
        ticketId: Yup.number().optional().nullable(),
        userId: Yup.array().of(Yup.number()).required(),
    });

    try {
        await schema.validate(ticketKanbanData);
    } catch (error) {
        throw new AppError(error.message);
    }

    const ticketKanban = await CreateTicketKanbanService({
        ticketKanbanData
    });

    return res.status(201).json(ticketKanban);
};

export const updateTicketKanban = async (req: Request, res: Response):Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const ticketKanbanId  = Number(req.params.ticketKanbanId);
    const ticketKanbanData: TicketKanbanUpdateData = req.body;

    const schema = Yup.object().shape({
        title: Yup.string().optional(),
        description: Yup.string().optional(),
        priority: Yup.string().optional(),
        status: Yup.string().optional(),
        startDate: Yup.date().optional(),
        endDate: Yup.date().optional(),
        mediaUrl: Yup.string().optional(),
        mediaType: Yup.string().optional(),
        ticketId: Yup.number().optional(),
        userId: Yup.array().of(Yup.number()).optional(),
    });

    try {
        await schema.validate(ticketKanbanData);
    } catch (error) {
        throw new AppError(error.message);
    }

    const ticketKanban = await UpdateTicketKanbanService({
        ticketKanbanData,
        ticketKanbanId
    });

    return res.status(200).json(ticketKanban);
};
export const updateStatusTicketKanban = async (req: Request, res: Response): Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const userId = Number(req.user.id);
    const ticketKanbanId = Number(req.params.ticketKanbanId);
    const { status } = req.body;

    const validStatuses = ["pending", "in_progress", "completed", "cancelled"];
    const schema = Yup.object().shape({
        status: Yup.string().oneOf(validStatuses).required(),
    });

    try {
        await schema.validate({ status });
    } catch (error) {
        throw new AppError(error.message);
    }

    const ticketKanban = await UpdateStatusTicketKanbanService({
        ticketKanbanId,
        userId,
        status: status as "pending" | "in_progress" | "completed" | "cancelled",
        isAdmin,
    });

    return res.status(200).json(ticketKanban);
};

export const deleteTicketKanban = async (req: Request, res: Response): Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const ticketKanbanId = Number(req.params.ticketKanbanId);

    const ticketKanban = await DeleteTicketKanbanService({
        ticketKanbanId
    });

    return res.status(200).json(ticketKanban);
};

export const findOneTicketKanban = async (req: Request, res: Response): Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const userId = Number(req.user.id);
    const ticketKanbanId = Number(req.params.ticketKanbanId);

    const ticketKanban = await FindOneTicketKanbanService({
        ticketKanbanId,
        userId,
        isAdmin,
    });

    return res.status(200).json(ticketKanban);
};

export const findAllTicketKanban = async (req: Request, res: Response): Promise<Response> => {
    const isAdmin = req.user.profile === "admin";
    const userId = Number(req.user.id);

    const ticketKanbans = await FindAllTicketKanbanService({
        userId,
        isAdmin,
    });

    return res.status(200).json(ticketKanbans);
};

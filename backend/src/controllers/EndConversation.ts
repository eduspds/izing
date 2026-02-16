import * as Yup from "yup";
import { Request, Response } from "express";
import CreateEndConversationService from "../services/EndConversation/CreateEndConversation";
import ListEndConversationService from "../services/EndConversation/ListEndConversation";
import DeleteEndConversationService from "../services/EndConversation/DeleteEndConversation";
import UpdateEndConversationService from "../services/EndConversation/UpdateEndConversation";
import AppError from "../errors/AppError";
import ListOneEndConversationService from "../services/EndConversation/ListOneEndConversation";

interface EndConversation {
  message: string;
  userId: number;
  tenantId: number | string;
  canKanban: boolean;
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const newEndConversation: EndConversation = {
    ...req.body,
    userId: req.user.id,
    tenantId,
    canKanban: req.body.canKanban ?? false
  };

  const schema = Yup.object().shape({
    message: Yup.string().required(),
    userId: Yup.number().required(),
    tenantId: Yup.number().required(),
    canKanban: Yup.boolean().optional().default(false)
  });

  try {
    await schema.validate(newEndConversation);
  } catch (error) {
    throw new AppError(error.message);
  }

  const endConversation = await CreateEndConversationService(
    newEndConversation
  );

  return res.status(200).json(endConversation);
};
export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { tenantId } = req.user;

    const endConversations = await ListEndConversationService({
      tenantId
    });
    return res.status(200).json(endConversations);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { endConversationId } = req.params;
  const { message, canKanban } = req.body;
  const userId = parseInt(req.user.id, 10);
  const schema = Yup.object().shape({
    message: Yup.string().required(),
    userId: Yup.number().required(),
    canKanban: Yup.boolean().optional().default(false)
  });

  try {
    await schema.validate({ message, userId, canKanban });
  } catch (error) {
    throw new AppError(error.message);
  }

  const endConversationData: EndConversation = {
    message,
    userId,
    tenantId,
    canKanban: canKanban ?? false
  };

  const endConversation = await UpdateEndConversationService({
    endConversationData,
    endConversationId,
  });

  return res.status(200).json(endConversation);
};
export const destroy = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { endConversationId } = req.params;

  const endConversation = await DeleteEndConversationService({
    endConversationId,
    tenantId
  });

  return res.status(200).json(endConversation);
};

export const findOne = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { tenantId } = req.user;
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { endConversationId } = req.params;

  if (!endConversationId) {
    throw new AppError("ERR_END_CONVERSATION_ID_REQUIRED", 400);
  }
  const endConversation = await ListOneEndConversationService({
    tenantId,
    endConversationId
  });

  return res.status(200).json(endConversation);
};

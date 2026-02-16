import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import uploadConfig from "../config/upload";
import * as InternalChatController from "../controllers/InternalChatController";

const internalChatRoutes = Router();
const upload = multer(uploadConfig);

// Mensagens
internalChatRoutes.post(
  "/internal-chat/messages",
  isAuth,
  upload.array("medias"),
  InternalChatController.createMessage
);

internalChatRoutes.get(
  "/internal-chat/messages",
  isAuth,
  InternalChatController.listMessages
);

internalChatRoutes.patch(
  "/internal-chat/messages/read",
  isAuth,
  InternalChatController.markAsRead
);

// Lista de conversas do usuário
internalChatRoutes.get(
  "/internal-chat/chats",
  isAuth,
  InternalChatController.listUserChats
);

// Lista de contatos disponíveis (usuários do sistema)
internalChatRoutes.get(
  "/internal-chat/contacts",
  isAuth,
  InternalChatController.listAvailableContacts
);

export default internalChatRoutes;


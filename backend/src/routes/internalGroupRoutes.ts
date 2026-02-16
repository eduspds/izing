import express from "express";
import isAuth from "../middleware/isAuth";
import * as InternalGroupController from "../controllers/InternalGroupController";

const internalGroupRoutes = express.Router();

// Listar grupos do usuário
internalGroupRoutes.get(
  "/internal-groups",
  isAuth,
  InternalGroupController.listUserGroups
);

// Criar grupo
internalGroupRoutes.post(
  "/internal-groups",
  isAuth,
  InternalGroupController.createGroup
);

// Adicionar membros ao grupo
internalGroupRoutes.post(
  "/internal-groups/:groupId/members",
  isAuth,
  InternalGroupController.addGroupMember
);

// Remover membro do grupo
internalGroupRoutes.delete(
  "/internal-groups/:groupId/members/:memberId",
  isAuth,
  InternalGroupController.removeGroupMember
);

// Sair do grupo
internalGroupRoutes.post(
  "/internal-groups/:groupId/leave",
  isAuth,
  InternalGroupController.leaveGroup
);

// Atualizar informações do grupo
internalGroupRoutes.put(
  "/internal-groups/:groupId",
  isAuth,
  InternalGroupController.updateGroup
);

export default internalGroupRoutes;


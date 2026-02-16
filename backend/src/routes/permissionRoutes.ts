import express from "express";
import isAuth from "../middleware/isAuth";
import hasPermission from "../middleware/hasPermission";
import * as PermissionController from "../controllers/PermissionController";

const permissionRoutes = express.Router();

/** Permissões do usuário logado (frontend: menu, v-can) */
permissionRoutes.get("/permissions/me", isAuth, PermissionController.myPermissions);

/** Rotas de gestão: apenas quem tem permissão permissions-access (ou admin) */
permissionRoutes.get("/permissions", isAuth, hasPermission("permissions-access"), PermissionController.listPermissions);
permissionRoutes.get("/permissions/users", isAuth, hasPermission("permissions-access"), PermissionController.listUsers);
permissionRoutes.get("/permissions/users/:userId", isAuth, hasPermission("permissions-access"), PermissionController.getUserPermissions);
permissionRoutes.put("/permissions/users/:userId", isAuth, hasPermission("permissions-access"), PermissionController.updateUserPermissions);

export default permissionRoutes;

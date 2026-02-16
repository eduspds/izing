import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";

/** Permissões concedidas por padrão a todos os usuários (dashboard, contatos, atendimento). */
const DEFAULT_PERMISSIONS = ["dashboard-all-view", "contacts-access", "atendimento-access"];

/**
 * Middleware que exige uma permissão específica.
 * Admin tem acesso total. Permissões em DEFAULT_PERMISSIONS são liberadas para todos.
 * Caso contrário, verifica se o usuário possui a permissão no banco (UserPermissions).
 */
const hasPermission = (permissionName: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user?.id) {
      throw new AppError("Não autorizado.", 403);
    }

    if (req.user.profile === "admin") {
      return next();
    }

    if (DEFAULT_PERMISSIONS.includes(permissionName)) {
      return next();
    }

    const userId = Number(req.user.id);
    const user = await User.findByPk(userId, {
      include: ["permissions"],
      attributes: ["id"],
    });

    if (!user) {
      throw new AppError("Usuário não encontrado.", 403);
    }

    const permissions = (user as User & { permissions: { name: string }[] }).permissions || [];
    const hasIt = permissions.some((p) => p.name === permissionName);

    if (!hasIt) {
      throw new AppError(`Sem permissão: ${permissionName}`, 403);
    }

    return next();
  };
};

export default hasPermission;

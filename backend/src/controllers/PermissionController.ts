import { Request, Response } from "express";
import AppError from "../errors/AppError";
import Permission from "../models/Permission";
import User from "../models/User";
import UserPermission from "../models/UserPermission";
import ListUsersService from "../services/UserServices/ListUsersService";

/** Retorna as permissões do usuário logado (para uso no frontend: v-can, menu). Admin tem todas. */
export const myPermissions = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile === "admin") {
    const all = await Permission.findAll({ attributes: ["name"] });
    return res.json({ permissions: all.map((p) => p.name) });
  }
  const userId = Number(req.user.id);
  const user = await User.findByPk(userId, {
    include: [{ association: "permissions", attributes: ["name"] }],
    attributes: ["id"],
  });
  const permissions = (user as User & { permissions?: { name: string }[] })?.permissions?.map((p) => p.name) || [];
  return res.json({ permissions });
};

/** Lista todas as permissões do sistema (para o grid da tela de gestão). */
export const listPermissions = async (req: Request, res: Response): Promise<Response> => {
  const permissions = await Permission.findAll({
    order: [["name", "ASC"]],
    attributes: ["id", "name", "description"],
  });
  return res.json(permissions);
};

/** Lista usuários do tenant (para seleção na tela de permissões). */
export const listUsers = async (req: Request, res: Response): Promise<Response> => {
  const tenantId = req.user.tenantId;
  const { searchParam = "", pageNumber = "1" } = req.query as { searchParam?: string; pageNumber?: string };
  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    tenantId,
  });
  return res.json({ users, count, hasMore });
};

/** Retorna um usuário com as permissões atribuídas (ids e nomes). */
export const getUserPermissions = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const userId = Number(req.params.userId);
  if (!userId) throw new AppError("userId inválido.", 400);

  const user = await User.findOne({
    where: { id: userId, tenantId },
    attributes: ["id", "name", "email", "profile"],
    include: [{ association: "permissions", attributes: ["id", "name", "description"] }],
  });

  if (!user) throw new AppError("Usuário não encontrado.", 404);

  const userJson = user.get({ plain: true }) as User & { permissions: { id: number; name: string; description: string }[] };
  return res.json({
    id: userJson.id,
    name: userJson.name,
    email: userJson.email,
    profile: userJson.profile,
    permissions: userJson.permissions || [],
  });
};

/** Atualiza as permissões de um usuário. Body: { permissionIds: number[] } */
export const updateUserPermissions = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const userId = Number(req.params.userId);
  const { permissionIds } = req.body as { permissionIds?: number[] };

  if (!userId) throw new AppError("userId inválido.", 400);
  if (!Array.isArray(permissionIds)) throw new AppError("permissionIds deve ser um array.", 400);

  const user = await User.findOne({ where: { id: userId, tenantId }, attributes: ["id"] });
  if (!user) throw new AppError("Usuário não encontrado.", 404);

  await UserPermission.destroy({ where: { userId } });

  if (permissionIds.length > 0) {
    const validIds = await Permission.findAll({
      where: { id: permissionIds },
      attributes: ["id"],
    }).then((rows) => rows.map((r) => r.id));

    await UserPermission.bulkCreate(
      validIds.map((permissionId) => ({ userId, permissionId }))
    );
  }

  const updated = await User.findByPk(userId, {
    attributes: ["id", "name", "email", "profile"],
    include: [{ association: "permissions", attributes: ["id", "name", "description"] }],
  });
  const plain = updated?.get({ plain: true }) as User & { permissions: { id: number; name: string; description: string }[] };
  return res.json({
    id: plain.id,
    name: plain.name,
    email: plain.email,
    profile: plain.profile,
    permissions: plain.permissions || [],
  });
};

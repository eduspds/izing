import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CheckSettingsHelper from "../helpers/CheckSettings";
import AppError from "../errors/AppError";

import CreateUserService from "../services/UserServices/CreateUserService";
import InviteUserService from "../services/UserServices/InviteUserService";
import ListUsersService from "../services/UserServices/ListUsersService";
import UpdateUserService from "../services/UserServices/UpdateUserService";
import ShowUserService from "../services/UserServices/ShowUserService";
import DeleteUserService from "../services/UserServices/DeleteUserService";
import UpdateUserConfigsService from "../services/UserServices/UpdateUserConfigsService";
import ValidatePasswordService from "../services/UserServices/ValidatePasswordService";
import SetUserInactiveService from "../services/UserServices/SetUserInactiveService";
import SetUserActiveService from "../services/UserServices/SetUserActiveService";
import CheckUserCanBeInactiveService from "../services/UserServices/CheckUserCanBeInactiveService";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { users, count, hasMore } = await ListUsersService({
    searchParam,
    pageNumber,
    tenantId
  });

  return res.json({ users, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const { email, password, name, profile, managerQueues, permissionIds } = req.body;

  if (req.originalUrl?.includes("/signup") || req.path?.includes("signup")) {
    if ((await CheckSettingsHelper("userCreation")) === "disabled") {
      throw new AppError("ERR_USER_CREATION_DISABLED", 403);
    }
    const user = await CreateUserService({
      email,
      password,
      name,
      profile: profile || "user",
      tenantId,
      managerQueues: managerQueues || []
    });
    const io = getIO();
    io.emit(`${tenantId}:user`, { action: "create", user });
    return res.status(200).json(user);
  }

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { users } = await ListUsersService({ tenantId });
  if (users.length >= Number(process.env.USER_LIMIT)) {
    throw new AppError("ERR_USER_LIMIT_USER_CREATION", 400);
  }

  const result = await InviteUserService({
    email: email?.trim(),
    profile: profile || "user",
    permissionIds: permissionIds || [],
    managerQueues: managerQueues || [],
    tenantId
  });

  const io = getIO();
  io.emit(`${tenantId}:user`, { action: "create", user: { id: result.id, email: result.email, accountStatus: result.accountStatus } });
  return res.status(200).json(result);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { userId } = req.params;
  const { tenantId } = req.user;

  const user = await ShowUserService(userId, tenantId);

  return res.status(200).json(user);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const userData = req.body;
  const { tenantId } = req.user;
  const currentUserId = Number(req.user.id);
  const targetUserId = Number(userId);

  if (req.user.profile !== "admin" && currentUserId !== targetUserId) {
    throw new AppError("Você só pode alterar seus próprios dados.", 403);
  }

  const user = await UpdateUserService({
    userData,
    userId,
    tenantId,
    requestedBy: currentUserId,
    isAdmin: req.user.profile === "admin"
  });

  const io = getIO();
  io.emit(`${tenantId}:user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const updateConfigs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  // if (req.user.profile !== "admin") {
  //   throw new AppError("ERR_NO_PERMISSION", 403);
  // }

  const { userId } = req.params;
  const userConfigs = req.body;
  const { tenantId } = req.user;

  await UpdateUserConfigsService({ userConfigs, userId, tenantId });

  return res.status(200).json();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { tenantId } = req.user;
  const userIdRequest = req.user.id;

  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await DeleteUserService(userId, tenantId, userIdRequest);

  const io = getIO();
  io.emit(`${tenantId}:user`, {
    action: "delete",
    userId
  });

  return res.status(200).json({ message: "User deleted" });
};

export const validatePassword = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { password } = req.body;
  const { tenantId } = req.user;

  if (!password) {
    throw new AppError("ERR_PASSWORD_REQUIRED", 400);
  }

  // Só pode validar a própria senha
  if (Number(userId) !== Number(req.user.id)) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await ValidatePasswordService({
    userId: Number(userId),
    password,
    tenantId: Number(tenantId)
  });

  return res.status(200).json({ success: true, message: "Password is valid" });
};

export const setInactive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { tenantId } = req.user;
  const { inactiveUntil, inactiveReason, days } = req.body;

  // Se days foi fornecido, calcular inactiveUntil
  let inactiveUntilDate: Date | null = null;
  if (days && typeof days === "number" && days > 0) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    inactiveUntilDate = date;
  } else if (inactiveUntil) {
    inactiveUntilDate = new Date(inactiveUntil);
  }

  const user = await SetUserInactiveService({
    userId: Number(userId),
    tenantId: Number(tenantId),
    inactiveUntil: inactiveUntilDate,
    inactiveReason
  });

  const io = getIO();
  io.emit(`${tenantId}:user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const setActive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { userId } = req.params;
  const { tenantId } = req.user;

  const user = await SetUserActiveService({
    userId: Number(userId),
    tenantId: Number(tenantId)
  });

  const io = getIO();
  io.emit(`${tenantId}:user`, {
    action: "update",
    user
  });

  return res.status(200).json(user);
};

export const checkCanBeInactive = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { userId } = req.params;
  const { tenantId } = req.user;

  const result = await CheckUserCanBeInactiveService(
    Number(userId),
    Number(tenantId)
  );

  return res.status(200).json(result);
};

import { Request, Response } from "express";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";

const MAIL_PASS_KEY = "mailPass";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;

  const settings = await ListSettingsService(tenantId);
  const safe = settings.map((s: { key: string; value: string; toJSON: () => object }) => {
    const json = s.toJSON ? s.toJSON() : { ...s };
    const out = json as { key: string; value: string };
    if (out.key === MAIL_PASS_KEY && out.value) {
      out.value = "••••••••";
    }
    return out;
  });

  return res.status(200).json(safe);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { tenantId } = req.user;
  // const { settingKey: key } = req.params;
  const { value, key } = req.body;

  const setting = await UpdateSettingService({
    key,
    value,
    tenantId
  });

  const io = getIO();
  io.emit(`${tenantId}:settings`, {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

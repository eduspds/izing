import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
  tenantId: string | number;
}

const UpdateSettingService = async ({
  key,
  value,
  tenantId
}: Request): Promise<Setting> => {
  let setting = await Setting.findOne({
    where: { key, tenantId }
  });

  const valueStr = value != null ? String(value) : "";
  if (!setting) {
    setting = await Setting.create({ key, value: valueStr, tenantId });
  } else {
    await setting.update({ value: valueStr });
  }

  return setting;
};

export default UpdateSettingService;

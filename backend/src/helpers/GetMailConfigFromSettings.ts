import { Op } from "sequelize";
import Setting from "../models/Setting";
import { MailConfig } from "../libs/mail";

const MAIL_KEYS = ["mailFrom", "mailHost", "mailPort", "mailUser", "mailPass", "frontUrl"] as const;

export interface MailSettingsResult extends MailConfig {
  frontUrl?: string;
}

const GetMailConfigFromSettings = async (
  tenantId: number | string
): Promise<MailSettingsResult> => {
  const settings = await Setting.findAll({
    where: { tenantId, key: { [Op.in]: [...MAIL_KEYS] } },
    attributes: ["key", "value"]
  });
  const result: MailSettingsResult = {};
  for (const s of settings) {
    const key = s.key as (typeof MAIL_KEYS)[number];
    const value = s.value?.trim() || "";
    if (key === "mailPort") {
      result.port = value ? Number(value) : undefined;
    } else if (key === "mailFrom") {
      result.from = value;
    } else if (key === "mailHost") {
      result.host = value;
    } else if (key === "mailUser") {
      result.user = value;
    } else if (key === "mailPass") {
      result.pass = value;
    } else if (key === "frontUrl") {
      result.frontUrl = value;
    }
  }
  return result;
};

export default GetMailConfigFromSettings;

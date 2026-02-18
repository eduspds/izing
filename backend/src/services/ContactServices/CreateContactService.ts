import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import socketEmit from "../../helpers/socketEmit";
import Contact from "../../models/Contact";
import ContactWallet from "../../models/ContactWallet";
import { normalizeForComparison, normalizeToBrazilianStorage, generateNumberVariations } from "../../utils/phoneNumberSimilarity";

interface ExtraInfo {
  name: string;
  value: string;
}

interface Wallet {
  walletId: number | string;
  contactId: number | string;
  tenantId: number | string;
}

interface Request {
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  /** Data de aniversário (YYYY-MM-DD). Campo fixo para agenda e automação. */
  birthDate?: string | null;
  extraInfo?: ExtraInfo[];
  tenantId: string | number;
  wallets?: null | number[] | string[];
}

const CreateContactService = async ({
  name,
  number,
  email = "",
  profilePicUrl = "",
  birthDate,
  extraInfo = [],
  tenantId,
  wallets
}: Request): Promise<Contact> => {
  const normalizedNumber = normalizeForComparison(number);
  const numberToStore =
    normalizedNumber.startsWith("55") && normalizedNumber.length >= 12
      ? normalizeToBrazilianStorage(normalizedNumber)
      : normalizedNumber;

  const findWhere =
    normalizedNumber.startsWith("55")
      ? { tenantId, number: { [Op.in]: generateNumberVariations(normalizedNumber) } }
      : { number: numberToStore, tenantId };
  const numberExists = await Contact.findOne({ where: findWhere });

  if (numberExists) {
    throw new AppError("ERR_DUPLICATED_CONTACT");
  }

  const contact = await Contact.create(
    {
      name,
      number: numberToStore,
      email,
      profilePicUrl,
      birthDate: birthDate || null,
      extraInfo,
      tenantId
    },
    {
      include: [
        "extraInfo",
        "tags",
        {
          association: "wallets",
          attributes: ["id", "name"]
        }
      ]
    }
  );

  if (wallets) {
    await ContactWallet.destroy({
      where: {
        tenantId,
        contactId: contact.id
      }
    });

    const contactWallets: Wallet[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wallets.forEach((wallet: any) => {
      contactWallets.push({
        walletId: !wallet.id ? wallet : wallet.id,
        contactId: contact.id,
        tenantId
      });
    });

    await ContactWallet.bulkCreate(contactWallets);
  }

  await contact.reload({
    attributes: ["id", "name", "number", "email", "profilePicUrl"],
    include: [
      "extraInfo",
      "tags",
      {
        association: "wallets",
        attributes: ["id", "name"]
      }
    ]
  });

  socketEmit({
    tenantId,
    type: "contact:update",
    payload: contact
  });

  return contact;
};

export default CreateContactService;

import type { IContactAdapter } from "../../../types/baileysAdapter";
import Contact from "../../../models/Contact";
import CreateOrUpdateContactService from "../../ContactServices/CreateOrUpdateContactService";

const VerifyContact = async (
  msgContact: IContactAdapter,
  tenantId: string | number
): Promise<Contact> => {
  let profilePicUrl: string | undefined;
  try {
    profilePicUrl = await msgContact.getProfilePicUrl();
  } catch {
    profilePicUrl = undefined;
  }

  const contactData = {
    name:
      msgContact.name ||
      msgContact.pushname ||
      msgContact.shortName ||
      msgContact.id.user,
    number: msgContact.id.user,
    profilePicUrl,
    tenantId,
    pushname: msgContact.pushname ?? msgContact.name ?? msgContact.id.user,
    isUser: msgContact.isUser ?? true,
    isWAContact: msgContact.isWAContact ?? true,
    isGroup: msgContact.isGroup ?? false
  };

  const contact = await CreateOrUpdateContactService(contactData);
  return contact;
};

export default VerifyContact;

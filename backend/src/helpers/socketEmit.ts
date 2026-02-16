// helpers/socketEmit.ts
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

type Events =
  | "chat:create"
  | "chat:delete"
  | "chat:update"
  | "chat:edit"
  | "chat:ack"
  | "internalChat:message"
  | "internalChat:update"
  | "internalChat:groupCreated"
  | "internalChat:groupMembersAdded"
  | "internalChat:groupMemberRemoved"
  | "internalChat:groupDeleted"
  | "internalChat:groupUpdated"
  | "ticket:update"
  | "ticket:create"
  | "contact:update"
  | "contact:delete"
  | "notification:new"
  | "appMessage"; // Suporte para appMessage

interface ObjEvent {
  tenantId: number | string;
  type: Events;
  // eslint-disable-next-line @typescript-eslint/ban-types
  payload: object;
}

const emitEvent = ({ tenantId, type, payload }: ObjEvent): void => {
  const io = getIO();
  let eventChannel = `${tenantId}:ticketList`;

  if (type.indexOf("contact:") !== -1) {
    eventChannel = `${tenantId}:contactList`;
  }

  if (type.indexOf("internalChat:") !== -1) {
    eventChannel = `${tenantId}:internalChat`;
  }

  // Adicionar suporte para appMessage
  if (type === "appMessage") {
    eventChannel = `${tenantId}:appMessage`;
  }

  logger.debug(`[SOCKET_EMIT] Enviando: ${eventChannel} - Tipo: ${type}`);

  io.to(tenantId.toString()).emit(eventChannel, {
    type,
    payload
  });
};

export default emitEvent;

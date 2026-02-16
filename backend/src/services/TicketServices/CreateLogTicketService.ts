// import AppError from "../../errors/AppError";
// import socketEmit from "../../helpers/socketEmit";
import LogTicket from "../../models/LogTicket";

type logType =
  | "access"
  | "peek" // visualizar sem abrir
  | "create"
  | "closed"
  | "transfered"
  | "receivedTransfer"
  | "open"
  | "pending"
  | "queue"
  | "userDefine"
  | "delete"
  | "chatBot"
  | "autoClose"
  | "retriesLimitQueue"
  | "retriesLimitUserDefine"
  | "evaluationStarted"
  | "evaluationCompleted"
  | "evaluationExpired"
  | "flowClosed"
  | "messageSent" // mensagem enviada por usuário
  | "messageScheduled" // mensagem agendada
  | "userJoined" // usuário entrou no ticket
  | "userLeft" // usuário saiu do ticket
  | "alreadyInService" // tentou abrir mas já estava em atendimento
  | "queueChanged" // fila alterada
  | "statusChanged" // status alterado
  | "assignedToUser" // atribuído a usuário
  | "contactsCreate" // criado via tela de contatos
  | "contactsOpened" // acesso via tela de contatos
  | "contactsAttended" // atendimento iniciado via contatos
  | "supportCreate"
  | "supportOpened"
  | "supportAttended";

interface Request {
  type: logType;
  ticketId: number | string;
  userId?: number | string;
  toUserId?: number | string;
  queueId?: number | string;
  fromQueueId?: number | string;
  description?: string;
  metadata?: object;
}

const CreateLogTicketService = async ({
  type,
  userId,
  toUserId,
  ticketId,
  queueId,
  fromQueueId,
  description,
  metadata
}: Request): Promise<void> => {
  await LogTicket.create({
    userId,
    toUserId,
    ticketId,
    type,
    queueId,
    fromQueueId,
    description,
    metadata
  });

  // socketEmit({
  //   tenantId,
  //   type: "ticket:update",
  //   payload: ticket
  // });
};

export default CreateLogTicketService;

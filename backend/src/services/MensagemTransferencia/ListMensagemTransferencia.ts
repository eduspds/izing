import MensagemTransferencia from "../../models/TransferConversation";

interface Request {
  ticketId: number;
}

export const ListMensagemTransferencia = async ({
  ticketId
}: Request): Promise<MensagemTransferencia[]> => {
  const mensagemTransferencia = await MensagemTransferencia.findAll({
    where: { ticketId }
  });
  return mensagemTransferencia;
};

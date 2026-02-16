import MensagemTransferencia from "../../models/TransferConversation";

interface Request {
  mensagemTransferencia: string;
  ticketId: number;
}

const CreateMensagemTransferencia = async ({
  mensagemTransferencia,
  ticketId
}: Request): Promise<MensagemTransferencia> => {
  const newMensagemTransferencia = await MensagemTransferencia.create({
    mensagemTransferencia,
    ticketId
  });
  return newMensagemTransferencia;
};

export default CreateMensagemTransferencia;

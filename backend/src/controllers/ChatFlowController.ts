// import * as Yup from "yup";
import { Request, Response } from "express";

import CreateChatFlowService from "../services/ChatFlowServices/CreateChatFlowService";
import ListChatFlowService from "../services/ChatFlowServices/ListChatFlowService";
import AppError from "../errors/AppError";
import UpdateChatFlowService from "../services/ChatFlowServices/UpdateChatFlowService";
import DeleteChatFlowService from "../services/ChatFlowServices/DeleteChatFlowService";
// import UpdateAutoReplyService from "../services/AutoReplyServices/UpdateAutoReplyService";
// import DeleteAutoReplyService from "../services/AutoReplyServices/DeleteAutoReplyService";

interface Line {
  connector: string;
  from: string;
  paintStyle: string | any;
  to: string;
}
interface Configuration {
  maxRetryBotMessage: {
    destiny: string;
    number: number;
    type: number;
  };
  notOptionsSelectMessage: {
    message: string;
    stepReturn: string;
  };
  notResponseMessage: {
    destiny: string;
    time: number;
    type: number;
  };
}
interface NodeList {
  ico?: string;
  id: string;
  left: string;
  name: string;
  status: string;
  style?: string | any;
  top: string;
  type?: string;
  viewOnly?: boolean;
  configurations?: Configuration;
  actions?: [];
  conditions?: [];
  interactions?: [];
}

interface Flow {
  name: string;
  lineList: Line[];
  nodeList: NodeList[];
}

interface ChatFlowData {
  flow: Flow;
  name: string;
  userId: number;
  isActive: boolean;
  celularTeste?: string;
  tenantId: number | string;
}

const MAX_BUTTONS_PER_MESSAGE = 3;

/** Valida que mensagens do tipo MessageOptionsField tenham no máximo 3 opções (botões). */
function validateChatFlowButtons(flow: Flow): void {
  if (!flow?.nodeList || !Array.isArray(flow.nodeList)) return;
  for (const node of flow.nodeList) {
    const interactions = node.interactions;
    if (!Array.isArray(interactions)) continue;
    for (const item of interactions) {
      const it = item as { type?: string; data?: { values?: unknown[] } };
      if (it.type === "MessageOptionsField" && it.data?.values) {
        const len = Array.isArray(it.data.values) ? it.data.values.length : 0;
        if (len > MAX_BUTTONS_PER_MESSAGE) {
          throw new AppError(
            `ChatFlow: mensagem com botões permite no máximo ${MAX_BUTTONS_PER_MESSAGE} opções. Etapa "${node.name}" tem ${len}.`,
            400
          );
        }
      }
    }
  }
}

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  // Log para debug
  console.log("📥 Recebendo req.body:", JSON.stringify(req.body, null, 2));
  console.log("📥 req.body.flow existe?", !!req.body.flow);
  console.log("📥 req.body.flow.nodeList existe?", !!req.body.flow?.nodeList);

  const newFlow: ChatFlowData = {
    // Se req.body já tem a propriedade flow, usa ela, senão usa o body inteiro
    flow: req.body.flow || { ...req.body },
    name: req.body.name,
    isActive: req.body.isActive !== undefined ? req.body.isActive : true,
    userId: +req.user.id,
    celularTeste: req.body.celularTeste,
    tenantId
  };

  console.log("📤 Enviando newFlow:", JSON.stringify(newFlow, null, 2));

  validateChatFlowButtons(newFlow.flow);

  const chatFlow = await CreateChatFlowService(newFlow);

  return res.status(200).json(chatFlow);
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { tenantId } = req.user;
  const chatFlow = await ListChatFlowService({ tenantId });
  return res.status(200).json(chatFlow);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { tenantId } = req.user;

  const newFlow: ChatFlowData = {
    flow: { ...req.body },
    name: req.body.name,
    isActive: req.body.isReactive,
    userId: +req.user.id,
    tenantId
  };

  validateChatFlowButtons(newFlow.flow);

  const { chatFlowId } = req.params;
  const chatFlow = await UpdateChatFlowService({
    chatFlowData: newFlow,
    chatFlowId,
    tenantId
  });

  return res.status(200).json(chatFlow);
};
export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { chatFlowId } = req.params;
  const { tenantId } = req.user;

  await DeleteChatFlowService({ id: chatFlowId, tenantId });

  return res.status(200).json({ message: "Flow deleted" });
};

// export const remove = async (
//   req: Request,
//   res: Response
// ): Promise<Response> => {
//   if (req.user.profile !== "admin") {
//     throw new AppError("ERR_NO_PERMISSION", 403);
//   }
//   const { tenantId } = req.user;
//   const { autoReplyId } = req.params;

//   await DeleteAutoReplyService({ id: autoReplyId, tenantId });
//   return res.status(200).json({ message: "Auto reply deleted" });
// };

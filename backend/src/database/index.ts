import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import MessageOffLine from "../models/MessageOffLine";
import AutoReply from "../models/AutoReply";
import StepsReply from "../models/StepsReply";
import StepsReplyAction from "../models/StepsReplyAction";
import Queue from "../models/Queue";
import UsersQueues from "../models/UsersQueues";
import UserManagerQueues from "../models/UserManagerQueues";
import Tenant from "../models/Tenant";
import AutoReplyLogs from "../models/AutoReplyLogs";
import UserMessagesLog from "../models/UserMessagesLog";
import FastReply from "../models/FastReply";
import FastReplyQueues from "../models/FastReplyQueues";
import Tag from "../models/Tag";
import TagQueues from "../models/TagQueues";
import ContactWallet from "../models/ContactWallet";
import ContactTag from "../models/ContactTag";
import Campaign from "../models/Campaign";
import CampaignContacts from "../models/CampaignContacts";
import ApiConfig from "../models/ApiConfig";
import ApiMessage from "../models/ApiMessage";
import LogTicket from "../models/LogTicket";
import ChatFlow from "../models/ChatFlow";
import * as QueueJobs from "../libs/Queue";
import { logger } from "../utils/logger";
import EndConversation from "../models/EndConversation";
import MensagemTransferencia from "../models/TransferConversation";
import InternalMessage from "../models/InternalMessage";
import InternalGroup from "../models/InternalGroup";
import InternalGroupMember from "../models/InternalGroupMember";
import MessageReadReceipt from "../models/MessageReadReceipt";
import InternalChatConfig from "../models/InternalChatConfig";
import AISummary from "../models/AISummary";
import SystemRelease from "../models/SystemRelease";
import TicketKanban from "../models/TicketKanban";
import TicketKanbanUser from "../models/TicketKanbanUser";

interface CustomSequelize extends Sequelize {
  afterConnect?: any;
  afterDisconnect?: any;
}

// eslint-disable-next-line
const dbConfig = require("../config/database");
// import dbConfig from "../config/database";

const sequelize: CustomSequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  MessageOffLine,
  Whatsapp,
  ContactCustomField,
  Setting,
  AutoReply,
  StepsReply,
  StepsReplyAction,
  Queue,
  UsersQueues,
  UserManagerQueues,
  Tenant,
  AutoReplyLogs,
  UserMessagesLog,
  FastReply,
  FastReplyQueues,
  Tag,
  TagQueues,
  ContactWallet,
  ContactTag,
  Campaign,
  CampaignContacts,
  ApiConfig,
  ApiMessage,
  LogTicket,
  ChatFlow,
  EndConversation,
  MensagemTransferencia,
  InternalMessage,
  InternalGroup,
  InternalGroupMember,
  MessageReadReceipt,
  InternalChatConfig,
  AISummary,
  SystemRelease,
  TicketKanban,
  TicketKanbanUser,
];

sequelize.addModels(models);

// const startLoopDb = () => {
//   // eslint-disable-next-line no-underscore-dangle
//   global._loopDb = setInterval(() => {
//     FindUpdateTicketsInactiveChatBot();
//     console.log("DATABASE CONNECT");
//   }, 60000);
// };

sequelize.afterConnect(() => {
  logger.info("DATABASE CONNECT");
  QueueJobs.default.add("VerifyTicketsChatBotInactives", {});
  QueueJobs.default.add("SendMessageSchenduled", {});
});

sequelize.afterDisconnect(() => {
  logger.info("DATABASE DISCONNECT");

  // eslint-disable-next-line no-underscore-dangle
  // clearInterval(global._loopDb);
});

export default sequelize;

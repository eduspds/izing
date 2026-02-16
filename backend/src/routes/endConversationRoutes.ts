import express from "express";
import isAuth from "../middleware/isAuth";

import * as EndConversationController from "../controllers/EndConversation";

const endConversationRoutes = express.Router();

endConversationRoutes.post(
  "/end-conversations",
  isAuth,
  EndConversationController.store
);
endConversationRoutes.get(
  "/end-conversations",
  isAuth,
  EndConversationController.index
);
endConversationRoutes.put(
  "/end-conversations/:endConversationId",
  isAuth,
  EndConversationController.update
);
endConversationRoutes.delete(
  "/end-conversations/:endConversationId",
  isAuth,
  EndConversationController.destroy
);
endConversationRoutes.get(
  "/end-conversations/:endConversationId",
  isAuth,
  EndConversationController.findOne
);
export default endConversationRoutes;

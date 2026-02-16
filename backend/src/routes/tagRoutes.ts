import express from "express";
import isAuth from "../middleware/isAuth";
import hasPermission from "../middleware/hasPermission";

import * as TagController from "../controllers/TagController";

const tagRoutes = express.Router();

tagRoutes.post("/tags", isAuth, hasPermission("tags-access"), TagController.store);
tagRoutes.get("/tags", isAuth, hasPermission("tags-access"), TagController.index);
tagRoutes.put("/tags/:tagId", isAuth, hasPermission("tags-access"), TagController.update);
tagRoutes.delete("/tags/:tagId", isAuth, hasPermission("tags-access"), TagController.remove);

export default tagRoutes;

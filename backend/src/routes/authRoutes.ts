import { Router } from "express";
import * as SessionController from "../controllers/SessionController";
import * as UserController from "../controllers/UserController";
import * as InviteController from "../controllers/InviteController";

const authRoutes = Router();

authRoutes.post("/signup", UserController.store);

authRoutes.get("/invite/validate", InviteController.validateToken);
authRoutes.post("/invite/accept", InviteController.accept);

authRoutes.post("/login", SessionController.store);
authRoutes.post("/logout", SessionController.logout);

authRoutes.post("/refresh_token", SessionController.update);

export default authRoutes;

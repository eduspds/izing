import { Router } from "express";

import isAuth from "../middleware/isAuth";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get("/users", isAuth, UserController.index);

userRoutes.post("/users", isAuth, UserController.store);

userRoutes.put("/users/:userId", isAuth, UserController.update);

userRoutes.put("/users/:userId/configs", isAuth, UserController.updateConfigs);

userRoutes.get("/users/:userId", isAuth, UserController.show);

userRoutes.delete("/users/:userId", isAuth, UserController.remove);

userRoutes.post(
  "/users/:userId/validate-password",
  isAuth,
  UserController.validatePassword
);

userRoutes.put("/users/:userId/inactive", isAuth, UserController.setInactive);

userRoutes.put("/users/:userId/active", isAuth, UserController.setActive);

userRoutes.get(
  "/users/:userId/check-inactive",
  isAuth,
  UserController.checkCanBeInactive
);

export default userRoutes;

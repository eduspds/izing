import { Request, Response } from "express";
import { validateInviteToken, acceptInvite } from "../services/UserServices/AcceptInviteService";

export const validateToken = async (req: Request, res: Response): Promise<Response> => {
  const token = (req.query.token as string) || "";
  const result = await validateInviteToken(token);
  return res.json(result);
};

export const accept = async (req: Request, res: Response): Promise<Response> => {
  const { token, name, password } = req.body;
  const user = await acceptInvite({ token, name, password });
  return res.status(200).json(user);
};

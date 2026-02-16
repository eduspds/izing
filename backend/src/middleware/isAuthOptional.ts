import { verify } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import authConfig from "../config/auth";

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  tenantId: number;
  iat: number;
  exp: number;
}

const isAuthOptional = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  // Se não houver token, continuar sem autenticação
  if (!authHeader) {
    return next();
  }

  const [, token] = authHeader.split(" ");

  try {
    const decoded = verify(token, authConfig.secret);
    const { id, profile, tenantId } = decoded as TokenPayload;

    // Se o token for válido, preencher req.user
    req.user = {
      id,
      profile,
      tenantId
    };
  } catch (err) {
    // Se o token for inválido, continuar sem autenticação (não lançar erro)
    // O controller pode verificar se req.user existe
  }

  return next();
};

export default isAuthOptional;




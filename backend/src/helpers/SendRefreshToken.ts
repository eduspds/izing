import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie("jrt", token, {
    httpOnly: true,
    secure: isProduction, // HTTPS apenas em produção
    sameSite: isProduction ? "none" : "lax", // Permite cross-site em produção
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
  });
};

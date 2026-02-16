/**
 * Polyfill para Web Crypto API (crypto.subtle) usada pelo Baileys.
 * Em alguns contextos (ts-node-dev, Node < 19) globalThis.crypto pode não existir,
 * causando "crypto is not defined" ao iniciar a sessão WhatsApp.
 * Deve ser o primeiro import do servidor.
 */
import nodeCrypto from "crypto";

const webcrypto = (nodeCrypto as any).webcrypto;
if (typeof webcrypto !== "undefined" && typeof (globalThis as any).crypto === "undefined") {
  (globalThis as any).crypto = webcrypto;
}

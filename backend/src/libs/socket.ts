// libs/socket.ts
import { Server as SocketIO } from "socket.io";
import socketRedis from "socket.io-redis";
import { Server } from "http";
import AppError from "../errors/AppError";
import decodeTokenSocket from "./decodeTokenSocket";
import { logger } from "../utils/logger";
import User from "../models/User";
import Chat from "./socketChat/Chat";

let io: SocketIO;

// ✅ CONTROLE DE CONEXÕES POR USUÁRIO
const userConnections = new Map<string, Set<string>>();
const MAX_CONNECTIONS_PER_USER = 3;

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "*",
      methods: ["GET", "POST"]
    },
    // ✅ CONFIGURAÇÕES OTIMIZADAS (COMPATÍVEIS COM SOCKET.IO v2)
    pingTimeout: 30000, // 30 segundos (balanceado)
    pingInterval: 15000, // 15 segundos
    maxHttpBufferSize: 1e6, // 1MB max buffer (reduzido para segurança)
    transports: ["websocket", "polling"], // ✅ Fallback
    // ✅ CONFIGURAÇÕES ADICIONAIS DO v2
    serveClient: false, // Não servir cliente Socket.IO
    path: "/socket.io/" // Path padrão
    // ✅ RECONNECTION CONFIG (gerenciada pelo cliente)
    // A reconexão é principalmente controlada pelo cliente no v2
  });

  // ✅ REDIS ADAPTER (com tratamento de erro)
  try {
    const connRedis = {
      host: process.env.IO_REDIS_SERVER,
      port: Number(process.env.IO_REDIS_PORT),
      username: process.env.IO_REDIS_USERNAME,
      password: process.env.IO_REDIS_PASSWORD
    };

    if (process.env.IO_REDIS_SERVER) {
      const redis = socketRedis as any;
      io.adapter(redis(connRedis));
      logger.info("✅ Redis adapter configurado para Socket.IO");
    }
  } catch (error) {
    logger.error("❌ Erro ao configurar Redis adapter:", error);
  }

  // ✅ MIDDLEWARE DE AUTENTICAÇÃO CORRIGIDO
  io.use(async (socket, next) => {
    try {
      const token = socket?.handshake?.auth?.token;

      if (!token) {
        logger.warn("❌ Tentativa de conexão sem token");
        return next(new Error("Authentication error: Token required"));
      }

      const verify = decodeTokenSocket(token);

      if (!verify.isValid) {
        logger.warn(`❌ Token inválido: ${socket.id}`);
        return next(new Error("Authentication error: Invalid token"));
      }

      // ✅ VERIFICAR LIMITE DE CONEXÕES
      const userId = String(verify.data.id);
      if (!(await checkUserConnectionLimit(userId, socket.id))) {
        logger.warn(`❌ Usuário ${userId} excedeu limite de conexões`);
        return next(new Error("Authentication error: Too many connections"));
      }

      const auth = socket?.handshake?.auth;
      socket.handshake.auth = {
        ...auth,
        ...verify.data,
        id: userId,
        tenantId: String(verify.data.tenantId)
      };

      // ✅ CARREGAR DADOS DO USUÁRIO
      const user = await User.findByPk(verify.data.id, {
        attributes: [
          "id",
          "tenantId",
          "name",
          "email",
          "profile",
          "status",
          "lastLogin",
          "lastOnline"
        ]
      });

      if (!user) {
        logger.warn(`❌ Usuário não encontrado: ${verify.data.id}`);
        return next(new Error("Authentication error: User not found"));
      }

      socket.handshake.auth.user = user;

      logger.info(`✅ Autenticação bem-sucedida: ${user.name} (${socket.id})`);
      next();
    } catch (error) {
      logger.error(`❌ Erro na autenticação do socket ${socket.id}:`, error);
      socket.emit(`tokenInvalid:${socket.id}`);
      next(new Error("Authentication error: Internal server error"));
    }
  });

  // ✅ EVENTO DE CONEXÃO
  io.on("connection", socket => {
    const { tenantId, user, id: userId } = socket.handshake.auth;

    if (!tenantId || !user) {
      logger.error("❌ Conexão sem tenantId ou user, desconectando");
      socket.disconnect(true);
      return;
    }

    logger.info(
      `🔌 Client connected: ${user.name} (${socket.id}) - Tenant: ${tenantId}`
    );

    // ✅ REGISTRAR CONEXÃO DO USUÁRIO
    registerUserConnection(userId, socket.id);

    // ✅ ROOM DO TENANT
    socket.join(tenantId.toString());

    // ✅ ROOM PESSOAL DO USUÁRIO
    const userRoom = `${tenantId}:${userId}`;
    socket.join(userRoom);
    logger.info(`👤 User ${user.name} joined personal room: ${userRoom}`);

    // ✅ ATUALIZAR STATUS ONLINE
    updateUserOnlineStatus(userId, true);

    // ✅ EVENTOS DO CHAT
    socket.on(`${tenantId}:joinChatBox`, ticketId => {
      const roomName = `${tenantId}:${ticketId}`;
      socket.join(roomName);
      logger.info(`💬 ${user.name} joined ticket channel: ${roomName}`);
    });

    socket.on(`${tenantId}:joinNotification`, () => {
      const notificationRoom = `${tenantId}:notification`;
      socket.join(notificationRoom);
      logger.info(
        `🔔 ${user.name} joined notification channel: ${notificationRoom}`
      );
    });

    socket.on(`${tenantId}:joinTickets`, status => {
      const ticketsRoom = `${tenantId}:${status}`;
      socket.join(ticketsRoom);
      logger.info(`🎫 ${user.name} joined tickets channel: ${ticketsRoom}`);
    });

    // ✅ EVENTO DE DISCONNECT MELHORADO
    socket.on("disconnect", async (reason: any) => {
      logger.info(
        `🔌 Client disconnected: ${user.name} (${socket.id}) - Reason: ${reason}`
      );

      // ✅ REMOVER CONEXÃO DO USUÁRIO
      removeUserConnection(userId, socket.id);

      // ✅ VERIFICAR SE USUÁRIO AINDA TEM CONEXÕES
      const remainingConnections = getUserConnections(userId);

      if (remainingConnections.size === 0) {
        // ✅ ATUALIZAR STATUS OFFLINE (apenas se não há mais conexões)
        await updateUserOnlineStatus(userId, false);
        logger.info(
          `👤 ${user.name} marcado como offline - sem conexões ativas`
        );
      } else {
        logger.info(
          `👤 ${user.name} ainda tem ${remainingConnections.size} conexões ativas`
        );
      }

      // ✅ EMITIR ATUALIZAÇÃO DE STATUS
      emitOnlineUsersUpdate(tenantId);
    });

    // ✅ EVENTO PERSONALIZADO PARA RECONEXÃO (para v2)
    socket.on("client_reconnect", () => {
      logger.info(`🔌 Client reconnected: ${user.name} (${socket.id})`);
      // Re-join rooms se necessário
      socket.join(tenantId.toString());
      socket.join(`${tenantId}:${userId}`);
    });

    // ✅ REGISTRAR HANDLERS DO CHAT
    Chat.register(socket);

    // ✅ EMITIR ATUALIZAÇÃO INICIAL DE USUÁRIOS ONLINE
    emitOnlineUsersUpdate(tenantId);
  });

  return io;
};

// ✅ FUNÇÕES AUXILIARES PARA CONTROLE DE CONEXÕES

const checkUserConnectionLimit = async (
  userId: string,
  socketId: string
): Promise<boolean> => {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }

  const userSockets = userConnections.get(userId)!;

  // ✅ SE JÁ TEM MUITAS CONEXÕES, FECHAR MAIS ANTIGA
  if (userSockets.size >= MAX_CONNECTIONS_PER_USER) {
    const oldestSocket = Array.from(userSockets)[0];

    // Tentar desconectar socket mais antigo
    try {
      const socket = io?.sockets?.sockets?.get(oldestSocket);
      if (socket) {
        socket.emit("force_disconnect", "Too many connections");
        socket.disconnect(true);
        logger.warn(`🔌 Forçando desconexão de socket antigo: ${oldestSocket}`);
      }
    } catch (error) {
      logger.error("Erro ao desconectar socket antigo:", error);
    }

    // Remover do registro após desconexão
    setTimeout(() => {
      userSockets.delete(oldestSocket);
    }, 1000);
  }

  // ✅ VERIFICAR NOVAMENTE APÓS LIMPEZA
  if (userSockets.size >= MAX_CONNECTIONS_PER_USER) {
    return false;
  }

  userSockets.add(socketId);
  return true;
};

const registerUserConnection = (userId: string, socketId: string): void => {
  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId)!.add(socketId);
  logger.debug(
    `📊 Usuário ${userId} agora tem ${
      userConnections.get(userId)!.size
    } conexões`
  );
};

const removeUserConnection = (userId: string, socketId: string): void => {
  if (userConnections.has(userId)) {
    userConnections.get(userId)!.delete(socketId);

    // ✅ LIMPAR SE NÃO HÁ MAIS CONEXÕES
    if (userConnections.get(userId)!.size === 0) {
      userConnections.delete(userId);
    }
  }
};

const getUserConnections = (userId: string): Set<string> => {
  return userConnections.get(userId) || new Set();
};

const updateUserOnlineStatus = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  try {
    await User.update(
      {
        lastOnline: new Date(),
        status: isOnline ? "online" : "offline"
      },
      { where: { id: userId } }
    );
    logger.debug(
      `👤 Status atualizado: ${userId} -> ${isOnline ? "online" : "offline"}`
    );
  } catch (error) {
    logger.error("Erro ao atualizar status do usuário:", error);
  }
};

const emitOnlineUsersUpdate = (tenantId: string): void => {
  try {
    const onlineUsers = Array.from(userConnections.entries())
      .filter(([_, sockets]) => sockets.size > 0)
      .map(([userId]) => userId);

    io?.to(tenantId.toString()).emit(`${tenantId}:onlineUsersUpdate`, {
      onlineUsers,
      count: onlineUsers.length,
      timestamp: new Date()
    });

    logger.debug(
      `📊 Emitindo atualização: ${onlineUsers.length} usuários online no tenant ${tenantId}`
    );
  } catch (error) {
    logger.error("Erro ao emitir atualização de usuários online:", error);
  }
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};

// ✅ FUNÇÃO PARA DESCONECTAR USUÁRIO (útil para logout)
export const disconnectUser = (userId: string): void => {
  const userSockets = userConnections.get(userId);
  if (userSockets) {
    userSockets.forEach(socketId => {
      const socket = io?.sockets?.sockets?.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    });
    userConnections.delete(userId);
    logger.info(
      `🔌 Todas as conexões do usuário ${userId} foram desconectadas`
    );
  }
};

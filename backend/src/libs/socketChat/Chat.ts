/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-prototype-builtins */
import { Socket } from "socket.io";
import {
  find,
  findKey,
  forEach,
  fromPairs,
  isNull,
  size,
  sortBy,
  toPairs,
  without
} from "lodash";
import { sendToSelf, sendToUser, sortByKeys } from "./Utils";
import { shared } from "./Index";
import User from "../../models/User";
import { logger } from "../../utils/logger";

const events: any = {};

// LIMPEZA PERIÓDICA DE SOCKETS DESCONECTADOS
const startSocketCleanup = () => {
  setInterval(() => {
    let totalCleaned = 0;
    let totalActiveSockets = 0;
    let totalActiveUsers = 0;

    Object.keys(shared).forEach(key => {
      if (key.startsWith("socketData_")) {
        const dataTenant = shared[key];

        if (!dataTenant || !Array.isArray(dataTenant.sockets)) return;

        // LIMPAR SOCKETS DESCONECTADOS
        const beforeClean = dataTenant.sockets.length;
        dataTenant.sockets = dataTenant.sockets.filter(
          (socket: Socket) => socket && socket.connected
        );
        const afterClean = dataTenant.sockets.length;
        totalCleaned += beforeClean - afterClean;

        // LIMPAR USUÁRIOS SEM SOCKETS
        Object.keys(dataTenant.usersOnline).forEach(userId => {
          if (dataTenant.usersOnline[userId].sockets.length === 0) {
            delete dataTenant.usersOnline[userId];
          }
        });

        // LIMPAR USUÁRIOS IDLE SEM SOCKETS
        Object.keys(dataTenant.idleUsers).forEach(userId => {
          if (dataTenant.idleUsers[userId].sockets.length === 0) {
            delete dataTenant.idleUsers[userId];
          }
        });

        totalActiveSockets += afterClean;
        totalActiveUsers += Object.keys(dataTenant.usersOnline).length;
      }
    });

    if (totalCleaned > 0) {
      logger.info(
        `Socket cleanup: Removed ${totalCleaned} disconnected sockets. Active: ${totalActiveUsers} users, ${totalActiveSockets} sockets`
      );
    }
  }, 30000); // A cada 30 segundos
};

// INICIAR CLEANUP NA PRIMEIRA EXECUÇÃO
let cleanupStarted = false;

const JoinChatServer = async (socket: Socket) => {
  const { user } = socket.handshake.auth;

  // INICIAR CLEANUP SE AINDA NÃO FOI INICIADO
  if (!cleanupStarted) {
    startSocketCleanup();
    cleanupStarted = true;
    logger.info("Socket cleanup service started");
  }

  logger.info(`joinChatServer USER ${user.name}`);
  const { tenantId } = user;
  const socketDataTenant = `socketData_${tenantId}`;

  // ATUALIZAR STATUS ONLINE NO BANCO DE DADOS
  try {
    await User.update(
      {
        isOnline: true,
        status: "online",
        lastOnline: new Date()
      },
      { where: { id: user.id } }
    );
    logger.info(`User ${user.name} marked as online in database`);
  } catch (error) {
    logger.error(`Error updating user online status: ${error}`);
  }

  // INICIALIZAÇÃO SEGURA DA ESTRUTURA DE DADOS
  if (!shared[socketDataTenant]) {
    shared[socketDataTenant] = {
      sockets: [],
      usersOnline: {},
      idleUsers: {}
    };
  }

  const dataTenant = shared[socketDataTenant];

  // LIMPEZA PRÉVIA DE SOCKETS DESCONECTADOS
  dataTenant.sockets = dataTenant.sockets.filter(
    (s: Socket) => s && s.connected && s.id !== socket.id
  );

  // ADIÇÃO SEGURA DO SOCKET (EVITAR DUPLICAÇÃO)
  if (!dataTenant.sockets.find((s: Socket) => s.id === socket.id)) {
    dataTenant.sockets.push(socket);
  }

  // GERENCIAMENTO DE USUÁRIOS ONLINE
  if (!dataTenant.usersOnline[user.id]) {
    dataTenant.usersOnline[user.id] = {
      sockets: [],
      user
    };
  }

  // ADIÇÃO DO SOCKET AO USUÁRIO (EVITANDO DUPLICAÇÃO)
  const userSockets = dataTenant.usersOnline[user.id].sockets;
  if (!userSockets.includes(socket.id)) {
    userSockets.push(socket.id);
  }

  // LIMITE DE CONEXÕES POR USUÁRIO (MÁXIMO 20)
  if (userSockets.length > 20) {
    logger.warn(
      `User ${user.name} has too many connections: ${userSockets.length}`
    );
    // Manter apenas as 20 conexões mais recentes
    dataTenant.usersOnline[user.id].sockets = userSockets.slice(-20);
  }

  sendToSelf(socket, `${user.tenantId}:joinSuccessfully`);
  UpdateOnlineBubbles(socket);

  logger.info(
    `User ${user.name} connected with socket ${socket.id}. Total sockets: ${dataTenant.sockets.length}`
  );
};

const UpdateUsers = (socket: Socket) => {
  const { user } = socket.handshake.auth;

  const socketDataTenant = `socketData_${user.tenantId}`;
  const dataTenant = shared[socketDataTenant];

  if (!dataTenant) return;

  const sortedUserList = sortByKeys(dataTenant.usersOnline);

  // FILTRAR APENAS SOCKETS CONECTADOS
  const connectedSockets = dataTenant.sockets.filter(
    (s: Socket) => s.connected
  );

  forEach(sortedUserList, v => {
    const userValue = v.user;
    const { sockets } = v;

    if (userValue && sockets.length > 0) {
      forEach(sockets, sockId => {
        const socketFind = connectedSockets.find(s => s.id === sockId);

        if (socketFind && socketFind.connected) {
          if (userValue.role?.isAdmin || userValue.role?.isAgent) {
            socketFind.emit("updateUsers", sortedUserList);
          }
        }
      });
    }
  });
};

const UpdateOnlineBubbles = (socket: Socket) => {
  const { user } = socket.handshake.auth;

  const socketDataTenant = `socketData_${user.tenantId}`;
  const dataTenant = shared[socketDataTenant];

  if (!dataTenant) return;

  // FILTRAR APENAS SOCKETS CONECTADOS
  const connectedSockets = dataTenant.sockets.filter(
    (s: Socket) => s.connected
  );
  const onlineUsersCount = Object.keys(dataTenant.usersOnline).length;

  const sortedUserList = fromPairs(
    sortBy(toPairs(dataTenant.usersOnline), o => o[0])
  );

  const sortedIdleList = fromPairs(
    sortBy(toPairs(dataTenant.idleUsers), o => o[0])
  );

  const eventData = {
    action: "update",
    data: {
      usersOnline: sortedUserList,
      idleUsers: sortedIdleList
    }
  };

  // EMITIR APENAS PARA SOCKETS CONECTADOS
  connectedSockets.forEach((sock: Socket) => {
    if (sock.connected) {
      try {
        sock.emit(`${user.tenantId}:chat:updateOnlineBubbles`, sortedUserList);
        sock.emit(`${user.tenantId}:users`, eventData);
      } catch (error) {
        logger.error(`Error emitting to socket ${sock.id}: ${error}`);
      }
    }
  });

  logger.info(
    `UpdateOnlineBubbles emitted for tenant ${user.tenantId}: ${onlineUsersCount} online users to ${connectedSockets.length} sockets`
  );
};

const SpawnOpenChatWindows = (socket: Socket) => {
  const { user } = socket.handshake.auth;

  const userSchema = User.findByPk(user.id);
  sendToSelf(socket, "spawnChatWindow", userSchema);
};

const spawnChatWindow = (socket: Socket) => {
  socket.on("spawnChatWindow", async (userId: number) => {
    const user = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "profile"]
    });
    sendToSelf(socket, "spawnChatWindow", user);
  });
};

const onSetUserIdle = (socket: Socket) => {
  const { user } = socket.handshake.auth;

  const socketDataTenant = `socketData_${user.tenantId}`;

  socket.on(`${user.tenantId}:setUserIdle`, () => {
    let dataTenant: any = shared[socketDataTenant];

    if (!dataTenant) {
      shared[socketDataTenant] = {
        sockets: [],
        usersOnline: {},
        idleUsers: {}
      };
      dataTenant = shared[socketDataTenant];
    }

    // INICIALIZAR ESTRUTURA DO USUÁRIO IDLE
    if (!dataTenant.idleUsers[user.id]) {
      dataTenant.idleUsers[user.id] = {
        sockets: [],
        user
      };
    }

    // ADICIONAR SOCKET AO USUÁRIO IDLE
    const idleSockets = dataTenant.idleUsers[user.id].sockets;
    if (!idleSockets.includes(socket.id)) {
      idleSockets.push(socket.id);
    }

    // REMOVER USUÁRIO DOS ONLINE SE ESTIVER LÁ
    if (dataTenant.usersOnline[user.id]) {
      const onlineSockets = dataTenant.usersOnline[user.id].sockets;
      dataTenant.usersOnline[user.id].sockets = onlineSockets.filter(
        (id: string) => id !== socket.id
      );

      if (dataTenant.usersOnline[user.id].sockets.length === 0) {
        delete dataTenant.usersOnline[user.id];
      }
    }

    UpdateOnlineBubbles(socket);
    logger.info(`User ${user.name} set as idle`);
  });
};

const onSetUserActive = (socket: Socket) => {
  const { user } = socket.handshake.auth;
  const socketDataTenant = `socketData_${user.tenantId}`;

  socket.on(`${user.tenantId}:setUserActive`, async () => {
    let dataTenant = shared[socketDataTenant];

    if (!dataTenant) {
      shared[socketDataTenant] = {
        sockets: [],
        usersOnline: {},
        idleUsers: {}
      };
      dataTenant = shared[socketDataTenant];
    }

    // ATUALIZAR STATUS ONLINE NO BANCO
    try {
      await User.update(
        {
          isOnline: true,
          status: "online",
          lastOnline: new Date()
        },
        { where: { id: user.id } }
      );
      logger.info(
        `User ${user.name} set as active and marked online in database`
      );
    } catch (error) {
      logger.error(`Error updating user active status: ${error}`);
    }

    // REMOVER USUÁRIO DOS IDLE
    if (dataTenant.idleUsers[user.id]) {
      const idleSockets = dataTenant.idleUsers[user.id].sockets;
      dataTenant.idleUsers[user.id].sockets = idleSockets.filter(
        (id: string) => id !== socket.id
      );

      if (dataTenant.idleUsers[user.id].sockets.length === 0) {
        delete dataTenant.idleUsers[user.id];
      }
    }

    // ADICIONAR USUÁRIO AOS ONLINE
    if (!dataTenant.usersOnline[user.id]) {
      dataTenant.usersOnline[user.id] = {
        sockets: [],
        user
      };
    }

    const onlineSockets = dataTenant.usersOnline[user.id].sockets;
    if (!onlineSockets.includes(socket.id)) {
      onlineSockets.push(socket.id);
    }

    UpdateOnlineBubbles(socket);
    logger.info(`User ${user.name} set as active`);
  });
};

const onUpdateUsers = (socket: Socket) => {
  socket.on("updateUsers", () => {
    UpdateUsers(socket);
  });
};

const onChatMessage = (socket: Socket) => {
  const { user } = socket.handshake.auth;
  const { tenantId } = user;
  const socketDataTenant = `socketData_${tenantId}`;

  socket.on("chatMessage", function (data) {
    const dataTenant = shared[socketDataTenant];
    if (!dataTenant) return;

    const { to, from } = data;
    const od = data.type;

    if (data.type === "s") {
      data.type = "r";
    } else {
      data.type = "s";
    }

    // USAR APENAS SOCKETS CONECTADOS
    const connectedSockets = dataTenant.sockets.filter(
      (s: Socket) => s.connected
    );

    sendToUser(
      connectedSockets,
      dataTenant.usersOnline,
      data.toUser.username,
      "chatMessage",
      data
    );

    data.type = od;
    sendToUser(
      connectedSockets,
      dataTenant.usersOnline,
      data.fromUser.username,
      "chatMessage",
      data
    );
  });
};

const onChatTyping = (socket: Socket) => {
  const { user } = socket.handshake.auth;
  const { tenantId } = user;
  const socketDataTenant = `socketData_${tenantId}`;

  socket.on("chatTyping", data => {
    const dataTenant = shared[socketDataTenant];
    if (!dataTenant) return;

    const { to, from } = data;
    let toUser: any = null;
    let fromUser: any = null;

    find(dataTenant.usersOnline, function (v) {
      if (String(v.user.id) === String(to)) {
        toUser = v.user;
      }
      if (String(v.user.id) === String(from)) {
        fromUser = v.user;
      }
    });

    if (isNull(toUser) || isNull(fromUser)) {
      return;
    }

    data.toUser = toUser;
    data.fromUser = fromUser;

    // USAR APENAS SOCKETS CONECTADOS
    const connectedSockets = dataTenant.sockets.filter(
      (s: Socket) => s.connected
    );

    sendToUser(
      connectedSockets,
      dataTenant.usersOnline,
      toUser.name,
      "chatTyping",
      data
    );
  });
};

const onChatStopTyping = (socket: Socket) => {
  const { user } = socket.handshake.auth;
  const { tenantId } = user;
  const socketDataTenant = `socketData_${tenantId}`;

  socket.on("chatStopTyping", data => {
    const dataTenant = shared[socketDataTenant];
    if (!dataTenant) return;

    const { to } = data;
    let toUser: any = null;

    find(dataTenant.usersOnline, v => {
      if (String(v.user.id) === String(to)) {
        toUser = v.user;
      }
    });

    if (isNull(toUser)) {
      return;
    }

    data.toUser = toUser;

    // USAR APENAS SOCKETS CONECTADOS
    const connectedSockets = dataTenant.sockets.filter(
      (s: Socket) => s.connected
    );

    sendToUser(
      connectedSockets,
      dataTenant.usersOnline,
      toUser.name,
      "chatStopTyping",
      data
    );
  });
};

const saveChatWindow = (socket: Socket) => {
  socket.on("saveChatWindow", async data => {
    const { userId } = data;
    const { remove } = data;
    const userSchema = await User.findByPk(userId);

    if (userSchema) {
      if (remove) {
        // remover o chat do usuário
        // user.removeOpenChatWindow(convoId)
      } else {
        // adiciona o chat ao usuario
        // user.addOpenChatWindow(convoId)
      }
    }
  });
};

const onDisconnect = (socket: Socket) => {
  socket.on("disconnect", async reason => {
    const { user } = socket.handshake.auth;
    const { tenantId } = user;
    const socketDataTenant = `socketData_${tenantId}`;
    const dataTenant = shared[socketDataTenant];

    if (!dataTenant) return;

    // Remover socket do array principal
    dataTenant.sockets = dataTenant.sockets.filter(
      (s: Socket) => s && s.id !== socket.id
    );

    // Remover socket do usuário online
    if (dataTenant.usersOnline[user.id]) {
      const userSockets = dataTenant.usersOnline[user.id].sockets;
      dataTenant.usersOnline[user.id].sockets = userSockets.filter(
        (id: string) => id !== socket.id
      );

      // Se não há mais sockets, remover usuário dos online
      if (dataTenant.usersOnline[user.id].sockets.length === 0) {
        delete dataTenant.usersOnline[user.id];
      }
    }

    //  Remover socket dos usuários idle
    if (dataTenant.idleUsers[user.id]) {
      const idleSockets = dataTenant.idleUsers[user.id].sockets;
      dataTenant.idleUsers[user.id].sockets = idleSockets.filter(
        (id: string) => id !== socket.id
      );

      if (dataTenant.idleUsers[user.id].sockets.length === 0) {
        delete dataTenant.idleUsers[user.id];
      }
    }

    // ATUALIZAR STATUS NO BANCO APENAS SE NÃO HÁ MAIS CONEXÕES
    const hasOtherConnections =
      dataTenant.usersOnline[user.id]?.sockets.length > 0;

    if (!hasOtherConnections) {
      try {
        await User.update(
          {
            isOnline: false,
            status: "offline",
            lastOnline: new Date()
          },
          { where: { id: user.id } }
        );
        logger.info(`User ${user.name} marked as offline in database`);
      } catch (error) {
        logger.error(`Error updating user offline status: ${error}`);
      }
    }

    UpdateOnlineBubbles(socket);

    if (reason === "transport error") {
      reason = "client terminated";
    }

    logger.info(`SOCKET Client disconnected , ${tenantId}, ${reason}`);
    logger.info(
      `User ${user.name} disconnected: ${reason} - socket: ${socket.id}`
    );
  });
};

// REGISTRO DE EVENTOS
events.onSetUserIdle = onSetUserIdle;
events.onSetUserActive = onSetUserActive;
events.onUpdateUsers = onUpdateUsers;
events.spawnChatWindow = spawnChatWindow;
events.onChatMessage = onChatMessage;
events.onChatTyping = onChatTyping;
events.onChatStopTyping = onChatStopTyping;
events.saveChatWindow = saveChatWindow;
events.onDisconnect = onDisconnect;

events.updateOnlineBubbles = (socket: Socket) => {
  const { user } = socket.handshake.auth;
  socket.on(`${user.tenantId}:chat:updateOnlineBubbles`, () => {
    UpdateOnlineBubbles(socket);
  });
};

events.getOpenChatWindows = (socket: Socket) => {
  socket.on("getOpenChatWindows", () => {
    SpawnOpenChatWindows(socket);
  });
};

// FUNÇÃO PRINCIPAL DE REGISTRO
function register(socket: Socket): void {
  if (!socket.handshake?.auth?.tenantId) {
    logger.warn("Socket connection rejected: Missing tenantId");
    return;
  }

  if (!socket.handshake.auth.user?.id) {
    logger.warn("Socket connection rejected: Missing user ID");
    return;
  }

  // REGISTRAR TODOS OS EVENTOS
  events.onSetUserIdle(socket);
  events.onSetUserActive(socket);
  events.onUpdateUsers(socket);
  events.updateOnlineBubbles(socket);
  events.spawnChatWindow(socket);
  events.getOpenChatWindows(socket);
  events.onChatMessage(socket);
  events.onChatTyping(socket);
  events.onChatStopTyping(socket);
  events.saveChatWindow(socket);
  events.onDisconnect(socket);

  JoinChatServer(socket);
}

const eventLoop = (socket: Socket) => {
  UpdateUsers(socket);
  UpdateOnlineBubbles(socket);
};

const chat = {
  events,
  eventLoop,
  register
};

export default chat;

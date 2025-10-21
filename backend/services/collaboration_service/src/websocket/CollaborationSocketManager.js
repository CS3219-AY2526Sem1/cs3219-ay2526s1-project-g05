import { ApiError } from "../errors/ApiError.js";

export class CollaborationSocketManager {
  constructor({ collaborationService, logger = console } = {}) {
    this.collaborationService = collaborationService;
    this.logger = logger;
    this.io = null;
  }

  bind(io) {
    this.io = io;
    io.on("connection", (socket) => {
      this.logger.info?.("Collaboration socket connected", { socketId: socket.id });
      this.configureSocket(socket);
    });
  }

  configureSocket(socket) {
    socket.on("session:join", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const { sessionId, userId, username } = payload;
        const session = await this.collaborationService.joinSession(sessionId, {
          userId,
          username,
        });

        socket.data.sessionId = session.id;
        socket.data.userId = userId;
        socket.data.username = username ?? null;
        socket.data.hasLeft = false;
        socket.join(this.roomName(session.id));
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:operation", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const userId = payload.userId ?? socket.data.userId;
        const result = await this.collaborationService.recordOperation(sessionId, {
          ...payload,
          userId,
        });
        this.io
          ?.to(this.roomName(result.session.id))
          .emit("session:operation", { session: result.session, conflict: result.conflict });
        return result;
      });
    });

    socket.on("session:leave", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const userId = payload.userId ?? socket.data.userId;
        const session = await this.collaborationService.leaveSession(sessionId, {
          ...payload,
          userId,
        });
        socket.data.hasLeft = true;
        socket.leave(this.roomName(session.id));
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:reconnect", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const userId = payload.userId ?? socket.data.userId;
        const session = await this.collaborationService.reconnectParticipant(sessionId, userId);
        socket.join(this.roomName(session.id));
        socket.data.hasLeft = false;
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:propose", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.proposeQuestionChange(sessionId, payload);
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:respond", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.respondToQuestionChange(sessionId, payload);
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:end", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.requestSessionEnd(sessionId, payload);
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("disconnect", async () => {
      const { sessionId, userId, hasLeft } = socket.data ?? {};
      if (!sessionId || !userId || hasLeft) {
        return;
      }
      if (this.hasActiveSocketForUser(sessionId, userId, socket.id)) {
        return;
      }
      try {
        const session = await this.collaborationService.leaveSession(sessionId, {
          userId,
          reason: "disconnect",
        });
        this.emitSessionState(session);
      } catch (error) {
        if (error instanceof ApiError) {
          this.logger.warn?.("Failed to mark disconnection", {
            socketId: socket.id,
            sessionId,
            userId,
            status: error.status,
            message: error.message,
          });
        } else {
          this.logger.error?.(error);
        }
      }
    });
  }

  async handleAction(socket, payload, callback, handler) {
    try {
      const result = await handler(payload);
      if (typeof callback === "function") {
        callback({ ok: true, ...result });
      }
    } catch (error) {
      const apiError =
        error instanceof ApiError
          ? error
          : new ApiError(500, "An unexpected error occurred while handling the socket event.");
      if (typeof callback === "function") {
        callback({ ok: false, error: { status: apiError.status, message: apiError.message } });
      }
      if (error !== apiError) {
        this.logger.error?.(error);
      }
    }
  }

  roomName(sessionId) {
    return `session:${sessionId}`;
  }

  emitSessionState(session) {
    if (!this.io || !session?.id) return;
    this.io.to(this.roomName(session.id)).emit("session:state", { session });
  }

  hasActiveSocketForUser(sessionId, userId, excludeSocketId) {
    if (!this.io) {
      return false;
    }
    const room = this.io.sockets.adapter.rooms.get(this.roomName(sessionId));
    if (!room) {
      return false;
    }
    for (const socketId of room) {
      if (socketId === excludeSocketId) continue;
      const peer = this.io.sockets.sockets.get(socketId);
      if (peer?.data?.userId === userId && !peer.data?.hasLeft) {
        return true;
      }
    }
    return false;
  }
}

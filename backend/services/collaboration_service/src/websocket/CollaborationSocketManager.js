import { ApiError } from "../errors/ApiError.js";
import { verify_token_user } from "../../../../common_scripts/authentication_middleware.js";

export class CollaborationSocketManager {
  constructor({ collaborationService, logger = console } = {}) {
    this.collaborationService = collaborationService;
    this.logger = logger;
    this.io = null;
  }

  bind(io) {
    this.io = io;
    io.use(async (socket, next) => {
      // Handle authentication
      const token = socket.handshake.auth.token;
      const result = await verify_token_user(token);

      if (!result.success) {
        return next(new Error("Authentication error: " + result.error));
      }

      socket.data.user = result.decoded;
      next();
    });

    io.on("connection", (socket) => {
      this.logger.info?.("Collaboration socket connected", {
        socketId: socket.id,
      });
      this.configureSocket(socket);
    });
  }

  configureSocket(socket) {
    socket.on("session:join", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.joinSession(
          socket.data.user,
          payload,
        );

        socket.data.sessionId = session.id;
        socket.data.hasLeft = false;

        socket.join(session.id);

        this.emitSessionState(session);
        return session;
      });
    });

    socket.on("session:operation", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const result = await this.collaborationService.recordOperation(
          socket.data.sessionId,
          socket.data.user.id,
          payload,
        );

        this.io?.to(result.id).emit("session:operation", {
          session: result.session,
          conflict: result.conflict,
        });

        return result;
      });
    });

    socket.on("session:leave", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.leaveSession(
          socket.data.sessionId,
          socket.data.user.id,
          {
            reason: "leave",
          },
        );

        socket.data.hasLeft = true;
        socket.leave(session.id);

        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:propose", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.proposeQuestionChange(
          socket.data.sessionId,
          socket.data.user.id,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:respond", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.respondToQuestionChange(
          socket.data.sessionId,
          socket.data.user.id,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:end", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.requestSessionEnd(
          socket.data.sessionId,
          socket.data.user.id,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("disconnect", async () => {
      const { sessionId, user, hasLeft } = socket.data ?? {};
      if (!sessionId || hasLeft) return;

      if (this.hasActiveSocketForUser(sessionId, user?.id, socket.id)) return;

      try {
        const session = await this.collaborationService.leaveSession(
          socket.data.sessionId,
          user.id,
          {
            reason: "disconnect",
          },
        );
        this.emitSessionState(session);
      } catch (error) {
        if (error instanceof ApiError) {
          this.logger.warn?.("Failed to mark disconnection", {
            socketId: socket.id,
            sessionId,
            userId: user?.id,
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
          : new ApiError(
              500,
              "An unexpected error occurred while handling the socket event.",
            );
      if (typeof callback === "function") {
        callback({
          ok: false,
          error: { status: apiError.status, message: apiError.message },
        });
      }
      if (error !== apiError) {
        this.logger.error?.(error);
      }
    }
  }

  emitSessionState(session) {
    if (!this.io || !session?.id) return;

    this.io.to(session.sessionId).emit("session:state", { session });

    if (session.status === "ended") {
      this.kickAllFromSession(session.sessionId);
    }
  }

  hasActiveSocketForUser(sessionId, userId, excludeSocketId) {
    if (!this.io) {
      return false;
    }

    const room = this.io.sockets.adapter.rooms.get(sessionId);
    if (!room) {
      return false;
    }

    for (const socketId of room) {
      if (socketId === excludeSocketId) continue;
      const peer = this.io.sockets.sockets.get(socketId);

      if (peer?.data?.user?.id === userId && !peer.data?.hasLeft) {
        return true;
      }
    }
    return false;
  }

  kickAllFromSession(sessionId, excludeSocketId) {
    if (!this.io) {
      return;
    }

    const room = this.io.sockets.adapter.rooms.get(sessionId);

    if (!room) {
      return;
    }

    for (const socketId of room) {
      if (socketId === excludeSocketId) {
        continue;
      }

      const peer = this.io.sockets.sockets.get(socketId);

      if (!peer) {
        continue;
      }
      peer.data.hasLeft = true;
      peer.leave(sessionId);
      peer.disconnect(true);
    }
  }
}

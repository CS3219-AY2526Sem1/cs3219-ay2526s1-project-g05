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
        socket.data.roomId = session.roomId;
        socket.join(session.roomId);
        this.emitSessionState(session);
        return session;
      });
    });

    socket.on("session:operation", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const userId = payload.userId ?? socket.data.userId;
        const result = await this.collaborationService.recordOperation(
          sessionId,
          {
            ...payload,
            userId,
          },
        );
        this.io
          ?.to(this.roomName(result.session.id))
          .emit("session:operation", {
            session: result.session,
            conflict: result.conflict,
          });
        return result;
      });
    });

    socket.on("session:leave", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.leaveSession({
          userId: socket.data.user.id,
          sessionId: socket.data.sessionId,
          reason: "leave",
        });
        socket.data.hasLeft = true;
        socket.leave(session.roomId);
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:propose", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.proposeQuestionChange(
          sessionId,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:question:respond", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.respondToQuestionChange(
          sessionId,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("session:end", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const sessionId = payload.sessionId ?? socket.data.sessionId;
        const session = await this.collaborationService.requestSessionEnd(
          sessionId,
          payload,
        );
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("disconnect", async () => {
      const { sessionId, user, hasLeft } = socket.data ?? {};
      if (!sessionId || hasLeft) {
        return;
      }
      if (this.hasActiveSocketForUser(sessionId, user.id, socket.id)) {
        return;
      }
      try {
        const session = await this.collaborationService.leaveSession({
          userId: user.id,
          sessionId: socket.data.sessionId,
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

  roomName(sessionId) {
    return `session:${sessionId}`;
  }

  emitSessionState(session) {
    if (!this.io || !session?.id) return;

    this.io.to(session.roomId).emit("session:state", { session });
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

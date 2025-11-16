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

      socket.data.user = result.user;
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
      await this.handleAction(
        socket,
        payload,
        callback,
        async () => {
          const updatedSession =
            await this.collaborationService.resolveOperation(
              socket.data.sessionId,
              socket.data.user.id,
              payload,
            );

          const roomId = updatedSession?.session?.id;

          if (roomId) {
            this.io?.to(roomId).emit("session:operation", {
              session: updatedSession.session,
              conflict: updatedSession.conflict,
            });
          }

          if (updatedSession.conflict) {
            return null;
          }

          const result = await this.collaborationService.recordOperation(
            socket.data.sessionId,
            socket.data.user.id,
            updatedSession.session,
          );

          return result;
        },
        false,
      ); // Do not callback to avoid repeat calls
    });

    socket.on("session:leave", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.leaveSession(
          socket.data.sessionId,
          socket.data.user.id,
          {
            sessionId: socket.data.sessionId,
            reason: "left",
            terminateForAll: true,
          },
        );

        socket.to(socket.data.sessionId).emit("session:leave", {});

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

    socket.on("session:chat:message", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const content = (payload && payload.content) || "";
        if (!content || typeof content !== "string") {
          throw new ApiError(400, "Message content is required.");
        }

        const message = {
          id: Date.now().toString(),
          content,
          timestamp: new Date().toISOString(),
          clientMessageId: payload?.clientMessageId,
          sender: {
            id: socket.data.user?.id,
            name:
              socket.data.user?.username || socket.data.user?.name || "User",
          },
        };

        // Broadcast to the session room
        this.io
          ?.to(socket.data.sessionId)
          .emit("session:chat:message", { message });

        return { message };
      });
    });

    socket.on("session:end", async (payload = {}, callback) => {
      await this.handleAction(socket, payload, callback, async () => {
        const session = await this.collaborationService.requestSessionEnd(
          socket.data.sessionId,
          socket.data.user.id,
          payload,
        );

        if (session.status === "ended")
          this.io?.to(socket.data.sessionId).emit("session:ended"); // This sends to everyone
        else socket.to(socket.data.sessionId).emit("session:end"); // This only sends to other users in the room, not itself
        this.emitSessionState(session);
        return { session };
      });
    });

    socket.on("disconnect", async () => {
      const { sessionId, user, hasLeft } = socket.data ?? {};
      console.log("Socket disconnected", { socketId: socket.id });
      if (!sessionId || hasLeft) return;

      if (this.hasActiveSocketForUser(sessionId, user?.id, socket.id)) return;

      try {
        const session = await this.collaborationService.leaveSession(
          socket.data.sessionId,
          user.id,
          {
            sessionId: socket.data.sessionId,
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

  async handleAction(
    _socket,
    payload,
    callback,
    handler,
    shouldCallback = true,
  ) {
    try {
      const result = await handler(payload);
      if (typeof callback === "function" && shouldCallback) {
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

    const roomId = session?.id;
    if (!roomId) return;

    this.io.to(roomId).emit("session:state", { session });

    if (session.status === "ended") {
      this.kickAllFromSession(roomId);
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

import {
  COLLABORATION_API_URL,
  collaborationApi,
} from "@/lib/collaborationApi";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { toast } from "sonner";
import { debounce } from "lodash";
import { useUserContext } from "./UserContext";
import { API_BASE_URL } from "../lib/api.js";

const CollaborationSessionContext = createContext(null);

const normalizeSession = (raw) => {
  if (!raw) return null;

  const sessionData = raw.session ?? raw;
  if (!sessionData) return null;

  const {
    ok: _ok,
    error: _error,
    id,
    sessionId,
    _id,
    participants = [],
    cursorPositions = {},
    ...rest
  } = sessionData;

  const normalizedId = id ?? sessionId ?? _id?.toString?.() ?? _id ?? null;

  return {
    id: normalizedId,
    participants: participants ?? [],
    cursorPositions: cursorPositions ?? {},
    ...rest,
  };
};

export const CollaborationSessionProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, refreshUserData } = useUserContext();

  const socketRef = useRef(null);
  const sessionIdRef = useRef(null);
  const versionRef = useRef(-1);
  const joinInFlightRef = useRef(false);
  const snapshotTimeoutRef = useRef(null);
  const sentClientMessageIds = useRef(new Set());
  const userJustLeft = useRef(false);

  const [session, setSession] = useState(null);
  const [connected, setConnected] = useState(false);
  const [code, setCode] = useState("");
  const [participants, setParticipants] = useState([]);
  const [cursorPositions, setCursorPositions] = useState({});
  const [lastConflict, setLastConflict] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [partnerRequestedLeave, setPartnerRequestedLeave] = useState(false);
  const [messages, setMessages] = useState([]);

  const resetState = useCallback(() => {
    setSession(null);
    setCode("");
    setParticipants([]);
    setCursorPositions({});
    setLastConflict(null);
    setIsJoining(false);
    setPartnerRequestedLeave(false);
    setMessages([]);
    versionRef.current = -1;
    sessionIdRef.current = null;
    if (snapshotTimeoutRef.current) {
      clearTimeout(snapshotTimeoutRef.current);
      snapshotTimeoutRef.current = null;
    }
  }, []);

  const applySessionState = useCallback(
    (rawSession, { conflict = false } = {}) => {
      const normalized = normalizeSession(rawSession);
      if (!normalized || !normalized.id) {
        return;
      }

      if (normalized.version <= versionRef.current) {
        return;
      }

      setSession(normalized);
      if (normalized.code) setCode(normalized.code);
      setParticipants(normalized.participants ?? []);
      setCursorPositions(normalized.cursorPositions ?? {});
      versionRef.current = normalized.version;
      sessionIdRef.current = normalized.id;

      if (normalized.status === "ended") {
        toast.info("Collaboration session has ended.");
        refreshUserData?.();
      }

      if (conflict) {
        setLastConflict({ at: new Date().toISOString() });
        toast.warning("You were out of date. Editor updated to latest state.");
      }
    },
    [refreshUserData],
  );

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
    joinInFlightRef.current = false;
    if (snapshotTimeoutRef.current) {
      clearTimeout(snapshotTimeoutRef.current);
      snapshotTimeoutRef.current = null;
    }
  }, []);

  const fetchSessionSnapshot = useCallback(
    async (sessionId) => {
      if (!sessionId) return null;
      try {
        const result = await collaborationApi.getSession(sessionId);
        const sessionData = normalizeSession(result.session ?? result);
        if (sessionData) {
          applySessionState(sessionData);
        }
        return sessionData;
      } catch (error) {
        console.error("Failed to fetch collaboration session:", error);
        return null;
      }
    },
    [applySessionState],
  );

  const scheduleSnapshotRefresh = useCallback(() => {
    if (!sessionIdRef.current) return;
    if (snapshotTimeoutRef.current) return;

    snapshotTimeoutRef.current = setTimeout(async () => {
      snapshotTimeoutRef.current = null;
      try {
        await fetchSessionSnapshot(sessionIdRef.current);
      } catch (error) {
        console.error(
          "Failed to refresh collaboration session snapshot:",
          error,
        );
      }
    }, 200);
  }, [fetchSessionSnapshot]);

  const handleMessage = useCallback(
    ({ message }) => {
      if (
        message?.clientMessageId &&
        sentClientMessageIds.current.has(message.clientMessageId)
      ) {
        sentClientMessageIds.current.delete(message.clientMessageId);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          ...message,
          isCurrentUser: message?.sender?.id === user?.id,
        },
      ]);
    },
    [user],
  );

  const handleLeaveCleanup = useCallback(async () => {
    userJustLeft.current = true;
    disconnectSocket();
    resetState();

    try {
      await refreshUserData();
    } catch (e) {
      console.warn("refreshUserData failed:", e);
    }

    setPartnerRequestedLeave(false);
  }, [disconnectSocket, resetState, refreshUserData]);

  const handleOtherUserLeft = useCallback(async ({ _message }) => {
    toast.info("The other user has left the collaboration session.");

    handleLeaveCleanup();
  }, []);

  const handleSessionEnded = useCallback(() => {
    toast.info("The collaboration session has ended.");
    handleLeaveCleanup();
  }, []);

  const handlePartnerRequestedLeave = useCallback(() => {
    console.log("Partner has requested to end the session");
    setPartnerRequestedLeave(true);
  }, []);

  useEffect(() => {
    const activeSessionId = user?.collaborationSessionId;

    if (!token || !activeSessionId) {
      if (socketRef.current) {
        disconnectSocket();
        resetState();
      }

      if (location.pathname === "/session") {
        if (userJustLeft.current) {
          navigate("/session-disconnected", {
            state: { reason: userJustLeft.current },
          }); // userJustLeft is picked up here and "consumed", the user then gets directed to the disconnect page
          userJustLeft.current = false;
        } else {
          navigate("/matchmaking");
        }
      }

      return;
    }

    if (!location.pathname.startsWith("/session")) {
      navigate("/session");
    }

    if (
      socketRef.current &&
      sessionIdRef.current &&
      sessionIdRef.current === activeSessionId
    ) {
      return;
    }

    if (socketRef.current) {
      disconnectSocket();
      resetState();
    }

    const socket = io(
      import.meta.env.MODE === "production"
        ? `${window.location.protocol}//${window.location.host}`
        : COLLABORATION_API_URL,
      {
        query: { affinity: activeSessionId },
        auth: { token },
        path:
          import.meta.env.MODE === "production"
            ? `${API_BASE_URL}${COLLABORATION_API_URL}/socket.io`
            : "/socket.io",
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
      },
    );

    socketRef.current = socket;
    sessionIdRef.current = activeSessionId;

    const handleConnect = () => {
      setConnected(true);

      if (joinInFlightRef.current) return;

      joinInFlightRef.current = true;
      setIsJoining(true);

      socket.emit(
        "session:join",
        { sessionId: activeSessionId },
        async (response) => {
          joinInFlightRef.current = false;
          setIsJoining(false);

          if (!response) {
            toast.error("Failed to join collaboration session.");
            return;
          }

          if (response.ok === false) {
            toast.error(response.error?.message ?? "Failed to join session.");
            disconnectSocket();
            resetState();
            return;
          }

          const normalized = normalizeSession(response);
          if (!normalized || !normalized.id) {
            toast.error("Received malformed session data from server.");
            return;
          }

          applySessionState(normalized);
        },
      );
    };

    const handleConnectError = (error) => {
      console.error("Collaboration socket connect error:", error);
    };

    const handleDisconnect = () => {
      setConnected(false);
    };

    const handleSessionState = ({ session: nextSession }) => {
      if (!nextSession) return;
      applySessionState(nextSession);
    };

    const handleSessionOperation = ({ session: nextSession, conflict }) => {
      if (!nextSession) return;
      applySessionState(nextSession, { conflict });
      scheduleSnapshotRefresh();
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("session:state", handleSessionState);
    socket.on("session:operation", handleSessionOperation);
    socket.on("session:chat:message", handleMessage);
    socket.on("session:leave", handleOtherUserLeft);
    socket.on("session:end", handlePartnerRequestedLeave);
    socket.on("session:ended", handleSessionEnded);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("session:state", handleSessionState);
      socket.off("session:operation", handleSessionOperation);
      socket.off("session:chat:message", handleMessage);
      socket.off("session:leave", handleOtherUserLeft);
      socket.off("session:end", handlePartnerRequestedLeave);
      socket.off("session:ended", handleSessionEnded);
      disconnectSocket();
      resetState();
    };
  }, [
    token,
    user?.collaborationSessionId,
    navigate,
    location,
    disconnectSocket,
    resetState,
    applySessionState,
    scheduleSnapshotRefresh,
    handleMessage,
    handleOtherUserLeft,
    handlePartnerRequestedLeave,
    handleSessionEnded,
  ]);

  const requestSessionEnd = useCallback(() => {
    socketRef.current?.emit("session:end", {
      sessionId: sessionIdRef.current,
      confirm: true,
    });
  }, []);

  const acceptRequestedLeave = useCallback(() => {
    socketRef.current?.emit("session:end", {
      sessionId: sessionIdRef.current,
      confirm: true,
    });
  }, []);

  const sendChatMessage = useCallback(
    (content) => {
      if (!socketRef.current) return;
      if (!content || !content.trim()) return;

      const clientMessageId = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}`;
      const optimistic = {
        id: clientMessageId,
        content,
        timestamp: new Date().toISOString(),
        sender: { id: user?.id, name: user?.username || user?.name || "You" },
        isCurrentUser: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      sentClientMessageIds.current.add(clientMessageId);

      socketRef.current.emit(
        "session:chat:message",
        { content, clientMessageId },
        (ack) => {
          if (!ack?.ok) {
            toast.error(ack?.error?.message || "Failed to send message");
          }
        },
      );
    },
    [user],
  );

  const emitWithAck = useCallback((event, payload) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error("Collaboration socket is not connected."));
        return;
      }

      socketRef.current
        .timeout(5000)
        .emit(event, payload, (error, response) => {
          if (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
            return;
          }

          if (!response) {
            reject(new Error("No acknowledgement received from server."));
            return;
          }

          if (response.ok === false) {
            const message = response.error?.message ?? "Operation failed.";
            const err = new Error(message);
            err.status = response.error?.status;
            reject(err);
            return;
          }

          resolve(response);
        });
    });
  }, []);

  const sendOperationRaw = useCallback(
    ({ type, range, content, cursor, version }) => {
      const activeSessionId = sessionIdRef.current;
      if (!activeSessionId) {
        throw new Error("No active collaboration session.");
      }
      const payload = {
        type,
        range,
        content,
        cursor,
        version: version ?? versionRef.current,
      };

      socketRef.current?.emit("session:operation", payload);
    },
    [],
  );

  const sendCursorRaw = useCallback(
    async ({ cursor }) => {
      if (!cursor) return;
      sendOperationRaw({ type: "cursor", cursor });
    },
    [sendOperationRaw],
  );

  const sendOperation = useMemo(
    () => debounce(sendOperationRaw, 300),
    [sendOperationRaw],
  );

  const sendCursor = useMemo(
    () => debounce(sendCursorRaw, 450),
    [sendCursorRaw],
  );

  const leaveSession = useCallback(
    async ({ terminateForAll = false } = {}) => {
      const activeSessionId = sessionIdRef.current;

      try {
        await emitWithAck("session:leave", {
          sessionId: activeSessionId,
          terminateForAll,
        });
      } catch (err) {
        console.error("leaveSession error:", err);
        userJustLeft.current = false;
        return;
      }

      handleLeaveCleanup();
    },
    [emitWithAck, disconnectSocket, resetState, refreshUserData],
  );

  const value = useMemo(
    () => ({
      session,
      code,
      participants,
      cursorPositions,
      connected,
      version: versionRef.current,
      isJoining,
      lastConflict,
      sendOperation,
      sendCursor,
      fetchSessionSnapshot,
      messages,
      sendChatMessage,
      leaveSession,
      partnerRequestedLeave,
      handlePartnerRequestedLeave,
      acceptRequestedLeave,
      requestSessionEnd,
    }),
    [
      session,
      code,
      participants,
      cursorPositions,
      connected,
      isJoining,
      lastConflict,
      sendOperation,
      sendCursor,
      fetchSessionSnapshot,
      messages,
      sendChatMessage,
      leaveSession,
      partnerRequestedLeave,
      handlePartnerRequestedLeave,
      acceptRequestedLeave,
      requestSessionEnd,
    ],
  );

  return (
    <CollaborationSessionContext.Provider value={value}>
      {children}
    </CollaborationSessionContext.Provider>
  );
};

export const useCollaborationSession = () =>
  useContext(CollaborationSessionContext);

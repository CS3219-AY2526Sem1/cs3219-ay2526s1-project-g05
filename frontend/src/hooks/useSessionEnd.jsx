import { useState } from "react";

export function useSessionEnd() {
  const [state, setState] = useState({
    requestPending: false,
    lastRequestTime: null,
    requestRejected: false,
    incomingRequest: false,
  });

  const sendEndRequest = () => {
    setState((prev) => ({
      ...prev,
      requestPending: true,
      lastRequestTime: Date.now(),
    }));
  };

  const receiveEndRequest = () => {
    setState((prev) => ({
      ...prev,
      incomingRequest: true,
    }));
  };

  const acceptEndRequest = () => {
    setState((prev) => ({
      ...prev,
      incomingRequest: false,
      requestPending: false,
    }));
  };

  const rejectEndRequest = () => {
    setState((prev) => ({
      ...prev,
      incomingRequest: false,
      requestRejected: true,
    }));
  };

  return {
    ...state,
    sendEndRequest,
    receiveEndRequest,
    acceptEndRequest,
    rejectEndRequest,
  };
}

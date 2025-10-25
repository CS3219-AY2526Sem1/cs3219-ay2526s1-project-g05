import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { toast } from "sonner";
import { MATCHING_API_URL, matchingApi } from "@/lib/matchingApi";
import { useNavigate, useLocation } from "react-router-dom";
import { useUserContext } from "./UserContext";

const MatchingContext = createContext(null);

export const MatchingProvider = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const es = useRef(null);
  const [matchInfo, setMatchInfo] = useState(null);
  const [isInQueue, setIsInQueue] = useState(false);
  const [isConnected, setConnected] = useState(false);
  const { refreshUserData, user } = useUserContext();

  useEffect(() => {
    checkIsInQueueOrMatch();

    return () => {
      closeEventSource();
    };
  }, []);

  useEffect(() => {
    if (!isInQueue) return;

    // Is in queue, we should enforce navigation to matching page
    if (isInQueue === "matching" && location.pathname !== "/matching") {
      navigate("/matching");
    } else if (isInQueue === "matched" && location.pathname !== "/matched") {
      navigate("/matched");
    }
  }, [isInQueue, location]);

  const handleEnterQueue = async (matchingCriteria) => {
    try {
      const response = await matchingApi.enterQueue(matchingCriteria);
      startStatusSubscriber();
      const { matchDetails } = response;
      if (matchDetails) {
        // A match was already found, switch to matched page directly
        setMatchInfo(matchDetails);
        setIsInQueue("matched");
        navigate("/matched");
        return;
      }
      setIsInQueue("matching");
      navigate("/matching");
    } catch (e) {
      toast.error("Failed to enter queue:", e.message);
    }
  };

  const closeEventSource = () => {
    if (!es.current) return;

    setIsInQueue(false);
    es.current.close();
    es.current.removeEventListener("connected", handleConnected);
    es.current.removeEventListener("matchFound", handleMatchFound);
    es.current.removeEventListener("matchCancelled", handleMatchCancelled);
    es.current.removeEventListener("matchFinalized", handleMatchFinalized);
    es.current = null;
    setConnected(false);
  };

  const checkIsInQueueOrMatch = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || !user) return;

    try {
      const isInQueue = await matchingApi.checkIsInQueueOrMatch();
      if (isInQueue.inQueue || isInQueue.inMatch) {
        startStatusSubscriber();

        if (isInQueue.inMatch) {
          navigate("/matched");
          setIsInQueue("matched");
        } else {
          navigate("/matching");
          setIsInQueue("matching");
        }
      }
    } catch (e) {
      toast.error("Failed to check if in queue", e);
    }
  }, []);

  const cancelMatching = useCallback(async () => {
    try {
      closeEventSource();
      await matchingApi.cancelQueue();
      navigate("/matchmaking");
      toast.success("Successfully exited the queue.");
      return true;
    } catch (e) {
      toast.error("Failed to cancel queue:", e.message);
      return false;
    }
  });

  const confirmMatch = useCallback(async () => {
    try {
      const response = await matchingApi.confirmMatch();
      return response;
    } catch (e) {
      toast.error("Failed to confirm match:", e.message);
    }
  });

  // ============= EventSource Handlers =============
  const handleConnected = () => {
    setConnected(true);
  };
  const handleMatchFound = (data) => {
    const parsedData = JSON.parse(data.data);
    setMatchInfo(parsedData);
    navigate("/matched");
    setIsInQueue("matched");
  };
  const handleMatchCancelled = () => {
    // When we have a pending match but the partner cancels
    toast.error("Your coding partner has exited the match.");
    closeEventSource();
    navigate("/matchmaking");
  };
  const handleMatchFinalized = async () => {
    // Let's refresh the user data to get the updated session info
    closeEventSource();
    await refreshUserData();
    navigate("/session");
  };

  const startStatusSubscriber = useCallback(async () => {
    if (es.current) {
      return;
    }

    const newSource = new EventSource(
      `${MATCHING_API_URL}/status/?token=${localStorage.getItem("token")}`,
    );
    es.current = newSource;

    newSource.addEventListener("connected", handleConnected);
    newSource.addEventListener("matchFound", handleMatchFound);
    newSource.addEventListener("matchCancelled", handleMatchCancelled);
    newSource.addEventListener("matchFinalized", handleMatchFinalized);

    newSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      console.log(error);
      es.current.close();
      es.current = null;
      toast.error("Lost connection to matchmaking server.");
    };
  }, []);

  return (
    <MatchingContext.Provider
      value={{
        isConnected,
        matchInfo,
        isInQueue,
        cancelMatching,
        startStatusSubscriber,
        handleEnterQueue,
        confirmMatch,
      }}
    >
      {children}
    </MatchingContext.Provider>
  );
};

export const useMatching = () => useContext(MatchingContext);

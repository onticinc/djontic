"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type MixPlaybackContextValue = {
  activeMixId: string | null;
  requestPlay: (mixId: string) => void;
  clearIfActive: (mixId: string) => void;
};

const MixPlaybackContext = createContext<MixPlaybackContextValue | null>(null);

export function MixPlaybackProvider({ children }: { children: ReactNode }) {
  const [activeMixId, setActiveMixId] = useState<string | null>(null);

  const requestPlay = useCallback((mixId: string) => {
    setActiveMixId(mixId);
  }, []);

  const clearIfActive = useCallback((mixId: string) => {
    setActiveMixId((current) => (current === mixId ? null : current));
  }, []);

  const value = useMemo(
    () => ({ activeMixId, requestPlay, clearIfActive }),
    [activeMixId, requestPlay, clearIfActive],
  );

  return (
    <MixPlaybackContext.Provider value={value}>
      {children}
    </MixPlaybackContext.Provider>
  );
}

export function useMixPlayback() {
  const context = useContext(MixPlaybackContext);
  if (!context) {
    throw new Error("useMixPlayback must be used within MixPlaybackProvider");
  }
  return context;
}

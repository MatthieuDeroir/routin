"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { RoutinStore } from "./engine";
import type { Snapshot } from "./types";

const StoreContext = createContext<RoutinStore | null>(null);

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore doit être utilisé dans <StoreProvider>");

  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );

  return {
    ...state,
    saveMoments: store.saveMoments.bind(store),
    upsertRoutine: store.upsertRoutine.bind(store),
    removeRoutine: store.removeRoutine.bind(store),
    upsertTask: store.upsertTask.bind(store),
    removeTask: store.removeTask.bind(store),
    setCompletion: store.setCompletion.bind(store),
    flush: store.flush.bind(store),
  };
}

export function StoreProvider({
  userId,
  initial,
  children,
}: {
  userId: string;
  initial: Snapshot;
  children: React.ReactNode;
}) {
  const [store] = useState(() => new RoutinStore(initial));

  useEffect(() => {
    void store.bootstrap(userId, initial);
    // `initial` est volontairement absent : l'amorçage n'a lieu qu'une fois,
    // les données serveur suivantes passent par mergeServer ci-dessous.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, userId]);

  useEffect(() => {
    store.mergeServer(initial);
  }, [store, initial]);

  // Le retour de connexion et le retour à l'écran sont les deux moments où une
  // file en attente a le plus de chances de pouvoir enfin partir.
  useEffect(() => {
    const flush = () => void store.flush();
    const onVisible = () => {
      if (document.visibilityState === "visible") flush();
    };

    window.addEventListener("online", flush);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("online", flush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [store]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

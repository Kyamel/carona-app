import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { observeAuthState, refreshCurrentUser, type User } from "@data";

type Session = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<User | null>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  // reload() mutates the User in place instead of handing back a new instance,
  // so storing it bare would never change identity and emailVerified flipping
  // would not re-render anything. The wrapper is what React sees change.
  const [snapshot, setSnapshot] = useState<{ user: User | null }>({
    user: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      observeAuthState((user) => {
        setSnapshot({ user });
        setLoading(false);
      }),
    [],
  );

  const value = useMemo<Session>(
    () => ({
      user: snapshot.user,
      loading,
      refresh: async () => {
        const refreshed = await refreshCurrentUser();
        setSnapshot({ user: refreshed });
        return refreshed;
      },
    }),
    [snapshot, loading],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession() {
  const session = use(SessionContext);
  if (!session) {
    throw new Error("useSession precisa estar dentro de um <SessionProvider>.");
  }
  return session;
}

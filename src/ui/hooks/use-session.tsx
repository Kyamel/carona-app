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
  emailVerified: boolean;
  loading: boolean;
  refresh: () => Promise<User | null>;
};

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: PropsWithChildren) {
  // reload() mutates the User in place. Keep emailVerified as an immutable
  // snapshot so the route guards always see a value whose identity changed.
  const [snapshot, setSnapshot] = useState<{
    user: User | null;
    emailVerified: boolean;
  }>({
    user: null,
    emailVerified: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(
    () =>
      observeAuthState((user) => {
        setSnapshot({ user, emailVerified: user?.emailVerified ?? false });
        setLoading(false);
      }),
    [],
  );

  const value = useMemo<Session>(
    () => ({
      user: snapshot.user,
      emailVerified: snapshot.emailVerified,
      loading,
      refresh: async () => {
        const refreshed = await refreshCurrentUser();
        setSnapshot({
          user: refreshed,
          emailVerified: refreshed?.emailVerified ?? false,
        });
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

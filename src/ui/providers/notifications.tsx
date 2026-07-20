import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Animated, Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRideSession } from "@ui/providers/ride-session";

const NOTIFICATION_SOUND = require("@ui/assets/sounds/notification.wav");

type AppNotice = { title: string; message: string };

type NotificationApi = {
  notify: (notice: AppNotice) => void;
};

const NotificationContext = createContext<NotificationApi | null>(null);

export function NotificationProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const player = useAudioPlayer(NOTIFICATION_SOUND);
  const [notice, setNotice] = useState<AppNotice | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback(
    (next: AppNotice) => {
      setNotice(next);

      try {
        player.seekTo(0);
        player.play();
      } catch {
        // Áudio é um extra; nunca deve quebrar o fluxo.
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => undefined,
      );

      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();

      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => setNotice(null));
      }, 4000);
    },
    [opacity, player],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  return (
    <NotificationContext value={{ notify }}>
      <RideNotificationBridge />
      {children}
      {notice ? (
        <Animated.View
          style={[styles.toast, { top: insets.top + 60, opacity }]}
          pointerEvents="box-none"
        >
          <Pressable onPress={() => setNotice(null)}>
            <Text style={styles.title}>{notice.title}</Text>
            <Text style={styles.message}>{notice.message}</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </NotificationContext>
  );
}

export function useNotifications() {
  const api = use(NotificationContext);
  if (!api) {
    throw new Error(
      "useNotifications precisa estar dentro de um <NotificationProvider>.",
    );
  }
  return api;
}

// Observa a sessão de carona e converte mudanças relevantes em notificações.
// Fica dentro do provider para ter acesso ao notify().
function RideNotificationBridge() {
  const { notify } = useNotifications();
  const { role, ride, myJoinRequest, passengers, flagAcceptance } =
    useRideSession();

  const prevPassengerCount = useRef(passengers.length);
  const prevRequestStatus = useRef(myJoinRequest?.status ?? null);
  const prevRideStatus = useRef(ride?.status ?? null);

  // Motorista: novo passageiro entrou no carro.
  useEffect(() => {
    if (role === "driver" && passengers.length > prevPassengerCount.current) {
      notify({
        title: "Novo passageiro",
        message: "Um passageiro entrou na sua carona.",
      });
      flagAcceptance();
    }
    prevPassengerCount.current = passengers.length;
  }, [role, passengers.length, notify, flagAcceptance]);

  // Passageiro: pedido aceito ou recusado.
  useEffect(() => {
    const status = myJoinRequest?.status ?? null;
    if (status !== prevRequestStatus.current) {
      if (status === "accepted") {
        notify({
          title: "Carona confirmada!",
          message: "O motorista aceitou seu pedido.",
        });
        flagAcceptance();
      } else if (status === "declined") {
        notify({
          title: "Pedido recusado",
          message: "O motorista não pôde aceitar sua carona.",
        });
      }
      prevRequestStatus.current = status;
    }
  }, [myJoinRequest?.status, notify, flagAcceptance]);

  // Todos: início e cancelamento da carona.
  useEffect(() => {
    const status = ride?.status ?? null;
    if (status !== prevRideStatus.current) {
      if (status === "inProgress") {
        notify({ title: "Carona iniciada", message: "Boa viagem!" });
      } else if (status === "canceled") {
        notify({
          title: "Carona cancelada",
          message: "Esta carona foi cancelada.",
        });
      }
      prevRideStatus.current = status;
    }
  }, [ride?.status, notify]);

  return null;
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: "#1c1c1e",
    borderRadius: 12,
    padding: 14,
    zIndex: 100,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  title: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 2,
  },
  message: {
    color: "#e0e0e0",
    fontSize: 14,
  },
});

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { useRideSession, type RidePhase } from "@ui/providers/ride-session";

const LABELS: Record<RidePhase, string> = {
  idle: "",
  seeking: "Pedido de carona publicado",
  requesting: "Procurando carona",
  waiting: "Carona confirmada — aguardando início",
  offering: "Oferecendo carona",
  full: "Carro cheio — aguardando início",
  inProgress: "Carona em andamento",
};

function formatElapsed(sinceMs: number): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - sinceMs) / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

// Barra fixa no topo, visível em todas as abas enquanto há carona ativa.
export function TimerBar() {
  const router = useRouter();
  const { phase, since } = useRideSession();

  // Número (não Date): estável entre renders, então o efeito só reinicia
  // quando o instante de referência realmente muda.
  const sinceMs = since ? since.getTime() : null;
  const [elapsed, setElapsed] = useState("00:00");

  const active = phase !== "idle" && sinceMs != null;

  useEffect(() => {
    if (!active || sinceMs == null) {
      return;
    }
    const update = () => setElapsed(formatElapsed(sinceMs));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [active, sinceMs]);

  if (!active) {
    return null;
  }

  // Contador de espera só faz sentido enquanto ainda não iniciou/aceitou.
  const showTimer =
    phase === "requesting" || phase === "offering" || phase === "seeking";

  return (
    <Pressable
      style={styles.bar}
      onPress={() => router.navigate("/(tabs)/ride")}
    >
      <Text style={styles.label}>{LABELS[phase]}</Text>
      {showTimer ? <Text style={styles.timer}>{elapsed}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#C8102E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    flexShrink: 1,
  },
  timer: {
    color: "#fff",
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    fontSize: 16,
  },
});

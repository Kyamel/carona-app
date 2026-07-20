import { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import { observeMyRideHistory, type Ride } from "@carona/backend";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSession } from "@/hooks/use-session";

const STATUS_LABEL: Record<Ride["status"], string> = {
  open: "Aberta",
  full: "Cheia",
  inProgress: "Em andamento",
  completed: "Concluída",
  canceled: "Cancelada",
};

function formatDateTime(date: Date | null): string {
  if (!date) {
    return "—";
  }
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryTab() {
  const { user } = useSession();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }
    return observeMyRideHistory(user.uid, setRides);
  }, [user]);

  if (rides.length === 0) {
    return (
      <ThemedView style={styles.empty}>
        <ThemedText type="subtitle">Sem caronas ainda</ThemedText>
        <ThemedText style={{ textAlign: "center" }}>
          Suas caronas aparecerão aqui.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={rides}
        keyExtractor={(ride) => ride.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const isDriver = item.driverId === user?.uid;
          return (
            <View style={[styles.card, { borderColor: colors.icon }]}>
              <View style={styles.cardHeader}>
                <ThemedText type="defaultSemiBold">
                  {item.origin.label} → {item.destination.label}
                </ThemedText>
                <ThemedText style={{ color: colors.tint, fontWeight: "700" }}>
                  {STATUS_LABEL[item.status]}
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
                {isDriver ? "Motorista" : "Passageiro"}
              </ThemedText>
              <ThemedText style={{ color: colors.icon, fontSize: 13 }}>
                Início: {formatDateTime(item.startedAt)} · Fim:{" "}
                {formatDateTime(item.endedAt)}
              </ThemedText>
            </View>
          );
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
  },
  list: { padding: 16, gap: 12 },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
});

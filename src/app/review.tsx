import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    createReview,
    getRide,
    getRidePassengers,
    reportNoShow,
    type Ride,
    type RidePassenger,
} from "@data";

import { Colors } from "@ui/constants/theme";
import { StarRating } from "@ui/components/star-rating";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

type Ratee = { id: string; name: string };
type ReviewDraft = { rating: number; text: string };

export default function ReviewScreen() {
  const router = useRouter();
  const { user } = useSession();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const { rideId } = useLocalSearchParams<{ rideId: string }>();

  const [ride, setRide] = useState<Ride | null>(null);
  const [ratees, setRatees] = useState<Ratee[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Participantes marcados como "não compareceu" (motorista marca passageiros;
  // passageiro marca o motorista). Vira relato em vez de avaliação.
  const [noShow, setNoShow] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!rideId || !user) {
      return;
    }

    (async () => {
      const [loadedRide, passengers] = await Promise.all([
        getRide(rideId),
        getRidePassengers(rideId),
      ]);

      if (!loadedRide) {
        setLoading(false);
        return;
      }

      // Avalio todos os participantes da carona, menos eu mesmo.
      const people: Ratee[] = [];
      if (loadedRide.driverId !== user.uid) {
        people.push({ id: loadedRide.driverId, name: loadedRide.driverName });
      }
      passengers
        .filter(
          (p: RidePassenger) => p.status === "accepted" && p.uid !== user.uid,
        )
        .forEach((p) => people.push({ id: p.uid, name: p.name }));

      setRide(loadedRide);
      setRatees(people);
      setDrafts(
        Object.fromEntries(people.map((p) => [p.id, { rating: 5, text: "" }])),
      );
      setLoading(false);
    })();
  }, [rideId, user]);

  function setDraft(id: string, patch: Partial<ReviewDraft>) {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], ...patch },
    }));
  }

  async function handleSubmit() {
    if (!ride || !user) {
      return;
    }
    setSubmitting(true);
    try {
      await Promise.all(
        ratees.map((ratee) =>
          // Passageiro marcado como ausente vira um relato, não uma avaliação.
          noShow[ratee.id]
            ? reportNoShow(ride.id, user.uid, ratee.id)
            : createReview({
                rideId: ride.id,
                raterId: user.uid,
                raterName: user.displayName ?? "Usuário",
                rateeId: ratee.id,
                rating: drafts[ratee.id].rating,
                text: drafts[ratee.id].text,
              }),
        ),
      );
      router.back();
    } catch (cause) {
      Alert.alert(
        "Não foi possível enviar",
        cause instanceof Error ? cause.message : "Tente novamente.",
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.heading, { color: colors.text }]}>
        Como foi a carona?
      </Text>
      <Text style={{ color: colors.icon }}>
        Dê sua nota. Se a carona não aconteceu, marque quem não compareceu.
      </Text>

      {ride?.driverPixKey && ride.driverId !== user?.uid ? (
        <View style={[styles.pix, { borderColor: colors.tint }]}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>
            Gorjeta (opcional) via PIX
          </Text>
          <Text selectable style={{ color: colors.tint, fontSize: 16 }}>
            {ride.driverPixKey}
          </Text>
        </View>
      ) : null}

      {ratees.length === 0 ? (
        <Text style={{ color: colors.icon }}>
          Não há ninguém para avaliar nesta carona.
        </Text>
      ) : (
        ratees.map((ratee) => {
          const flagged = !!noShow[ratee.id];
          const isRateeDriver = ratee.id === ride?.driverId;
          const iAmDriver = ride?.driverId === user?.uid;
          // "Não compareceu" só faz sentido (e as rules só aceitam) na direção
          // motorista↔passageiro; entre co-caronistas não há relato de ausência.
          const canFlag = iAmDriver || isRateeDriver;
          return (
            <View key={ratee.id} style={styles.rateeCard}>
              <Text style={[styles.name, { color: colors.text }]}>
                {ratee.name}
              </Text>

              {/* O motorista marca um passageiro; o passageiro marca o
                  motorista. Vira um relato no lugar da avaliação. */}
              {canFlag ? (
                <Pressable
                  onPress={() =>
                    setNoShow((current) => ({
                      ...current,
                      [ratee.id]: !current[ratee.id],
                    }))
                  }
                  style={[
                    styles.flag,
                    flagged
                      ? { backgroundColor: "#C8102E", borderColor: "#C8102E" }
                      : { borderColor: "#C8102E" },
                  ]}
                >
                  <Text
                    style={{
                      color: flagged ? "#fff" : "#C8102E",
                      fontWeight: "600",
                      fontSize: 13,
                    }}
                  >
                    {flagged
                      ? "✓ Não compareceu"
                      : isRateeDriver
                        ? "Motorista não apareceu"
                        : "Não compareceu"}
                  </Text>
                </Pressable>
              ) : null}

              {!flagged ? (
                <>
                  <StarRating
                    value={drafts[ratee.id]?.rating ?? 5}
                    onChange={(rating) => setDraft(ratee.id, { rating })}
                  />
                  <TextInput
                    style={[
                      styles.input,
                      { color: colors.text, borderColor: colors.icon },
                    ]}
                    placeholder="Comentário (opcional)"
                    placeholderTextColor={colors.icon}
                    value={drafts[ratee.id]?.text ?? ""}
                    onChangeText={(text) => setDraft(ratee.id, { text })}
                    multiline
                  />
                </>
              ) : null}
            </View>
          );
        })
      )}

      <Pressable
        style={[styles.submit, { backgroundColor: colors.tint }]}
        disabled={submitting}
        onPress={ratees.length === 0 ? () => router.back() : handleSubmit}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>
            {ratees.length === 0 ? "Fechar" : "Enviar"}
          </Text>
        )}
      </Pressable>

      {ratees.length > 0 ? (
        <Pressable onPress={() => router.back()} style={styles.skip}>
          <Text style={{ color: colors.icon }}>Pular</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: 20, gap: 16 },
  heading: { fontSize: 20, fontWeight: "700" },
  pix: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 4,
  },
  rateeCard: { gap: 10 },
  name: { fontSize: 16, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    minHeight: 60,
    textAlignVertical: "top",
  },
  submit: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  submitText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  skip: { alignItems: "center", paddingVertical: 8 },
  flag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

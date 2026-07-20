import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    createBookmark,
    deleteBookmark,
    getCompletedRideCount,
    getReputation,
    logout,
    observeBookmarks,
    observeMyProfile,
    updatePixKey,
    type Bookmark,
    type NamedLocation,
    type Reputation,
} from "@data";

import { Colors } from "@ui/constants/theme";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { LocationPicker } from "@ui/components/location-picker";
import { ThemedText } from "@ui/components/themed-text";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

export default function ProfileTab() {
  const { user } = useSession();
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [completedRides, setCompletedRides] = useState<number | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pixKey, setPixKey] = useState("");
  const [newBookmark, setNewBookmark] = useState<NamedLocation | null>(null);
  const [savingPix, setSavingPix] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    const uid = user.uid;

    const unsubProfile = observeMyProfile(uid, (profile) => {
      setPixKey(profile?.pixKey ?? "");
    });
    const unsubBookmarks = observeBookmarks(uid, setBookmarks);

    getReputation(uid)
      .then(setReputation)
      .catch(() => undefined);
    getCompletedRideCount(uid)
      .then(setCompletedRides)
      .catch(() => undefined);

    return () => {
      unsubProfile();
      unsubBookmarks();
    };
  }, [user]);

  async function savePix() {
    if (!user) {
      return;
    }
    setSavingPix(true);
    try {
      await updatePixKey(user.uid, pixKey);
      Alert.alert("Pronto", "Chave PIX atualizada.");
    } catch {
      Alert.alert("Ops", "Não foi possível salvar a chave PIX.");
    } finally {
      setSavingPix(false);
    }
  }

  async function addBookmark() {
    if (!user || !newBookmark) {
      return;
    }
    try {
      await createBookmark(user.uid, newBookmark);
      setNewBookmark(null);
    } catch {
      Alert.alert("Ops", "Não foi possível salvar o local.");
    }
  }

  function confirmRemoveBookmark(bookmark: Bookmark) {
    Alert.alert(
      "Remover local salvo",
      `Remover "${bookmark.label}" dos seus locais salvos?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            if (!user) {
              return;
            }
            try {
              await deleteBookmark(user.uid, bookmark.id);
            } catch {
              Alert.alert("Ops", "Não foi possível remover o local.");
            }
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <ThemedText type="title">{user?.displayName ?? "Perfil"}</ThemedText>
      <ThemedText style={{ color: colors.icon }}>{user?.email}</ThemedText>

      <View style={styles.statsRow}>
        <Stat
          label="Avaliação"
          value={
            reputation?.averageRating != null
              ? reputation.averageRating.toFixed(1)
              : "—"
          }
          colors={colors}
        />
        <Stat
          label="Avaliações"
          value={String(reputation?.reviewCount ?? 0)}
          colors={colors}
        />
        <Stat
          label="Caronas"
          value={completedRides != null ? String(completedRides) : "—"}
          colors={colors}
        />
        <Stat
          label="Cancelamentos"
          value={String(reputation?.cancellationCount ?? 0)}
          colors={colors}
        />
        <Stat
          label="Não compareceu"
          value={String(reputation?.noShowCount ?? 0)}
          colors={colors}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Chave PIX para gorjetas
      </Text>
      <Text style={{ color: colors.icon, fontSize: 13 }}>
        Compartilhada com seus passageiros só ao final da carona.
      </Text>
      <View style={styles.pixRow}>
        <TextInput
          style={[
            styles.input,
            { color: colors.text, borderColor: colors.icon },
          ]}
          placeholder="Sua chave PIX"
          placeholderTextColor={colors.icon}
          value={pixKey}
          onChangeText={setPixKey}
          autoCapitalize="none"
        />
        <Pressable
          style={[styles.saveButton, { backgroundColor: colors.tint }]}
          onPress={savePix}
          disabled={savingPix}
        >
          <Text style={styles.saveText}>Salvar</Text>
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Locais salvos
      </Text>
      {bookmarks.map((bookmark) => (
        <View key={bookmark.id} style={styles.bookmarkRow}>
          <IconSymbol name="star.fill" size={18} color={colors.tint} />
          <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>
            {bookmark.label}
          </Text>
          <Pressable
            onPress={() => confirmRemoveBookmark(bookmark)}
            hitSlop={8}
          >
            <IconSymbol name="xmark" size={18} color={colors.icon} />
          </Pressable>
        </View>
      ))}

      <LocationPicker
        label="Adicionar local"
        value={newBookmark}
        onChange={setNewBookmark}
      />
      {newBookmark ? (
        <Pressable
          style={[
            styles.saveButton,
            { backgroundColor: colors.tint, alignSelf: "flex-start" },
          ]}
          onPress={addBookmark}
        >
          <Text style={styles.saveText}>Salvar local</Text>
        </Pressable>
      ) : null}

      <Pressable style={styles.logout} onPress={() => logout()}>
        <Text style={styles.logoutText}>Sair</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: (typeof Colors)["light"];
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.tint }]}>{value}</Text>
      <Text style={{ color: colors.icon, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 12,
  },
  stat: { alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontWeight: "700" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginTop: 12 },
  pixRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  saveButton: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  saveText: { color: "#fff", fontWeight: "700" },
  bookmarkRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logout: {
    borderWidth: 1,
    borderColor: "#C8102E",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 24,
  },
  logoutText: { color: "#C8102E", fontWeight: "700", fontSize: 16 },
});

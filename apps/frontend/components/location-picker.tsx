import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import type { NamedLocation } from "@carona/backend";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getCurrentNamedLocation } from "@/lib/location";
import {
  autocompletePlaces,
  getPlaceLocation,
  type PlaceSuggestion,
} from "@/lib/google-places";

type LocationPickerProps = {
  label: string;
  value: NamedLocation | null;
  onChange: (location: NamedLocation | null) => void;
  bookmarks?: NamedLocation[];
};

// Campo de busca de endereço com autocomplete Places, opção de usar a posição
// atual e sugestões de bookmarks. Reusado no modal de oferta e no de pedido.
export function LocationPicker({
  label,
  value,
  onChange,
  bookmarks = [],
}: LocationPickerProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        setSuggestions(await autocompletePlaces(query));
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounce.current) {
        clearTimeout(debounce.current);
      }
    };
  }, [query]);

  async function useCurrentPosition() {
    setLoading(true);
    try {
      onChange(await getCurrentNamedLocation());
      setQuery("");
      setSuggestions([]);
    } catch {
      // Ignora; o usuário pode digitar o endereço manualmente.
    } finally {
      setLoading(false);
    }
  }

  async function pickSuggestion(suggestion: PlaceSuggestion) {
    setLoading(true);
    try {
      onChange(await getPlaceLocation(suggestion));
      setQuery("");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  if (value) {
    return (
      <View style={styles.container}>
        <Text style={[styles.label, { color: colors.icon }]}>{label}</Text>
        <View style={[styles.selected, { borderColor: colors.tint }]}>
          <IconSymbol name="mappin" size={20} color={colors.tint} />
          <View style={styles.selectedText}>
            <Text style={{ color: colors.text, fontSize: 16 }} numberOfLines={1}>
              {value.label}
            </Text>
            {value.address ? (
              <Text style={{ color: colors.icon, fontSize: 13 }} numberOfLines={1}>
                {value.address}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={() => onChange(null)} hitSlop={8}>
            <IconSymbol name="xmark" size={18} color={colors.icon} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.icon }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
        placeholder="Digite um endereço"
        placeholderTextColor={colors.icon}
        value={query}
        onChangeText={setQuery}
      />

      <Pressable style={styles.row} onPress={useCurrentPosition}>
        <IconSymbol name="location.fill" size={18} color={colors.tint} />
        <Text style={[styles.rowText, { color: colors.text }]}>
          Usar minha localização atual
        </Text>
      </Pressable>

      {bookmarks.map((bookmark) => (
        <Pressable
          key={`${bookmark.label}-${bookmark.geoHash}`}
          style={styles.row}
          onPress={() => onChange(bookmark)}
        >
          <IconSymbol name="star.fill" size={18} color={colors.tint} />
          <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
            {bookmark.label}
          </Text>
        </Pressable>
      ))}

      {loading ? <ActivityIndicator color={colors.tint} /> : null}

      {suggestions.map((suggestion) => (
        <Pressable
          key={suggestion.placeId}
          style={styles.row}
          onPress={() => pickSuggestion(suggestion)}
        >
          <IconSymbol name="mappin" size={18} color={colors.icon} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: colors.text }]} numberOfLines={1}>
              {suggestion.primaryText}
            </Text>
            {suggestion.secondaryText ? (
              <Text style={[styles.subtitle, { color: colors.icon }]} numberOfLines={1}>
                {suggestion.secondaryText}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  label: { fontSize: 13, fontWeight: "600", textTransform: "uppercase" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  selected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  selectedText: { flex: 1, fontSize: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  rowText: { flex: 1, fontSize: 15 },
  subtitle: { fontSize: 13 },
});

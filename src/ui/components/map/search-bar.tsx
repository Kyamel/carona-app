import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { ICEA_LOCATION, type NamedLocation } from "@data";

import { Colors } from "@ui/constants/theme";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import {
  autocompletePlaces,
  getPlaceLocation,
  type PlaceSuggestion,
} from "@ui/lib/google-places";

type SearchBarProps = {
  destination: NamedLocation | null;
  onSelectDestination: (destination: NamedLocation | null) => void;
  // Preenchido na fase de bookmarks; aparecem como sugestões fixas.
  bookmarks?: NamedLocation[];
  // Cor de destaque conforme o modo do mapa (pedir/oferecer). Cai no tint do
  // tema quando não informado.
  tintColor?: string;
  placeholder?: string;
  // Aberto/fechado é controlado pelo pai para que tocar no modo já selecionado
  // possa reabrir a busca.
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
};

export function SearchBar({
  destination,
  onSelectDestination,
  bookmarks = [],
  tintColor,
  placeholder = "Para onde você vai?",
  expanded,
  onExpandedChange,
}: SearchBarProps) {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const accent = tintColor ?? colors.tint;

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) {
      clearTimeout(debounce.current);
    }

    if (!expanded || query.trim().length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounce.current = setTimeout(async () => {
      try {
        setSuggestions(await autocompletePlaces(query));
        setError(null);
      } catch {
        setError("Não foi possível buscar endereços.");
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounce.current) {
        clearTimeout(debounce.current);
      }
    };
  }, [expanded, query]);

  function close() {
    onExpandedChange(false);
    setQuery("");
    setSuggestions([]);
    setError(null);
  }

  function select(location: NamedLocation) {
    onSelectDestination(location);
    close();
  }

  async function selectSuggestion(suggestion: PlaceSuggestion) {
    setLoading(true);
    try {
      select(await getPlaceLocation(suggestion));
    } catch {
      setError("Não foi possível carregar o endereço selecionado.");
      setLoading(false);
    }
  }

  const filteredBookmarks = bookmarks.filter((bookmark) =>
    bookmark.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <View style={styles.container} pointerEvents="box-none">
      {expanded ? (
        <>
          {/* Toque fora do card fecha a busca (antes só o X fechava). */}
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={[styles.card, { backgroundColor: colors.background }]}>
          <View style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder={placeholder}
              placeholderTextColor={colors.icon}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            <Pressable onPress={close} hitSlop={8}>
              <IconSymbol name="xmark" size={22} color={colors.icon} />
            </Pressable>
          </View>

          <Pressable style={styles.row} onPress={() => select(ICEA_LOCATION)}>
            <IconSymbol
              name="graduationcap.fill"
              size={22}
              color={colors.tint}
            />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>
                {ICEA_LOCATION.label}
              </Text>
              <Text style={[styles.rowSubtitle, { color: colors.icon }]}>
                {ICEA_LOCATION.address}
              </Text>
            </View>
          </Pressable>

          {filteredBookmarks.map((bookmark) => (
            <Pressable
              key={`${bookmark.label}-${bookmark.geoHash}`}
              style={styles.row}
              onPress={() => select(bookmark)}
            >
              <IconSymbol name="star.fill" size={22} color={colors.tint} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {bookmark.label}
                </Text>
                {bookmark.address ? (
                  <Text style={[styles.rowSubtitle, { color: colors.icon }]}>
                    {bookmark.address}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}

          {loading ? (
            <ActivityIndicator style={styles.loading} color={colors.tint} />
          ) : null}
          {error ? (
            <Text style={[styles.rowSubtitle, styles.error]}>{error}</Text>
          ) : null}

          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              style={styles.row}
              onPress={() => selectSuggestion(suggestion)}
            >
              <IconSymbol name="mappin" size={22} color={colors.icon} />
              <View style={styles.rowText}>
                <Text style={[styles.rowTitle, { color: colors.text }]}>
                  {suggestion.primaryText}
                </Text>
                {suggestion.secondaryText ? (
                  <Text style={[styles.rowSubtitle, { color: colors.icon }]}>
                    {suggestion.secondaryText}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
          </View>
        </>
      ) : (
        <Pressable
          style={[
            styles.pill,
            { backgroundColor: colors.background, borderColor: accent },
          ]}
          onPress={() => onExpandedChange(true)}
        >
          <IconSymbol name="magnifyingglass" size={20} color={accent} />
          <Text
            style={[
              styles.pillText,
              { color: destination ? colors.text : colors.icon },
            ]}
            numberOfLines={1}
          >
            {destination ? destination.label : placeholder}
          </Text>
          {destination ? (
            <Pressable onPress={() => onSelectDestination(null)} hitSlop={8}>
              <IconSymbol name="xmark" size={18} color={colors.icon} />
            </Pressable>
          ) : null}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  // Cobre a tela toda (estende bem além do container posicionado) para captar
  // toques fora do card e fechar a busca.
  backdrop: {
    position: "absolute",
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pillText: {
    flex: 1,
    fontSize: 16,
  },
  card: {
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 13,
  },
  loading: {
    paddingVertical: 8,
  },
  error: {
    color: "#C8102E",
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
});

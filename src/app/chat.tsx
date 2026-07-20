import { useEffect, useRef, useState } from "react";
import {
  Stack,
  useLocalSearchParams,
} from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  observeChatMessages,
  sendChatMessage,
  type ChatMessage,
} from "@data";

import { Colors } from "@ui/constants/theme";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useSession } from "@ui/hooks/use-session";

export default function ChatScreen() {
  const scheme = useColorScheme() ?? "light";
  const colors = Colors[scheme];
  const insets = useSafeAreaInsets();
  // Altura real do header do modal: é o offset que a KeyboardAvoidingView
  // precisa para a barra de input subir junto com o teclado.
  const headerHeight = useHeaderHeight();
  const { user } = useSession();
  const { rideId, threadId, title } = useLocalSearchParams<{
    rideId: string;
    threadId: string;
    title?: string;
  }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const theirBubble = scheme === "dark" ? "#2C2C2E" : "#E9E9EB";

  useEffect(() => {
    if (!rideId || !threadId) {
      return;
    }
    return observeChatMessages(rideId, threadId, setMessages);
  }, [rideId, threadId]);

  async function handleSend() {
    const text = draft.trim();
    if (!text || !user || !rideId || !threadId || sending) {
      return;
    }
    setSending(true);
    setDraft("");
    try {
      await sendChatMessage(
        rideId,
        threadId,
        user.uid,
        user.displayName ?? "Usuário",
        text,
      );
    } catch {
      // Mensagem não enviada: devolve o rascunho pro campo.
      setDraft(text);
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: title ?? "Conversa" }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={headerHeight}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.icon }]}>
              Nenhuma mensagem ainda. Combine o ponto de encontro por aqui.
            </Text>
          }
          renderItem={({ item }) => {
            const mine = item.senderId === user?.uid;
            return (
              <View
                style={[
                  styles.bubble,
                  mine
                    ? [styles.mine, { backgroundColor: colors.tint }]
                    : [styles.theirs, { backgroundColor: theirBubble }],
                ]}
              >
                {!mine ? (
                  <Text style={[styles.sender, { color: colors.icon }]}>
                    {item.senderName}
                  </Text>
                ) : null}
                <Text style={{ color: mine ? "#fff" : colors.text }}>
                  {item.text}
                </Text>
              </View>
            );
          }}
        />

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: insets.bottom + 8,
              borderTopColor: colors.icon,
              backgroundColor: colors.background,
            },
          ]}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Mensagem"
            placeholderTextColor={colors.icon}
            style={[styles.input, { color: colors.text, borderColor: colors.icon }]}
            multiline
            maxLength={1000}
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || draft.trim().length === 0}
            style={[
              styles.send,
              {
                backgroundColor: colors.tint,
                opacity: sending || draft.trim().length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <IconSymbol name="paperplane.fill" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { textAlign: "center", marginTop: 40 },
  bubble: {
    maxWidth: "80%",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  mine: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  theirs: { alignSelf: "flex-start", borderBottomLeftRadius: 4 },
  sender: { fontSize: 12, fontWeight: "700", marginBottom: 2 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    maxHeight: 120,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

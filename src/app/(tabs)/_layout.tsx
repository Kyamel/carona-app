import { Tabs } from "expo-router";
import { View } from "react-native";

import { Colors } from "@ui/constants/theme";
import { HapticTab } from "@ui/components/haptic-tab";
import { IconSymbol } from "@ui/components/icons/icon-symbol";
import { useColorScheme } from "@ui/hooks/use-color-scheme";
import { useRideSession } from "@ui/providers/ride-session";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { acceptanceBadge } = useRideSession();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mapa",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="map.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ride"
        options={{
          title: "Carona",
          tabBarIcon: ({ color }) => (
            <View>
              <IconSymbol size={28} name="car.fill" color={color} />
              {acceptanceBadge ? (
                <View
                  style={{
                    position: "absolute",
                    top: -2,
                    right: -6,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "#C8102E",
                    borderWidth: 2,
                    borderColor: Colors[colorScheme ?? "light"].background,
                  }}
                />
              ) : null}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Histórico",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="clock.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

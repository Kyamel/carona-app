import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "carona-app",
  slug: "carona-app",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "caronaapp",
  owner: "mugens",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  extra: {
    eas: {
      projectId: "63180dfc-0a40-4e03-a067-1411b92c46dc",
    },
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "br.ufop.icea.carona",
  },
  android: {
    package: "br.ufop.icea.carona",
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        // Build-time key (Maps SDK for Android), restricted by package + SHA-1.
        // Expo Go uses Expo's own key; this one only applies to dev/production builds.
        apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY,
      },
    },
  },
  web: {
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Este app usa sua localização para mostrar sua posição no mapa e encontrar caronas próximas ao ICEA.",
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;

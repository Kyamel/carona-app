# Ambiente Android nativo do Nix para builds locais do Expo (dev build).
# Uso:
#   cd apps/frontend
#   nix-shell
#   npx expo run:android      # com um device USB ou emulador aberto
#
# A primeira entrada baixa/compila os componentes do SDK pelo Nix (pode ser
# grande). Versões alinhadas ao Expo SDK 54 / React Native 0.81.
{ pkgs ? import <nixpkgs> {
    config.allowUnfree = true;
    config.android_sdk.accept_license = true;
  }
}:

let
  androidComposition = pkgs.androidenv.composeAndroidPackages {
    platformVersions = [ "35" ];
    buildToolsVersions = [ "35.0.0" ];
    includeNDK = true;
    ndkVersions = [ "27.1.12297006" ]; # NDK exigido pelo RN 0.81
    cmakeVersions = [ "3.22.1" ];
    includeEmulator = false;
    includeSystemImages = false;
  };
  androidSdk = androidComposition.androidsdk;
  sdkRoot = "${androidSdk}/libexec/android-sdk";
in
pkgs.mkShell {
  buildInputs = [ androidSdk pkgs.jdk17 ];

  ANDROID_HOME = sdkRoot;
  ANDROID_SDK_ROOT = sdkRoot;
  ANDROID_NDK_ROOT = "${sdkRoot}/ndk/27.1.12297006";
  JAVA_HOME = "${pkgs.jdk17.home}";

  shellHook = ''
    export PATH="${sdkRoot}/platform-tools:$PATH"
    echo "Android SDK: $ANDROID_HOME"
    adb version 2>/dev/null | head -1 || true
  '';
}

// As variáveis EXPO_PUBLIC_* são inlinadas pelo Babel quando este pacote é
// empacotado pelo app Expo; aqui só existe a declaração para o tsc standalone.
declare const process: {
  env: Record<string, string | undefined>;
};

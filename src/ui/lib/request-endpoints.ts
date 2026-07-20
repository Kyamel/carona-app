import type { NamedLocation } from "@data";

// Cache em memória (só nesta sessão) dos pontos EXATOS que a pessoa escolheu ao
// publicar um pedido de carona. O doc público persiste apenas o pino borrado,
// sem rótulo, por privacidade; guardamos o exato aqui só para exibir origem →
// destino na própria aba Carona de quem pede. Some se o app reiniciar — o que é
// aceitável, pois o exato nunca é persistido.

type RequestEndpoints = {
  origin: NamedLocation;
  destination: NamedLocation;
};

let current: RequestEndpoints | null = null;

export function rememberRequestEndpoints(
  origin: NamedLocation,
  destination: NamedLocation,
): void {
  current = { origin, destination };
}

export function recallRequestEndpoints(): RequestEndpoints | null {
  return current;
}

export function clearRequestEndpoints(): void {
  current = null;
}

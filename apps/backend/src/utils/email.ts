// Flag de DEV: quando "true", libera cadastro/uso de contas não-UFOP (útil para
// testar o fluxo completo com duas contas). Precisa estar acompanhada do flag
// equivalente em firestore.rules (devAllowAnyEmail). Deixe desligada em produção.
export const ALLOW_NON_UFOP =
  process.env.EXPO_PUBLIC_ALLOW_NON_UFOP === "true";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isUfopEmail(email: string): boolean {
  return getUfopEmailDomain(email) != null;
}

export function getUfopEmailDomain(email: string): string | null {
  const domain = normalizeEmail(email).split("@").at(1);

  if (domain === "ufop.edu.br" || domain?.endsWith(".ufop.edu.br")) {
    return domain;
  }

  return null;
}

import { AuthScreen } from "@ui/components/auth/auth-screen";
import { VerifyForm } from "@ui/components/auth/verify-form";

export default function VerifyEmailPage() {
  return (
    <AuthScreen
      title="Confirme seu e-mail"
      subtitle="Falta só uma etapa para liberar sua conta e começar a usar o Carona UFOP."
    >
      <VerifyForm />
    </AuthScreen>
  );
}

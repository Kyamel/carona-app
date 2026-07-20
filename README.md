# Carona App — UFOP / ICEA João Monlevade

App de caronas para a comunidade da UFOP (campus ICEA, João Monlevade). O mapa
é a tela principal; alunos pedem e oferecem caronas cujo trajeto passa pelo
ICEA. Cadastro restrito a e-mails `*.ufop.edu.br` com verificação obrigatória.

## Arquitetura (monorepo pnpm)

```
apps/
  frontend/   @carona/frontend — app Expo (React Native, expo-router)
  backend/    @carona/backend  — pacote TypeScript: serviços Firestore,
                                 tipos e regras de negócio (consumido como
                                 código-fonte, sem build; roda no cliente)
firestore.rules            regras de segurança (toda a segurança vive aqui —
firestore.indexes.json     plano Spark, sem Cloud Functions)
firebase.json / .firebaserc
```

O frontend importa a camada de serviços via `@carona/backend`. Não há servidor:
o app fala direto com o Firestore e as `firestore.rules` garantem as regras.

## Pré-requisitos

- Node 22+, pnpm 11
- Projeto Firebase (Auth + Firestore) — já configurado: `carona-app-4e8f6`
- Chaves do Google Maps Platform com billing habilitado:
  - **Maps SDK for Android** (mapa nativo) — restrita por package + SHA-1
  - **Places API (New)** (busca de endereço)

Alvo: **Android/iOS**. A web tem apenas um _stub_ do mapa (o `react-native-maps`
não suporta web) e serve para o build de hosting/CI compilar.

## Configuração

1. Instale as dependências (na raiz):

   ```bash
   pnpm install
   ```

2. Crie `apps/frontend/.env` a partir de `apps/frontend/.env.example` e preencha:
   - `EXPO_PUBLIC_FIREBASE_*` — config web do Firebase
   - `EXPO_PUBLIC_GOOGLE_MAPS_KEY` — chave para Places (REST)
   - `GOOGLE_MAPS_ANDROID_API_KEY` — chave do Maps SDK for Android (build-time)

3. Publique regras e índices do Firestore:

   ```bash
   npx firebase-tools deploy --only firestore
   ```

## Rodando

```bash
pnpm start            # Expo dev server (Metro)
pnpm android          # abre no Android
pnpm ios              # abre no iOS
pnpm typecheck        # tsc em todos os pacotes
pnpm lint             # lint em todos os pacotes
pnpm build:web        # export web estático (usado no Firebase Hosting/CI)
```

No **Expo Go** o mapa usa a chave da Expo no Android; para a sua própria chave
(produção/homologação) use um _dev build_ (`npx expo run:android`) ou EAS.
No iOS o app usa o Apple Maps por padrão (não precisa de chave); trocar para o
Google Maps no iOS é só configuração (`ios.config.googleMapsApiKey`).

## Notas de plataforma

- **Mapa**: `PROVIDER_GOOGLE` no Android, Apple Maps no iOS.
- **Notificações**: apenas in-app (som + popup), sem push — compatível com o
  plano gratuito do Firebase. O app precisa estar aberto.
- **Regra da cerca ICEA**: toda carona tem origem **ou** destino dentro da caixa
  do campus, validada no cliente e nas `firestore.rules` (`nearIcea`).

## Segurança

O modelo de ameaças, os vetores testados e os limites conhecidos estão em
[firestore-security-analysis.md](firestore-security-analysis.md). Antes de abrir
para um público amplo, revise as regras (skill `firebase-security-rules-auditor`)
e, idealmente, teste contra o emulador do Firestore.

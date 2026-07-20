# Análise de segurança — Firestore rules (carona-app)

Regras para o app de caronas UFOP/ICEA. Modelo Spark (sem Cloud Functions):
toda a segurança está nas `firestore.rules`. Este documento resume o modelo de
ameaças e as decisões, incluindo os limites conhecidos.

## Gate base

Todas as regras exigem `isUfopVerified()` — e-mail `*.ufop.edu.br` **e**
`email_verified == true` no token — exceto a criação de `users/{uid}`, que roda
no cadastro antes da verificação e exige apenas o domínio UFOP (`hasUfopEmail()`).

O cliente precisa chamar `getIdToken(true)` após a verificação de e-mail
(feito em `refreshCurrentUser`), senão o token mantém `email_verified: false` e
todas as leituras/escritas falham.

## Coleções e acesso

- **users/{uid}** — PII (e-mail, chave PIX): leitura só do dono. Nomes exibidos
  a terceiros são desnormalizados nos docs de carona. `bookmarks` subcoleção:
  owner-only.
- **rideOffers/{id}** — listagem autenticada para matching. Carrega um
  `endpointPin` **FUZZY** (só lat/lng/geoHash, sem label/address, geoHash ≤ 6
  chars) do lado não-ICEA, para o pino público no mapa. **Não** carrega o
  `origin`/`destination` exatos — esses ficam só na `rides/{id}` privada. Criado
  e atualizado junto da `rides/{id}`.
- **rideRequests/{uid}** — pino público de "quero carona", simétrico à oferta.
  Só pinos **FUZZY** de origem e destino (`validPin`); diferente da oferta, não
  precisa tocar o ICEA (pode ser no meio do corredor). Leitura autenticada;
  criação só do dono segurando o mutex `requester`; `status` open→matched (pelo
  motorista, amarrado a um aceite real) ou open→canceled (pelo dono).
- **rides/{id}** — contém origem/destino exatos do motorista, então é legível só
  por `participantIds`: motorista e passageiros aceitos. Passageiro pendente
  observa apenas o próprio `joinRequests/{uid}` até ser aceito. Subcoleções
  `joinRequests`, `passengers` e `threads` têm regras próprias.
- **rides/{id}/passengers/{uid}.confirmed** — bool opcional. Nasce `false` só no
  fluxo mão dupla (motorista aceita pedido público); o pedinte confirma depois.
  A regra de `update` só deixa o **próprio** passageiro ligar o campo
  (`changedOnly(['confirmed'])`, nunca desliga). O gate de "iniciar corrida"
  enquanto há não confirmados é **client-side** (iterar subcoleção em rules é
  inviável) — consistente com os demais limites do Spark.
- **rides/{id}/threads/{peerId}/messages/{id}** — DM 1:1 entre motorista e um
  passageiro aceito. Leitura/escrita só do motorista da carona ou do próprio
  `peerId`, e apenas **após o aceite** (`exists(passengers/{peerId})`). Mensagem
  imutável: `senderId == auth.uid`, `text` 1..1000, `createdAt == request.time`.
- **activeRides/{uid}** — mutex de "1 atividade ativa" (`driver` | `passenger` |
  `requester`). Criado no mesmo batch da ride/joinRequest/pedido; as rules de
  criação exigem `existsAfter`/`getAfter` do mutex. O mutex de `requester` aponta
  para si mesmo (não há ride ainda) e é promovido a `passenger` pelo cliente do
  requester ao observar o pedido virar `matched`.
- **livePositions** — removida/bloqueada. O app não publica nem acompanha
  posição em tempo real para evitar custo recorrente.
- **cancellations** — imutável; criado só junto do cancelamento real
  (verificado por `getAfter`); alimenta a reputação.
- **reviews** — imutável; id composto `rideId_rater_ratee` (1 por par/carona);
  só para caronas `completed` com ambos em `participantIds`; `raterName`
  conferido contra `users/{rater}.name`.

## Mudança de postura: pinos públicos fuzzy (praça de caronas)

O app passou a mostrar ofertas **e** pedidos como pinos no mapa para todos os
verificados (marketplace de mão dupla). Isso reverte parcialmente a decisão
anterior de esconder toda localização até o aceite. Mitigação: o que é público é
sempre **fuzzy** — `validPin` aceita só `latitude`/`longitude`/`geoHash`, sem
`label`/`address`, e limita o `geoHash` a 6 chars (~1.2 km). O app arredonda a
coordenada para o centro de uma célula de ~1 km (`fuzzLocation`). O ponto
**exato** nunca entra num doc público: continua só em `rides` (motorista) e nos
`joinRequests`/`passengers` privados, revelado apenas após o aceite.

**Fluxo mão dupla:** além de passageiro→oferta (cria o próprio `joinRequest`
pendente), o motorista pode aceitar um pedido público direto do pino. A regra de
`create` do `joinRequest` ganhou uma segunda ramificação (motorista da ride cria
o pedido já `accepted`), amarrada a: existir um `rideRequests/{uid}` aberto, o
`passengers/{uid}` nascer `accepted` e o `rideRequests/{uid}` virar `matched` —
tudo verificado por `getAfter` no mesmo batch. O assento cai exatamente 1 (mesma
proteção do aceite normal).

## Vetores testados (advocacia do diabo) — corrigidos

- **Vazamento do driverPixKey**: um pedido recusado/cancelado continuava lendo a
  carona após a conclusão (onde a chave PIX é revelada). Corrigido: o acesso por
  `joinRequest` exige `status != 'completed'`.
- **Padding de participantIds / integridade de assentos**: o motorista podia
  inflar `participantIds` com uids falsos (habilitando reviews e contagem de
  caronas fraudulentas). Corrigido: crescer o roster exige `seatsAvailable`
  cair exatamente 1 **e** `passengers/{novoUid} == accepted` no mesmo batch.
- **Spoofing de raterName**: corrigido com conferência contra o perfil do autor.
- **Reputação de terceiros (bug funcional)**: a contagem de caronas concluídas
  só é legível pelo participante; separada em `getCompletedRideCount` (própria)
  para não derrubar as demais agregações ao ver o perfil alheio.
- **Vazamento de localização pré-aceite**: `rides/{id}` aberto expunha
  `origin`/`destination` a qualquer usuário verificado. Corrigido com
  `rideOffers/{id}` sem localização e leitura de `rides/{id}` limitada a
  participantes aceitos.
- **Permission-denied de passageiro pendente**: o cliente observava
  `rides/{id}`/`passengers` antes do aceite. Corrigido no provider: pendente só
  escuta `activeRides/{uid}` e o próprio `joinRequests/{uid}`.

## Vetores testados — bloqueados

Listagem pública, escrita/leitura fora de posse, update com lixo/campos extras,
sequestro de posse (create/update), modificação de campos imutáveis, type
juggling, bypass do mutex por criação nua, forjar `passengers` sem aceite real,
forjar `cancellations` sem cancelamento real, self-review / review de
não-participante / review duplicado / carona não concluída, leitura de
escrita/leitura de `livePositions` por cliente legado, burlar a cerca do ICEA,
acesso a subcoleção órfã.

## Limites conhecidos (aceitos para o plano Spark)

1. **Evasão de reputação via delete do mutex**: como o dono precisa poder
   deletar o próprio `activeRides` (cancelar pedido pendente, sair de recusa,
   self-heal de mutex órfão), um ator determinado pode abandonar uma carona sem
   gerar `cancellations`. Ele continua no roster do motorista até que este
   cancele/conclua; sem corrupção de dados nem escalonamento. Mitigável apenas
   com Cloud Functions.
2. **"Restock" de assentos até a capacidade**: o motorista pode elevar
   `seatsAvailable` (limitado por `availableSeats`) sem um cancelamento real.
   Só permite aceitar mais passageiros **reais** (cada aceite exige
   `joinRequest` + `passengers` verificados), então o efeito é embarque acima da
   capacidade informada — decisão operacional, não brecha de segurança.
3. **Fuzziness não é imponível nas rules**: `validPin` limita campos e o tamanho
   do geoHash, mas não há como o Firestore verificar que a coordenada foi de
   fato arredondada — um cliente malicioso poderia gravar um ponto exato nos 6
   chars de geoHash. O arredondamento é responsabilidade do app (`fuzzLocation`).
   Aceito: expõe no máximo o mesmo que o próprio usuário decidiu publicar.
4. **`endpointPin` da oferta não é cruzado com a `rides`**: as rules não
   verificam que o pino fuzzy corresponde ao `origin`/`destination` real da
   carona (a ride não guarda o pino). Um motorista poderia publicar um pino
   enganoso. Impacto limitado (informativo); o embarque real é combinado no app.
5. **Aceite unilateral do pedido**: o motorista adiciona o requester à carona
   sem uma confirmação extra dele — considerado consentimento implícito por ter
   publicado o pedido público. O requester pode desistir como passageiro depois.
6. **Mutex `requester` órfão**: se o app fecha entre o `matched` e a promoção do
   mutex, o requester fica `passenger` no roster mas com mutex `requester`; o
   cliente reconcilia ao reabrir (promove) ou o assento é liberado no cancelamento
   do motorista. Sem corrupção de dados.

## Status

Protótipo sólido, validado por dry-run de compilação e revisão adversarial.
Antes de abrir para um público amplo, revisar com o skill
`firebase-security-rules-auditor` e, idealmente, testar contra o emulador.

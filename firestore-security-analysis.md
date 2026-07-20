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
- **rideOffers/{id}** — listagem autenticada para matching, sem
  `origin`/`destination` nem rota. Mostra direção, motorista e assentos; criado
  e atualizado junto da `rides/{id}` correspondente.
- **rides/{id}** — contém origem/destino do motorista, então é legível só por
  `participantIds`: motorista e passageiros aceitos. Passageiro pendente observa
  apenas o próprio `joinRequests/{uid}` até ser aceito. Subcoleções
  `joinRequests` e `passengers` têm regras próprias.
- **activeRides/{uid}** — mutex de "1 carona ativa". Criado no mesmo batch da
  ride/joinRequest; as rules de criação exigem `existsAfter`/`getAfter` do mutex.
- **livePositions** — removida/bloqueada. O app não publica nem acompanha
  posição em tempo real para evitar custo recorrente.
- **cancellations** — imutável; criado só junto do cancelamento real
  (verificado por `getAfter`); alimenta a reputação.
- **reviews** — imutável; id composto `rideId_rater_ratee` (1 por par/carona);
  só para caronas `completed` com ambos em `participantIds`; `raterName`
  conferido contra `users/{rater}.name`.

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

## Status

Protótipo sólido, validado por dry-run de compilação e revisão adversarial.
Antes de abrir para um público amplo, revisar com o skill
`firebase-security-rules-auditor` e, idealmente, testar contra o emulador.

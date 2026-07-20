import type { GeoLocation, NamedLocation } from "./location";

export type RideDirection = "toCampus" | "fromCampus";

export type RideStatus =
  | "open"
  | "full"
  | "inProgress"
  | "completed"
  | "canceled";

export type JoinRequestStatus = "pending" | "accepted" | "declined" | "canceled";

export type PassengerStatus = "accepted" | "canceled";

export type ActiveRideRole = "driver" | "passenger" | "requester";

export type Ride = {
  id: string;
  driverId: string;
  driverName: string;
  direction: RideDirection;
  origin: NamedLocation;
  destination: NamedLocation;
  availableSeats: number;
  seatsAvailable: number;
  status: RideStatus;
  participantIds: string[];
  // Preenchida pelo motorista apenas ao concluir a carona; o doc concluído só é
  // legível pelos participantes, então a chave nunca vaza para fora do carro.
  driverPixKey: string | null;
  createdAt: Date;
  expiresAt: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  canceledBy: string | null;
};

export type RideOffer = {
  id: string;
  rideId: string;
  driverName: string;
  direction: RideDirection;
  // Pino público FUZZY do lado não-ICEA da oferta (de onde o motorista sai, ou
  // para onde vai). O ponto exato fica só na ride privada; isto aqui é borrado
  // pro nível de bairro (ver fuzzLocation).
  endpointPin: GeoLocation;
  availableSeats: number;
  seatsAvailable: number;
  status: RideStatus;
  createdAt: Date;
  expiresAt: Date;
};

export type RideRequestStatus = "open" | "matched" | "canceled";

// Pedido de carona PÚBLICO, simétrico a RideOffer. Diferente da oferta, o
// pedido não precisa tocar o ICEA (pode ser no meio do caminho), então carrega
// origem e destino. Ambos FUZZY — ponto exato só entra no joinRequest privado
// quando há match.
export type RideRequest = {
  // id == passengerId == uid (1 pedido ativo por pessoa).
  id: string;
  passengerId: string;
  passengerName: string;
  originPin: GeoLocation;
  destinationPin: GeoLocation;
  status: RideRequestStatus;
  // Preenchido pelo motorista quando aceita o pedido (status -> matched); o
  // cliente do requester lê isto para promover o próprio mutex a passageiro.
  matchedRideId: string | null;
  createdAt: Date;
  expiresAt: Date;
};

export type JoinRequest = {
  // id == uid do passageiro (deduplica naturalmente 1 pedido por carona).
  id: string;
  rideId: string;
  passengerId: string;
  passengerName: string;
  pickup: NamedLocation;
  dropoff: NamedLocation;
  status: JoinRequestStatus;
  createdAt: Date;
  respondedAt: Date | null;
};

export type RidePassenger = {
  uid: string;
  name: string;
  pickup: NamedLocation;
  dropoff: NamedLocation;
  status: PassengerStatus;
  // Confirmação do próprio passageiro de que quer ir com este motorista. Nasce
  // false apenas quando o motorista aceita um PEDIDO PÚBLICO (mão dupla) — o
  // pedinte ainda não escolheu o motorista. No fluxo de oferta (o passageiro
  // pediu pra entrar) nasce true. Docs antigos sem o campo contam como true.
  confirmed: boolean;
  joinedAt: Date;
  canceledAt: Date | null;
};

// Mensagem de DM entre o motorista e um passageiro aceito, sob a thread da
// carona. id auto-gerado.
export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: Date;
};

export type ActiveRide = {
  uid: string;
  rideId: string;
  role: ActiveRideRole;
  createdAt: Date;
};

export type RideCancellationStage = "open" | "full" | "inProgress";

export type RideCancellation = {
  id: string;
  uid: string;
  rideId: string;
  role: ActiveRideRole;
  stage: RideCancellationStage;
  createdAt: Date;
};

export type Review = {
  // id == `${rideId}_${raterId}_${rateeId}` (garante 1 review por par por carona).
  id: string;
  rideId: string;
  raterId: string;
  raterName: string;
  rateeId: string;
  rating: number;
  text?: string;
  createdAt: Date;
};

export type Bookmark = {
  id: string;
  label: string;
  address?: string;
  latitude: number;
  longitude: number;
  geoHash: string;
  createdAt: Date;
};

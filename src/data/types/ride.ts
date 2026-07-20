import type { NamedLocation } from "./location";

export type RideDirection = "toCampus" | "fromCampus";

export type RideStatus =
  | "open"
  | "full"
  | "inProgress"
  | "completed"
  | "canceled";

export type JoinRequestStatus = "pending" | "accepted" | "declined" | "canceled";

export type PassengerStatus = "accepted" | "canceled";

export type ActiveRideRole = "driver" | "passenger";

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
  availableSeats: number;
  seatsAvailable: number;
  status: RideStatus;
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
  joinedAt: Date;
  canceledAt: Date | null;
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

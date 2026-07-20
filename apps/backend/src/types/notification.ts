export type AppNotificationType =
  | "join-request-received"
  | "join-request-accepted"
  | "join-request-declined"
  | "passenger-canceled"
  | "ride-started"
  | "ride-completed"
  | "ride-canceled";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  title: string;
  message: string;
  rideId: string;
  createdAt: Date;
};

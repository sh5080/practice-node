import { BaseModel } from "./base.model";

// 컨텐츠
export interface Content extends BaseModel {
  name: string;
  startAt: Date;
  endAt: Date;

  reservationContents: ReservationContent[];
}

// 컨텐츠 예약 정보
export interface ReservationContent extends BaseModel {
  contentId: string;
  seatCount: number;
  isPublic: boolean;
  startAt: Date;
  endAt: Date;
}

// 예약 상태
export const ReservationStatus = {
  RESERVED: "reserved",
  LIKED: "liked",
  EMPTY: "empty",
} as const;

export type ReservationStatusType =
  (typeof ReservationStatus)[keyof typeof ReservationStatus];

// 예약 정보
export interface Reservation extends BaseModel {
  reservationContentId: string;
  userId: string;
  status: ReservationStatusType;
  seatNo: number;
}

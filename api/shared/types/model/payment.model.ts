import { BaseModel } from "./base.model";

export const PaymentCategory = {
  RESERVATION: "reservation",
} as const;

export type PaymentCategoryType =
  (typeof PaymentCategory)[keyof typeof PaymentCategory];

export const PaymentStatus = {
  SUCCEED: "succeed",
  FAILED: "failed",
  CANCELLED_BY_PG: "cancelled_by_pg",
  CANCELLED_BY_SERVER: "cancelled_by_server",
  CANCEL_FAILED: "cancel_failed",
} as const;

export type PaymentStatusType =
  (typeof PaymentStatus)[keyof typeof PaymentStatus];

// 컨텐츠
export interface Payment extends BaseModel {
  userId: string;
  type: PaymentCategoryType;
  status: PaymentStatusType;
}

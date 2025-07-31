import { PaymentStatus } from "../../shared/types/model/payment.model";
import { ReservationStatus } from "../../shared/types/model/reservation.model";
import {
  PaymentException,
  PaymentServiceException,
  PGException,
} from "../../shared/types/type/exception.type";
import { ReservationRepository } from "./reservation.repository";

export class Reservation {
  constructor(
    private readonly reservationRepository: ReservationRepository,
    private readonly paymentRepository: any,
    private readonly pgService: any
  ) {}
  async createContent(dto: any) {
    try {
      const { name, startAt, endAt } = dto;
      await this.reservationRepository.createContent(name, startAt, endAt);
    } catch (err) {
      throw new Error();
    }
  }
  async createReservationContent(dto: any) {
    try {
      const { contentId, seatCount, startAt, endAt } = dto;
      await this.reservationRepository.createReservationContent(
        contentId,
        seatCount,
        startAt,
        endAt
      );
    } catch (err) {
      throw new Error();
    }
  }
  async createReservations(userId: string, dto: any) {
    try {
      const { reservationContentId } = dto;
      // 예약 컨텐츠 조회
      const reservationContent =
        await this.reservationRepository.getReservationContent(
          reservationContentId
        );
      // 예약 컨텐츠가 없을 경우
      if (!reservationContent) {
        throw new Error();
      }
      // 각 좌석별 예약 정보 생성
      for (let i = 1; i <= reservationContent.seatCount; i++) {
        await this.reservationRepository.createReservation(
          reservationContentId,
          userId,
          i
        );
      }
    } catch (err) {
      throw new Error();
    }
  }
  async likeReservation(userId: string, id: string) {
    const reservation = await this.reservationRepository.getPublicReservation(
      id
    );
    // 1. 예약 정보 없을 경우 404
    if (!reservation) {
      throw new Error();
    }
    // 2. 예약정보가 empty가 아닌 경우 401
    if (reservation.status !== ReservationStatus.EMPTY) {
      throw new Error();
    }
    return await this.reservationRepository.updateReservation(
      userId,
      ReservationStatus.LIKED,
      id
    );
  }

  async confirmReservation(userId: string, dto: any) {
    let pgResult: any | null = null; // pgResult를 null로 초기화하여, PG 콜백 실패 시에도 안전하게 접근
    const reservation = await this.reservationRepository.getPublicReservation(
      dto.id
    );
    // 1. 예약 정보 없을 경우 404
    if (!reservation) {
      throw new Error();
    }
    // 2. 예약정보가 empty가 아니거나 liked임에도 userId가 일치하지 않는 경우 401
    // EMPTY 상태이거나, LIKED 상태이면서 userId가 일치하는 경우에만 예약 진행 허용
    if (
      reservation.status === ReservationStatus.EMPTY ||
      (reservation.status === ReservationStatus.LIKED &&
        reservation.userId === userId)
    ) {
      await this.reservationSystem(pgResult, userId, dto);
    } else {
      // 위 조건에 해당하지 않는 모든 경우 (예: RESERVED 상태, LIKED인데 userId 불일치 등)
      // 예약이 불가능하므로 에러
      throw new Error(
        "Unauthorized or invalid reservation status for this action."
      );
    }
  }
  private async reservationSystem(pgResult, userId, dto) {
    try {
      // 1. PG사로부터 결제 정보 콜백 처리 및 조회
      pgResult = await this.pgService.callback(userId, dto.transactionId);

      // 2. PG사 결제 정보가 없는 경우 에러 (PG 콜백 실패)
      if (!pgResult) {
        throw new PGException("PG callback result is empty or invalid.");
      }

      // 3. 우리 DB에서 해당 결제 요청 내역 조회
      const payment = await this.paymentRepository.getPayment(
        pgResult.id,
        userId
      );

      // 4. DB에 결제내역 없는 경우 에러 (우리 시스템에 해당 결제 요청 없음)
      if (!payment) {
        throw new PaymentException("Payment request not found in DB.");
      }

      // 5. PG사에서 받은 실제 결제 금액과 DB에 기록된 예상 금액 비교
      if (pgResult.amount !== payment.expectedAmount) {
        throw new PaymentException(
          "Payment amount mismatch. Payment needs to be cancelled." // 여기서는 'cancelled'를 언급하지 않고 'needs to be cancelled'로 변경
        );
      }

      // 8. 모든 검증 통과 시 예약 확정 처리
      await this.reservationRepository.updateReservation(
        userId,
        ReservationStatus.RESERVED,
        dto.reservationId, // dto에서 reservationId를 받아온다고 가정
        payment
      );
    } catch (error) {
      // **PG 취소 및 DB 상태 업데이트 통합 로직**
      // 이 함수 내에서 발생하는 모든 PaymentServiceException 계열의 에러에 대해 PG 취소 시도
      if (error instanceof PaymentServiceException) {
        // PG 콜백 결과가 있고, PG ID도 있다면 취소 시도
        if (pgResult && pgResult.id) {
          try {
            await this.pgService.cancel(pgResult.id);
            console.log(
              `Payment ${pgResult.id} cancelled due to an error: ${error.message}`
            );

            // PG 취소 성공 시, DB 결제 상태를 해당 에러에 맞게 업데이트
            let cancelStatus: string;
            if (error instanceof PGException) {
              cancelStatus = PaymentStatus.CANCELLED_BY_PG;
            } else {
              cancelStatus = PaymentStatus.CANCELLED_BY_SERVER;
            }
            await this.paymentRepository.updatePaymentStatus(
              pgResult.id,
              cancelStatus
            );
          } catch (cancelError) {
            // PG 취소 과정에서 에러 발생 (심각한 상황: 환불이 안 되었을 가능성)
            console.error(
              `Failed to cancel payment ${pgResult.id} during error handling: ${cancelError.message}`
            );
            // DB에 '취소 실패' 상태로 저장하여 추후 수동 처리 필요
            if (pgResult && pgResult.id) {
              await this.paymentRepository.updatePaymentStatus(
                pgResult.id,
                PaymentStatus.CANCEL_FAILED
              );
            }
          }
        }
        throw error;
      } else {
        // PaymentServiceException 계열이 아닌, 예상치 못한 일반 JavaScript Error
        console.error(
          `[Unexpected System Error] during confirmReservation for userId ${userId}: ${error.message}`,
          (error as Error).stack // 스택 트레이스를 로그로 남김
        );
        throw new Error(
          "An unexpected system error occurred during reservation confirmation."
        );
      }
    }
  }
}

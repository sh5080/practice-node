import { randomUUID } from "crypto";
import {
  Reservation,
  ReservationContent,
  ReservationStatus,
  ReservationStatusType,
} from "../../shared/types/model/reservation.model";
import { Pagination } from "../../shared/types/dto/common.dto";
import { Payment } from "../../shared/types/model/payment.model";

export class ReservationRepository {
  constructor(private readonly db: any) {}

  async createContent(name: string, startAt: Date, endAt: Date) {
    try {
      await this.db.query(
        `
          INSERT INTO "Content" (id, name, "startAt", "endAt")
          VALUES ($1, $2, $3, $4);
      `,
        [randomUUID(), name, startAt, endAt]
      );
    } catch (err) {
      // DBException instance로 throw
      throw new Error();
    }
  }
  async createReservationContent(
    contentId: string,
    seatCount: number,
    startAt: Date,
    endAt: Date
  ) {
    try {
      await this.db.query(
        `
          INSERT INTO "ReservationContent (id, "contentId", "seatCount", "startAt", "endAt", "isPublic")
          VALUES ($1, $2, $3, $4, $5, $6);
        `,
        [randomUUID(), contentId, seatCount, startAt, endAt, false]
      );
    } catch (err) {
      throw new Error();
    }
  }
  async createReservation(
    reservationContentId: string,
    userId: string,
    seatNo: number
  ) {
    try {
      await this.db.query(
        `
          INSERT INTO "Reservation" (id, "reservationContentId", "userId", "seatNo", status)
          VALUES ($1, $2, $3, $4, $5);
        `,
        [
          randomUUID(),
          reservationContentId,
          userId,
          seatNo,
          ReservationStatus.EMPTY,
        ]
      );
    } catch (err) {
      throw new Error();
    }
  }
  async getReservationContent(contentId: string) {
    try {
      const reservationContent = await this.db.query(
        `
          SELECT id, "contentId", "seatCount", "startAt", "endAt", "isPublic"
          FROM "ReservationContent"
          WHERE "contentId" = $1;
          `,
        [contentId]
      );
      return reservationContent as ReservationContent;
    } catch (err) {
      throw new Error();
    }
  }
  async getReservationsByStatus(
    reservationContentId: string,
    status: ReservationStatusType,
    pagination: Pagination
  ) {
    try {
      const reservations = await this.db.query(
        `
          SELECT id, "reservationContentId", "userId", "seatNo", status
          FROM "Reservation"
          WHERE "reservationContentId" = $1 AND status = $2
          LIMIT $3 OFFSET $4;
          `,
        [reservationContentId, status, pagination.limit, pagination.offset]
      );
      return reservations as Reservation;
    } catch (err) {
      throw new Error();
    }
  }
  async getPublicReservation(
    reservationContentId: string
  ): Promise<Reservation> {
    try {
      const reservations = await this.db.query(
        `
            SELECT
                R.id,
                R."reservationContentId",
                R."userId",
                R."seatNo",
                R.status,
                RC.isPublic,   
                RC.startAt AS "contentStartAt", 
                RC.endAt AS "contentEndAt"      
            FROM "Reservation" AS R
            INNER JOIN "ReservationContent" AS RC
                ON R."reservationContentId" = RC.id  
            WHERE R."reservationContentId" = $1      
            AND RC.isPublic = TRUE;                  
            `,
        [reservationContentId]
      );
      return reservations[0] || null;
    } catch (err) {
      throw new Error();
    }
  }
  async updateReservation(
    userId: string,
    status: ReservationStatusType,
    id: string, // Reservation 테이블의 ID
    paymentInfo?: Payment // 결제 정보 (선택 사항)
  ): Promise<void> {
    let connection;

    try {
      connection = await this.db.getConnection();
      await connection.beginTransaction();
      await connection.query(
        "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;"
      );

      // 1. 현재 예약 정보 조회 (FOR UPDATE로 락 획득)
      const existingReservations = await connection.query(
        `
        SELECT id, "userId", status, "reservationContentId"
        FROM "Reservation"
        WHERE id = $1 FOR UPDATE;
        `,
        [id]
      );

      const reservation = existingReservations[0];

      if (!reservation) {
        throw new Error(`Reservation with ID ${id} not found during update.`);
      }

      // --- 핵심: 트랜잭션 내부에서 최종 유효성 검증 ---
      // 시나리오: 이미 다른 사람이 예약을 했거나 찜을 했다면 예약을 진행할 수 없도록.
      // 찜(LIKED) -> LIKED (본인), EMPTY -> LIKED (누구든), LIKED (본인) -> RESERVED (본인)만 허용.
      // 그 외의 모든 상태 변경은 여기서 차단.
      const currentStatus = reservation.status;
      const currentUserId = reservation.userId;

      // 요청된 상태 (status)에 따른 유효성 검사
      if (status === ReservationStatus.LIKED) {
        // LIKED로 변경하려는 경우:
        // 1. 현재 EMPTY 상태여야 함 (누구든 찜 가능)
        // 2. 현재 LIKED 상태이고 userId가 일치해야 함 (본인이 찜했으므로 다시 찜 가능 - 멱등성)
        if (
          !(
            currentStatus === ReservationStatus.EMPTY ||
            (currentStatus === ReservationStatus.LIKED &&
              currentUserId === userId)
          )
        ) {
          throw new Error(
            `Cannot like reservation ${id}. Current status is ${currentStatus} or already liked by another user.`
          );
        }
      } else if (status === ReservationStatus.RESERVED) {
        // RESERVED로 변경하려는 경우:
        // 1. 결제 정보가 반드시 있어야 함
        if (!paymentInfo) {
          throw new Error(
            "Payment information is required for RESERVED status."
          );
        }
        // 2. 현재 EMPTY 또는 LIKED(본인) 상태여야 함
        if (
          !(
            currentStatus === ReservationStatus.EMPTY ||
            (currentStatus === ReservationStatus.LIKED &&
              currentUserId === userId)
          )
        ) {
          throw new Error(
            `Cannot reserve reservation ${id}. Current status is ${currentStatus} or already reserved by another user.`
          );
        }
        // 3. 그리고 LIKED 상태인 경우 userId가 반드시 요청한 userId와 일치해야 함
        if (
          currentStatus === ReservationStatus.LIKED &&
          currentUserId !== userId
        ) {
          throw new Error(
            `Reservation ${id} is liked by another user. Cannot reserve.`
          );
        }
      } else if (status === ReservationStatus.EMPTY) {
        // EMPTY로 변경하려는 경우 (찜 해제 또는 예약 취소)
        // 현재 예약의 소유자(userId)이거나, RESERVED된 경우 결제 취소 프로세스가 있어야 함.
        // 여기서 `userId`가 일치하는지 확인.
        if (
          currentStatus !== ReservationStatus.EMPTY &&
          currentUserId !== userId
        ) {
          throw new Error(
            `User ${userId} is not authorized to un-like/cancel reservation ${id}.`
          );
        }
        // 만약 RESERVED -> EMPTY 라면, 결제 취소가 선행되었거나 여기서 결제 취소 로직을 호출해야 할 수 있음.
        // 이 예시에서는 단순히 상태 변경만 하므로, 실제 프로덕션에서는 이 부분의 비즈니스 로직을 더 강화해야 합니다.
      }

      // --- 최종 유효성 검증 끝 ---

      // 4. 상태 변경 쿼리 및 파라미터 준비
      let updateQuery = "";
      let queryParams: any[] = [];
      let paymentId: string | null = null;

      if (status === ReservationStatus.RESERVED) {
        paymentId = paymentInfo!.id; // 위에서 paymentInfo 존재를 검증했으므로 ! 사용 가능
        updateQuery = `
          UPDATE "Reservation"
          SET status = $1, "paymentId" = $2, "updatedAt" = NOW()
          WHERE id = $3;
        `;
        queryParams = [status, paymentId, id];
      } else if (status === ReservationStatus.LIKED) {
        updateQuery = `
            UPDATE "Reservation"
            SET status = $1, "userId" = $2, "updatedAt" = NOW()
            WHERE id = $3;
          `;
        queryParams = [status, userId, id];
      } else if (status === ReservationStatus.EMPTY) {
        updateQuery = `
          UPDATE "Reservation"
          SET status = $1, "userId" = NULL, "paymentId" = NULL, "updatedAt" = NOW()
          WHERE id = $2;
        `;
        queryParams = [status, id];
      } else {
        // 그 외의 상태 (CANCELLED, FAILED 등)
        updateQuery = `
          UPDATE "Reservation"
          SET status = $1, "updatedAt" = NOW()
          WHERE id = $2;
        `;
        queryParams = [status, id];
      }

      // 5. 예약 정보 업데이트 실행
      await connection.query(updateQuery, queryParams);

      // 6. 트랜잭션 커밋
      await connection.commit();
    } catch (err) {
      // 7. 에러 발생 시 트랜잭션 롤백
      if (connection) {
        await connection.rollback();
      }
      console.error("Error updating reservation:", err);
      throw err;
    } finally {
      // 8. DB 연결 반환 (커넥션 풀 사용 시)
      if (connection && connection.release) {
        connection.release();
      }
    }
  }
}

export class BaseException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PaymentServiceException extends BaseException {
  constructor(message: string = "Payment service error occurred.") {
    super(message);
  }
}

export class PGException extends PaymentServiceException {
  constructor(message: string = "PG error occurred.") {
    super(message);
  }
}

export class PaymentException extends PaymentServiceException {
  constructor(message: string = "Payment error occurred.") {
    super(message);
  }
}

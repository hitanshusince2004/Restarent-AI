import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '@restaurant-os/types';

export interface ProcessPaymentParams {
  billId: string;
  amount: number;
  method: PaymentMethod;
  providerReference?: string;
}

export interface ProcessPaymentResult {
  success: boolean;
  providerReference?: string;
  failureReason?: string;
}

/**
 * PaymentProviderService
 * Initial implementation: manual (staff marks payment as received).
 * Extension points: add Razorpay, Stripe, etc. as additional methods.
 *
 * CRITICAL: Never claim a payment succeeded unless it has been
 * confirmed through the actual provider or manually verified by staff.
 */
@Injectable()
export class PaymentProviderService {
  private readonly logger = new Logger(PaymentProviderService.name);

  /**
   * Process a manual payment (Cash/UPI).
   * Staff initiates this after physically receiving payment.
   * No external gateway involved.
   */
  async processManualPayment(params: ProcessPaymentParams): Promise<ProcessPaymentResult> {
    this.logger.log({
      msg: 'Manual payment recorded',
      billId: params.billId,
      amount: params.amount,
      method: params.method,
      reference: params.providerReference,
    });

    // For manual payments, success is assumed once staff records it
    return {
      success: true,
      providerReference: params.providerReference,
    };
  }

  /**
   * Verify a payment with the external provider.
   * For manual payments, returns true immediately.
   * For gateway payments, would call the provider API.
   */
  async verifyPayment(
    _providerReference: string,
    _method: PaymentMethod,
  ): Promise<ProcessPaymentResult> {
    // Manual payment verification — always verified since staff initiated it
    return { success: true };
  }

  /**
   * Process refund.
   * For manual payments — records refund but no automated transfer.
   */
  async processRefund(
    _paymentId: string,
    _amount: number,
    _reason: string,
  ): Promise<ProcessPaymentResult> {
    this.logger.log({ msg: 'Refund recorded (manual)', _paymentId, _amount });
    return { success: true };
  }
}

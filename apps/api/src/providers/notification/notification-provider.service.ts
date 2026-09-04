import { Injectable, Logger } from '@nestjs/common';

/**
 * NotificationProviderService
 * Initial implementation: console/log transport.
 * Swap the internals for SMTP/SMS without changing callers.
 */
@Injectable()
export class NotificationProviderService {
  private readonly logger = new Logger(NotificationProviderService.name);

  async sendEmailVerification(email: string, name: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.WEB_URL}/verify-email?token=${token}`;
    this.logger.log({
      msg: '[NOTIFICATION] Email verification',
      to: email,
      name,
      verificationUrl,
    });
    // TODO(smtp): Replace with SMTP transport when NOTIFICATION_PROVIDER=smtp
  }

  async sendPasswordReset(email: string, name: string, token: string): Promise<void> {
    const resetUrl = `${process.env.WEB_URL}/reset-password?token=${token}`;
    this.logger.log({
      msg: '[NOTIFICATION] Password reset',
      to: email,
      name,
      resetUrl,
    });
  }

  async sendOrderNotification(
    email: string,
    name: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    this.logger.log({
      msg: '[NOTIFICATION] Order status update',
      to: email,
      name,
      orderNumber,
      status,
    });
  }

  async sendStaffInvite(
    email: string,
    restaurantName: string,
    inviteToken: string,
  ): Promise<void> {
    const inviteUrl = `${process.env.WEB_URL}/accept-invite?token=${inviteToken}`;
    this.logger.log({
      msg: '[NOTIFICATION] Staff invite',
      to: email,
      restaurantName,
      inviteUrl,
    });
  }
}

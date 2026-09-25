import nodemailer from 'nodemailer';
import { formatPaise } from '../../shared/types';
import type { Invoice, Business, Client } from '../../shared/types';

interface SendResult {
  success: boolean;
  channel: 'whatsapp' | 'email' | 'both';
  message: string;
  whatsAppUrl?: string;
  emailDetails?: any;
}

export class MessageSender {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter() {
    if (!this.transporter) {
      if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587', 10),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
      } else {
        // Fallback console transporter for development / test
        this.transporter = nodemailer.createTransport({
          streamTransport: true,
          newline: 'windows',
          buffer: true,
        });
      }
    }
    return this.transporter;
  }

  /**
   * Helper to construct payment and invoice view link
   */
  public static getInvoiceLink(invoiceId: string): string {
    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/invoices/${invoiceId}`;
  }

  /**
   * Format phone for WhatsApp wa.me link (standardize digits)
   */
  public static formatPhoneForWhatsApp(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `91${digits}`; // default to India country code if 10 digits
    }
    return digits;
  }

  /**
   * Template 1: Invoice Issue / Initial Send
   */
  public static buildInitialInvoiceMessage(
    invoice: Invoice,
    business: Business,
    client: Client
  ): string {
    const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    const link = this.getInvoiceLink(invoice.id);
    const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `Hello ${client.name},\n\nHere is invoice #${invoice.invoiceNumber} from ${business.name} for ${formatPaise(invoice.totalAmount)}.\n\nDue Date: ${dueDateStr}\nAmount Due: ${formatPaise(remainingPaise)}\nUPI ID: ${business.upiId}\n\nView invoice & download PDF here:\n${link}\n\nThank you,\n${business.name}`;
  }

  /**
   * Template 2: Due Date Reminder (polite, references remaining balance & link)
   */
  public static buildDueDateReminderMessage(
    invoice: Invoice,
    business: Business,
    client: Client
  ): string {
    const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    const link = this.getInvoiceLink(invoice.id);
    const dueDateStr = new Date(invoice.dueDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return `Hi ${client.name},\n\nThis is a friendly reminder that invoice #${invoice.invoiceNumber} for ${formatPaise(remainingPaise)} from ${business.name} is due today (${dueDateStr}).\n\nPayment Details:\nUPI ID: ${business.upiId}\nPay / View Invoice: ${link}\n\nThank you for your business!`;
  }

  /**
   * Template 3: 3-Day Overdue Reminder (firmer tone, mentions late fee rule & new total)
   */
  public static build3DayOverdueMessage(
    invoice: Invoice,
    business: Business,
    client: Client
  ): string {
    const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    const link = this.getInvoiceLink(invoice.id);
    const lateFeeNote =
      invoice.lateFeeAmount > 0
        ? `A late fee of ${formatPaise(invoice.lateFeeAmount)} (${invoice.lateFeePercent}%) has been applied as per terms.\n`
        : `A late fee policy is in effect for overdue invoices.\n`;

    return `Dear ${client.name},\n\nInvoice #${invoice.invoiceNumber} from ${business.name} is now 3 days overdue.\n\n${lateFeeNote}Current Outstanding Balance: ${formatPaise(remainingPaise)}\nUPI ID: ${business.upiId}\n\nKindly settle this payment immediately via: ${link}\n\nBest regards,\n${business.name}`;
  }

  /**
   * Template 4: 7+ Day Escalation (Internal Owner Alert — NO client-facing message)
   */
  public static build7DayEscalationNote(
    invoice: Invoice,
    business: Business,
    client: Client
  ): string {
    const remainingPaise = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    const link = this.getInvoiceLink(invoice.id);

    return `[OWNER ESCALATION ALERT] Invoice #${invoice.invoiceNumber} for ${client.name} is 7+ days overdue (${formatPaise(remainingPaise)} outstanding). Automated follow-ups have been halted. Action required: Please contact ${client.name} (${client.contactPhone}, ${client.contactEmail}) directly. Link: ${link}`;
  }

  /**
   * Send or prepare dispatch for an invoice
   */
  public static async dispatchInvoiceNotification(params: {
    stage: 'initial' | 'due' | '3day' | '7day';
    invoice: Invoice;
    business: Business;
    client: Client;
    pdfBuffer?: Uint8Array;
  }): Promise<SendResult> {
    const { stage, invoice, business, client, pdfBuffer } = params;

    let messageText = '';
    if (stage === 'initial') {
      messageText = this.buildInitialInvoiceMessage(invoice, business, client);
    } else if (stage === 'due') {
      messageText = this.buildDueDateReminderMessage(invoice, business, client);
    } else if (stage === '3day') {
      messageText = this.build3DayOverdueMessage(invoice, business, client);
    } else if (stage === '7day') {
      messageText = this.build7DayEscalationNote(invoice, business, client);
      // Stage 7day is an internal alert to owner, not sent to client
      return {
        success: true,
        channel: 'email',
        message: messageText,
      };
    }

    const cleanPhone = this.formatPhoneForWhatsApp(client.contactPhone);
    const whatsAppUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

    // Email dispatch attempt
    let emailSent = false;
    try {
      const transporter = this.getTransporter();
      const mailOptions: any = {
        from: `"${business.name}" <${business.contactEmail || 'billing@payflow.local'}>`,
        to: client.contactEmail,
        subject: `Invoice #${invoice.invoiceNumber} from ${business.name}`,
        text: messageText,
      };

      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `Invoice_${invoice.invoiceNumber}.pdf`,
            content: Buffer.from(pdfBuffer),
          },
        ];
      }

      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[MessageSender] Email dispatched to ${client.contactEmail} for invoice ${invoice.invoiceNumber}`);
    } catch (err: any) {
      console.warn(`[MessageSender] Email sending skipped/mocked: ${err.message}`);
    }

    return {
      success: true,
      channel: business.notificationChannel,
      message: messageText,
      whatsAppUrl,
      emailDetails: {
        sent: emailSent,
        to: client.contactEmail,
      },
    };
  }
}

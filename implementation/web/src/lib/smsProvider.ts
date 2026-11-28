import crypto from "node:crypto";

export interface SmsOtpDeliveryParams {
  phone: string;
  code: string;
  ttlSeconds: number;
  requestId: string;
}

export interface SmsOtpDeliveryResult {
  provider: string;
  providerMessageId: string;
}

export interface SmsOtpProvider {
  readonly name: string;
  sendOtp(params: SmsOtpDeliveryParams): Promise<SmsOtpDeliveryResult>;
}

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production";
}

export function isNonProductionEnvironment(): boolean {
  return !isProductionRuntime();
}

export interface SentMockOtpRecord {
  phone: string;
  code: string;
  requestId: string;
  sentAt: string;
}

declare global {
  var __nightlifezMockSmsLog: SentMockOtpRecord[] | undefined;
}

export function getMockSmsLog(): SentMockOtpRecord[] {
  if (!globalThis.__nightlifezMockSmsLog) {
    globalThis.__nightlifezMockSmsLog = [];
  }
  return globalThis.__nightlifezMockSmsLog;
}

export class MockSmsOtpProvider implements SmsOtpProvider {
  readonly name = "mock";

  async sendOtp(params: SmsOtpDeliveryParams): Promise<SmsOtpDeliveryResult> {
    if (isProductionRuntime()) {
      throw new Error("MockSmsOtpProvider cannot be used in production.");
    }
    const log = getMockSmsLog();
    log.unshift({
      phone: params.phone,
      code: params.code,
      requestId: params.requestId,
      sentAt: new Date().toISOString()
    });
    if (log.length > 50) {
      log.length = 50;
    }
    return {
      provider: this.name,
      providerMessageId: `mock_${crypto.randomUUID().slice(0, 12)}`
    };
  }
}

export class TwilioSmsOtpProvider implements SmsOtpProvider {
  readonly name = "twilio";
  private accountSid: string;
  private authToken: string;
  private fromNumber: string | undefined;
  private messagingServiceSid: string | undefined;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
    this.authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
    this.fromNumber = process.env.TWILIO_FROM_NUMBER;
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    if (!this.accountSid || !this.authToken || (!this.fromNumber && !this.messagingServiceSid)) {
      throw new Error(
        "Twilio SMS provider requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID."
      );
    }
  }

  async sendOtp(params: SmsOtpDeliveryParams): Promise<SmsOtpDeliveryResult> {
    const minutes = Math.max(1, Math.round(params.ttlSeconds / 60));
    const body = new URLSearchParams({
      To: params.phone,
      Body: `Your NIGHTLIFEZ verification code is ${params.code}. Valid for ${minutes} minutes. Do not share this code.`
    });
    if (this.messagingServiceSid) {
      body.set("MessagingServiceSid", this.messagingServiceSid);
    } else if (this.fromNumber) {
      body.set("From", this.fromNumber);
    }

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(this.accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => "Twilio error");
      throw new Error(`SMS delivery failed (${res.status}): ${errText.slice(0, 120)}`);
    }
    const json = (await res.json()) as { sid?: string };
    return {
      provider: this.name,
      providerMessageId: json.sid ?? `twilio_${params.requestId}`
    };
  }
}

export class WebhookSmsOtpProvider implements SmsOtpProvider {
  readonly name = "webhook";
  private webhookUrl: string;
  private webhookToken: string | undefined;

  constructor() {
    this.webhookUrl = process.env.SMS_WEBHOOK_URL ?? "";
    this.webhookToken = process.env.SMS_WEBHOOK_TOKEN;
    if (!this.webhookUrl) {
      throw new Error("Webhook SMS provider requires SMS_WEBHOOK_URL.");
    }
  }

  async sendOtp(params: SmsOtpDeliveryParams): Promise<SmsOtpDeliveryResult> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.webhookToken) {
      headers.Authorization = `Bearer ${this.webhookToken}`;
    }
    const res = await fetch(this.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: params.phone,
        code: params.code,
        ttlSeconds: params.ttlSeconds,
        requestId: params.requestId
      })
    });
    if (!res.ok) {
      throw new Error(`SMS webhook delivery failed (${res.status}).`);
    }
    return {
      provider: this.name,
      providerMessageId: `webhook_${params.requestId}`
    };
  }
}

export function getSmsOtpProvider(): SmsOtpProvider {
  const configured = (process.env.NIGHTLIFEZ_SMS_PROVIDER || "").trim().toLowerCase();

  if (isProductionRuntime()) {
    if (configured === "twilio") return new TwilioSmsOtpProvider();
    if (configured === "webhook") return new WebhookSmsOtpProvider();
    throw new Error(
      "Production SMS OTP provider is not configured. Set NIGHTLIFEZ_SMS_PROVIDER=twilio or webhook."
    );
  }

  // Non-production (local / Vercel preview): never send real SMS unless explicitly forced
  if (configured === "twilio" && process.env.NIGHTLIFEZ_ALLOW_REAL_SMS_IN_PREVIEW === "true") {
    return new TwilioSmsOtpProvider();
  }
  if (configured === "webhook" && process.env.NIGHTLIFEZ_ALLOW_REAL_SMS_IN_PREVIEW === "true") {
    return new WebhookSmsOtpProvider();
  }
  return new MockSmsOtpProvider();
}

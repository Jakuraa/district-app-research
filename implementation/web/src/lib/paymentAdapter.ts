import { buildUpiPaymentUri, type PaymentState } from "@nightlifez/shared";

export const LIVE_GATEWAY_ENABLED = false;

export interface DemoPaymentAttemptResult {
  state: PaymentState;
  mode: "DEMO_NO_CHARGE";
  transactionRef: string;
  message: string;
}

export interface PaymentInitiationRequest {
  amountInr: number;
  referenceCode: string;
  upiId?: string | null;
  payeeDisplayName?: string | null;
  simulateOutcome?: "CONFIRMED" | "FAILED";
}

export interface PaymentInitiationResult {
  providerId: string;
  state: PaymentState;
  requiresManualVerification: boolean;
  transactionRef: string | null;
  upiUri: string | null;
  message: string;
}

/**
 * Provider-neutral interface for organiser-owned payment adapters.
 * NIGHTLIFEZ never collects, holds, pools, or routes organiser funds.
 */
export interface OrganiserPaymentAdapter {
  readonly providerId: string;
  readonly displayName: string;
  readonly supportsAutoConfirm: boolean;
  initiatePayment(req: PaymentInitiationRequest): Promise<PaymentInitiationResult>;
}

export const DemoSandboxPaymentAdapter: OrganiserPaymentAdapter = {
  providerId: "DEMO_SANDBOX",
  displayName: "NIGHTLIFEZ Demo Sandbox (No Real Charge)",
  supportsAutoConfirm: true,
  async initiatePayment(req) {
    const attempt = await executeDemoPaymentAdapter({
      amountInr: req.amountInr,
      simulateOutcome: req.simulateOutcome
    });
    return {
      providerId: "DEMO_SANDBOX",
      state: attempt.state,
      requiresManualVerification: false,
      transactionRef: attempt.transactionRef,
      upiUri: null,
      message: attempt.message
    };
  }
};

export const DirectOrganiserUpiAdapter: OrganiserPaymentAdapter = {
  providerId: "DIRECT_UPI",
  displayName: "Direct-to-Organiser UPI",
  supportsAutoConfirm: false,
  async initiatePayment(req) {
    if (!req.upiId || !req.payeeDisplayName) {
      throw new Error("Organiser Direct UPI is not configured.");
    }
    const upiUri = buildUpiPaymentUri({
      upiId: req.upiId,
      payeeName: req.payeeDisplayName,
      amountInr: req.amountInr,
      referenceCode: req.referenceCode
    });
    return {
      providerId: "DIRECT_UPI",
      state: "PENDING",
      requiresManualVerification: true,
      transactionRef: null,
      upiUri,
      message: "Pay organiser directly via UPI. Tickets issue only after organiser verifies credit."
    };
  }
};

export function getOrganiserPaymentAdapter(channel: "DEMO_SANDBOX" | "ORGANISER_UPI" | "LIVE_GATEWAY"): OrganiserPaymentAdapter {
  if (channel === "DEMO_SANDBOX") return DemoSandboxPaymentAdapter;
  if (channel === "ORGANISER_UPI") return DirectOrganiserUpiAdapter;
  if (!LIVE_GATEWAY_ENABLED) {
    throw new Error("Live gateway integrations are disabled until separately approved.");
  }
  throw new Error("No live gateway provider configured.");
}

/**
 * Isolated demo payment adapter.
 * Never processes real financial transactions or external gateway charges.
 */
export async function executeDemoPaymentAdapter(params: {
  amountInr: number;
  simulateOutcome?: "CONFIRMED" | "FAILED";
}): Promise<DemoPaymentAttemptResult> {
  if (params.simulateOutcome === "FAILED") {
    return {
      state: "FAILED",
      mode: "DEMO_NO_CHARGE",
      transactionRef: `DEMO-FAIL-${Date.now()}`,
      message: "Simulated payment decline in demo mode. No card or UPI account was charged."
    };
  }

  return {
    state: "CONFIRMED",
    mode: "DEMO_NO_CHARGE",
    transactionRef: `DEMO-AUTH-${Date.now()}`,
    message: `Demo authorization approved for ₹${params.amountInr.toLocaleString("en-IN")} (no real charge).`
  };
}

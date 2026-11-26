import type { PaymentState } from "@nightlifez/shared";

export interface DemoPaymentAttemptResult {
  state: PaymentState;
  mode: "DEMO_NO_CHARGE";
  transactionRef: string;
  message: string;
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

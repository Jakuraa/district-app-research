export const UPI_VPA_REGEX = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z0-9]{2,32}$/;

export function isValidUpiVpa(vpa: string | null | undefined): boolean {
  if (!vpa) return false;
  return UPI_VPA_REGEX.test(vpa.trim());
}

export function buildUpiPaymentUri(params: {
  upiId: string;
  payeeName: string;
  amountInr: number;
  referenceCode: string;
  note?: string;
}): string {
  const pa = params.upiId.trim();
  if (!isValidUpiVpa(pa)) {
    throw new Error("Invalid organiser UPI ID.");
  }
  const amount = Math.max(0, Number(params.amountInr));
  const pn = params.payeeName.trim() || "NIGHTLIFEZ Organiser";
  const tr = params.referenceCode.trim();
  const tn = (params.note?.trim() || `NIGHTLIFEZ ${tr}`).slice(0, 80);

  const query = new URLSearchParams({
    pa,
    pn,
    am: amount.toFixed(2),
    cu: "INR",
    tr,
    tn
  });
  return `upi://pay?${query.toString()}`;
}

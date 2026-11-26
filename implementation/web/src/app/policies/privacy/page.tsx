import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href="/account" className="text-xs font-bold text-[#5b3df5] hover:underline">
        ← Back to Account
      </Link>
      <h1 className="text-2xl font-extrabold text-[#111319]">NIGHTLIFEZ Privacy Policy</h1>
      <p className="text-sm text-[#5e6473]">
        Your verified phone number is stored in normalized E.164 format solely for authentication,
        ticket delivery, and account security. One-time passcodes are stored only as cryptographic
        hashes with strict 5-minute expiration.
      </p>
    </main>
  );
}

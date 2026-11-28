import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-10">
      <Link href="/account" className="text-xs font-bold text-[#5b3df5] hover:underline">
        ← Back to Account
      </Link>
      <h1 className="text-2xl font-extrabold text-[#111319]">NIGHTLIFEZ Terms of Service</h1>
      <p className="text-sm text-[#5e6473]">
        NIGHTLIFEZ provides event discovery, venue reservations, and digital ticketing in accordance with
        applicable Indian and international commerce regulations. Phone verification via one-time password
        is used to secure attendee, organiser, venue, and staff accounts.
      </p>
    </main>
  );
}

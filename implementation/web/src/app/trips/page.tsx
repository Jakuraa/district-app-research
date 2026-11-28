"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { formatInr, SEED_CITIES, type City, type TripBookingRecord, type TripListing } from "@nightlifez/shared";
import { AppHeader } from "@/components/AppHeader";

export default function TripsPage() {
  const [trips, setTrips] = useState<TripListing[]>([]);
  const [cities, setCities] = useState<City[]>(SEED_CITIES);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripListing | null>(null);
  const [travellerName, setTravellerName] = useState("");
  const [travellerEmail, setTravellerEmail] = useState("");
  const [travellerPhone, setTravellerPhone] = useState("");
  const [pickupPointId, setPickupPointId] = useState("");
  const [seats, setSeats] = useState(1);
  const [bookingResult, setBookingResult] = useState<{
    booking: TripBookingRecord;
    upiUri: string | null;
    payeeName: string | null;
    upiId: string | null;
  } | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [upiTxRef, setUpiTxRef] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => {
        setTrips(d.trips ?? []);
        if (d.cities?.length) setCities(d.cities);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!bookingResult?.upiUri) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(bookingResult.upiUri, { width: 220, margin: 1 }).then(setQrDataUrl).catch(() => {});
  }, [bookingResult?.upiUri]);

  async function handleBookTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip) return;
    setMsg(null);
    const res = await fetch(`/api/trips/${encodeURIComponent(selectedTrip.slug)}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        travellerName,
        travellerEmail,
        travellerPhone,
        pickupPointId: pickupPointId || selectedTrip.pickupPoints[0]?.id,
        seats
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json?.error ?? "Could not submit trip request");
      return;
    }
    setBookingResult(json);
  }

  async function handleSubmitUtr(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTrip || !bookingResult) return;
    const res = await fetch(`/api/trips/${encodeURIComponent(selectedTrip.slug)}/book`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        referenceCode: bookingResult.booking.referenceCode,
        upiTxRef
      })
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg(json?.error ?? "Could not submit UTR");
      return;
    }
    setBookingResult({ ...bookingResult, booking: json.booking });
    setMsg("UTR submitted! Organiser will verify your advance payment and confirm your boarding pass.");
  }

  return (
    <div className="min-h-screen pb-14">
      <AppHeader cities={cities} />
      <main className="mx-auto max-w-6xl space-y-6 px-3 py-6 sm:px-6">
        <div>
          <span className="inline-block rounded-full bg-[#efeafe] px-3 py-1 text-[11px] font-bold text-[#5b3df5]">
            Curated Group Trips &amp; Retreats
          </span>
          <h1 className="mt-1 text-2xl font-extrabold text-[#111319] sm:text-3xl">
            Community Trips &amp; Weekend Escapes
          </h1>
          <p className="mt-1 text-sm text-[#5e6473]">
            Reserve your seat with an advance UPI payment directly to the trip organiser.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-sm text-[#5e6473]">Loading trips...</div>
        ) : trips.length === 0 ? (
          <div className="rounded-2xl border border-[#e4e6f0] bg-white p-8 text-center">
            <h2 className="text-base font-extrabold text-[#111319]">No upcoming trips published yet</h2>
            <p className="mt-1 text-xs text-[#5e6473]">Organisers can publish group trips with pickup points from the Organiser Console.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((t) => (
              <div key={t.id} className="flex flex-col justify-between rounded-2xl border border-[#e4e6f0] bg-white p-5">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#5b3df5]">
                    <span>{t.destination}</span>
                    <span>{t.remainingSeats}/{t.totalSeats} seats left</span>
                  </div>
                  <h2 className="mt-1.5 text-lg font-extrabold text-[#111319]">{t.title}</h2>
                  <p className="mt-1 text-xs text-[#5e6473]">{t.departureLabel} → {t.returnLabel}</p>
                  <p className="mt-2 text-xs text-[#374151]">{t.summary}</p>
                  <div className="mt-3 text-xs text-[#5e6473]">
                    Pickups: {t.pickupPoints.map((p) => p.label).join(" · ")}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-[#e4e6f0] pt-3">
                  <div>
                    <div className="text-sm font-extrabold text-[#111319]">{formatInr(t.priceInr)}</div>
                    <div className="text-[11px] font-semibold text-[#059669]">Advance: {formatInr(t.advanceInr)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTrip(t);
                      setPickupPointId(t.pickupPoints[0]?.id ?? "");
                      setBookingResult(null);
                      setMsg(null);
                    }}
                    className="rounded-xl bg-[#5b3df5] px-4 py-2 text-xs font-bold text-white"
                  >
                    Book Seat
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedTrip ? (
          <section className="rounded-3xl border border-[#5b3df5] bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-[#111319]">Book: {selectedTrip.title}</h2>
              <button type="button" onClick={() => setSelectedTrip(null)} className="text-xs font-bold text-[#5e6473]">Close</button>
            </div>
            {msg ? <div className="mt-3 rounded-xl bg-[#efeafe] px-3 py-2 text-xs font-bold text-[#5b3df5]">{msg}</div> : null}

            {!bookingResult ? (
              <form onSubmit={handleBookTrip} className="mt-4 grid gap-3 sm:grid-cols-2">
                <input type="text" required value={travellerName} onChange={(e) => setTravellerName(e.target.value)} placeholder="Full Name" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <input type="email" required value={travellerEmail} onChange={(e) => setTravellerEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <input type="tel" required value={travellerPhone} onChange={(e) => setTravellerPhone(e.target.value)} placeholder="Phone (+91...)" className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <select value={pickupPointId} onChange={(e) => setPickupPointId(e.target.value)} className="rounded-xl border border-[#e4e6f0] bg-white px-3 py-2.5 text-sm font-semibold">
                  {selectedTrip.pickupPoints.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <input type="number" min={1} max={selectedTrip.remainingSeats} value={seats} onChange={(e) => setSeats(Number(e.target.value))} className="rounded-xl border border-[#e4e6f0] px-3 py-2.5 text-sm" />
                <button type="submit" className="rounded-xl bg-[#5b3df5] py-2.5 text-sm font-extrabold text-white">
                  Request Seat &amp; Pay Advance ({formatInr(selectedTrip.advanceInr * seats)})
                </button>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl bg-[#f6f7fb] p-4 text-xs">
                  <div className="font-extrabold text-[#111319]">Reference: {bookingResult.booking.referenceCode}</div>
                  <div>Advance Due: {formatInr(bookingResult.booking.advanceInr)} · Balance at Trip: {formatInr(bookingResult.booking.totalInr - bookingResult.booking.advanceInr)}</div>
                  <div>Status: {bookingResult.booking.paymentStatus}</div>
                </div>
                {bookingResult.upiUri && qrDataUrl ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={qrDataUrl} alt="Organiser UPI QR" className="h-44 w-44 rounded-xl border border-[#e4e6f0] p-2" />
                    <form onSubmit={handleSubmitUtr} className="flex-1 space-y-2">
                      <div className="text-xs font-bold">Pay {bookingResult.payeeName} ({bookingResult.upiId})</div>
                      <a href={bookingResult.upiUri} className="inline-block rounded-xl bg-[#111319] px-4 py-2 text-xs font-bold text-white">Open UPI App</a>
                      <input type="text" required value={upiTxRef} onChange={(e) => setUpiTxRef(e.target.value)} placeholder="Enter 12-digit UTR / Reference" className="w-full rounded-xl border border-[#e4e6f0] px-3 py-2 text-sm" />
                      <button type="submit" className="rounded-xl bg-[#16a34a] px-4 py-2 text-xs font-bold text-white">Submit UTR for Verification</button>
                    </form>
                  </div>
                ) : (
                  <p className="text-xs text-[#d97706]">Organiser Direct UPI is not yet configured for this brand.</p>
                )}
              </div>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}

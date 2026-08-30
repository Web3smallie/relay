type FlightSearchInput = {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
};

type DuffelOffer = {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: Array<{
    origin: { iata_code: string; city_name?: string | null };
    destination: { iata_code: string; city_name?: string | null };
    segments: Array<{
      departing_at: string;
      arriving_at: string;
      operating_carrier: { name: string; iata_code: string };
    }>;
  }>;
};

function airportCode(value: string) {
  const code = value.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    throw new Error("Use a 3-letter airport code, for example LOS, LHR, or JFK.");
  }
  return code;
}

export async function searchDuffelFlights(input: FlightSearchInput) {
  const accessToken = process.env.DUFFEL_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("Flight search is not configured yet. Add DUFFEL_ACCESS_TOKEN to the backend environment.");
  }

  const origin = airportCode(input.origin);
  const destination = airportCode(input.destination);
  const adults = Number(input.adults);

  if (!input.departureDate || Number.isNaN(Date.parse(input.departureDate))) {
    throw new Error("Choose a valid departure date.");
  }
  if (!Number.isInteger(adults) || adults < 1 || adults > 9) {
    throw new Error("Choose between 1 and 9 adult travellers.");
  }

  const slices = [
    { origin, destination, departure_date: input.departureDate },
    ...(input.returnDate
      ? [{ origin: destination, destination: origin, departure_date: input.returnDate }]
      : []),
  ];

  const response = await fetch("https://api.duffel.com/air/offer_requests", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "Duffel-Version": "v2",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      data: {
        slices,
        passengers: Array.from({ length: adults }, () => ({ type: "adult" })),
        cabin_class: "economy",
      },
    }),
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.errors?.[0]?.message ?? "Duffel could not complete this flight search.";
    throw new Error(message);
  }

  const offers = (body.data?.offers ?? []).slice(0, 12).map((offer: DuffelOffer) => ({
    id: offer.id,
    amount: offer.total_amount,
    currency: offer.total_currency,
    carrier: offer.slices[0]?.segments[0]?.operating_carrier?.name ?? "Airline",
    departureAt: offer.slices[0]?.segments[0]?.departing_at ?? null,
    arrivalAt: offer.slices[0]?.segments.at(-1)?.arriving_at ?? null,
    stops: Math.max((offer.slices[0]?.segments.length ?? 1) - 1, 0),
  }));

  return { offerRequestId: body.data.id, offers };
}

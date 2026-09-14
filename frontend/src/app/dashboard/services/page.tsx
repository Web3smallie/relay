import Link from "next/link";

const services = [
  {
    href: "/dashboard/airtime",
    eyebrow: "Reloadly API",
    title: "Mobile Airtime Top-Up",
    description:
      "Instant carrier lookup and automated airtime delivery for mobile numbers across 140+ countries.",
    badge: "Instant Settlement",
    badgeColor: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    gradient: "from-[#1E1408] via-[#14101B] to-neutral-950 border-amber-500/30",
    iconBg: "from-amber-500 to-orange-500",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    tag: "140+ Countries",
  },
  {
    href: "/dashboard/travel",
    eyebrow: "Duffel Flights",
    title: "Worldwide Flight Search",
    description:
      "Live airline seat search, baggage allowances, carrier comparisons, and route planning across 300+ airlines.",
    badge: "Direct Sourcing",
    badgeColor: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
    gradient: "from-[#08171E] via-[#0E1220] to-neutral-950 border-cyan-500/30",
    iconBg: "from-cyan-500 to-blue-500",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    tag: "300+ Global Carriers",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10">
      {/* Header Banner */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-semibold text-amber-300">
            Direct Treasury Rail
          </span>
          <span className="rounded-full bg-white/[0.05] border border-white/10 px-3 py-1 text-xs text-neutral-400">
            Instant API Settlement
          </span>
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Connected Commerce Services
        </h2>
        <p className="mt-2 max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300">
          Relay supports high-frequency digital services beyond physical goods. These utilities execute
          directly from your Arc USDC wallet with zero escrow delay.
        </p>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {services.map((service) => (
          <Link
            key={service.href}
            href={service.href}
            className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${service.gradient}`}
          >
            <div className="flex items-center justify-between mb-5">
              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${service.iconBg} flex items-center justify-center font-bold text-white shadow-lg`}>
                {service.icon}
              </div>
              <span className={`text-xs font-semibold uppercase tracking-wider rounded-full border px-3 py-1 ${service.badgeColor}`}>
                {service.badge}
              </span>
            </div>

            <p className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
              {service.eyebrow}
            </p>
            <h3 className="mt-1 text-xl font-bold text-white group-hover:text-amber-200 transition">
              {service.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-400">
              {service.description}
            </p>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/[0.06]">
              <span className="text-xs text-neutral-500 font-medium">{service.tag}</span>
              <span className="text-xs font-semibold text-white group-hover:translate-x-1 transition flex items-center gap-1">
                <span>Launch Service</span>
                <span>→</span>
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Protocol Architecture Context Card */}
      <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0D111A] to-neutral-950 p-6 sm:p-7 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Multi-Rail Commerce Architecture
          </h4>
        </div>
        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
          Relay distinguishes between physical e-commerce (requiring 2-phase on-chain escrow to protect buyers
          during shipment) and digital APIs (airtime, flight booking, compute) that confirm in seconds.
          Digital services settle instantly via the <strong>Direct Treasury Rail</strong>.
        </p>
      </div>
    </div>
  );
}


import Link from "next/link";

const services = [
  {
    href: "/dashboard/airtime",
    eyebrow: "Reloadly",
    title: "Mobile airtime",
    description: "Check the mobile network for a number before starting an airtime top-up.",
  },
  {
    href: "/dashboard/travel",
    eyebrow: "Duffel",
    title: "Flight search",
    description: "Search live flight offers by route, date, and number of travellers.",
  },
];

export default function ServicesPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">Services</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">More ways to use Relay</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
        Relay supports commerce beyond physical products. Explore airtime and travel services here.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <Link
            key={service.href}
            href={service.href}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 transition hover:border-neutral-600 hover:bg-neutral-800 sm:p-6"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">{service.eyebrow}</p>
            <h3 className="mt-3 text-xl font-semibold text-white">{service.title}</h3>
            <p className="mt-2 text-sm leading-6 text-neutral-400">{service.description}</p>
            <span className="mt-5 inline-block text-sm font-medium text-white">Open service →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Home", href: "/dashboard" },
  { label: "Shop", href: "/dashboard/shop" },
  { label: "Services", href: "/dashboard/services" },
  { label: "Wallet", href: "/dashboard/wallet" },
  { label: "Orders", href: "/dashboard/orders" },
  { label: "Addresses", href: "/dashboard/addresses" },
  { label: "Activity", href: "/dashboard/activity" },
  { label: "Settings", href: "/dashboard/settings" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white md:flex">
      <aside className="border-b border-neutral-800 bg-neutral-950 px-4 py-4 md:w-56 md:border-r md:border-b-0 md:px-6 md:py-6">
        <div className="mb-4 flex items-center justify-between md:mb-8">
          <h1 className="text-xl font-semibold">Relay</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-neutral-400 hover:text-white md:hidden"
          >
            Log out
          </button>
        </div>
        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-1 md:overflow-visible md:px-0 md:pb-0">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm transition ${
                pathname === item.href
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-400 hover:bg-neutral-900 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-8 hidden text-sm text-neutral-500 hover:text-white md:block"
        >
          Log out
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const navItems = [
  { label: "Home", href: "/dashboard" },
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
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <aside className="w-56 border-r border-neutral-800 p-6">
        <h1 className="mb-8 text-xl font-semibold">Relay</h1>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-lg px-3 py-2 text-sm transition ${
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
          className="mt-8 text-sm text-neutral-500 hover:text-white"
        >
          Log out
        </button>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkSessionAndProfile() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const userId = data.session.user.id;
      setEmail(data.session.user.email ?? null);

      try {
        const res = await fetch(`http://localhost:4000/profile/${userId}`);
        if (res.ok) {
          const json = await res.json();
          setFullName(json.profile?.full_name ?? null);
        }
      } catch {
        // If the backend isn't reachable, just fall back to showing email only
      }

      setLoading(false);
    }

    checkSessionAndProfile();
  }, [router]);

  if (loading) {
    return <p className="text-neutral-400">Loading...</p>;
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">
        Welcome back{fullName ? `, ${fullName}` : ""}
      </h2>
    </div>
  );
}
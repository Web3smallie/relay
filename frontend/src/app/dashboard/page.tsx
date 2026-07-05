"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardHomePage() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    }

    checkSession();
  }, [router]);

  if (loading) {
    return <p className="text-neutral-400">Loading...</p>;
  }

  return (
    <div>
      <h2 className="mb-2 text-2xl font-semibold">Welcome back</h2>
      <p className="text-neutral-400">Signed in as {email}</p>
    </div>
  );
}
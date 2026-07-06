"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Confirming your account...");
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        setStatus("Could not confirm your session. Please try logging in.");
        setTimeout(() => router.push("/login"), 2000);
        return;
      }

      const userId = data.session.user.id;

      // Check that the wallet was actually created before sending to dashboard
      setStatus("Setting up your account...");

      const res = await fetch(`http://localhost:4000/wallet-status/${userId}`);
      const json = await res.json();

      if (json.hasWallet) {
        router.push("/dashboard");
      } else {
        setStatus("Finishing wallet setup...");
        // Give it a moment then check again, or trigger creation as a fallback
        await fetch("http://localhost:4000/wallet/create-for-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        router.push("/dashboard");
      }
    }

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950">
      <p className="text-neutral-400">{status}</p>
    </div>
  );
}
"use client";

import { useState } from "react";

type CopyAddressButtonProps = {
  address: string;
  className?: string;
};

export default function CopyAddressButton({ address, className = "" }: CopyAddressButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyAddress}
      className={`rounded-lg border border-neutral-700 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-neutral-500 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-white/40 ${className}`}
      aria-label="Copy wallet address"
    >
      {copied ? "Copied" : "Copy address"}
    </button>
  );
}

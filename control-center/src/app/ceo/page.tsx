"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CEOCommandSurface from "@/components/ceo/CEOCommandSurface";

function CeoContent() {
  const params = useSearchParams();
  const sessionKey = params.get("session") ?? "default";
  return <CEOCommandSurface key={sessionKey} />;
}

export default function CeoPage() {
  return (
    <Suspense fallback={<CEOCommandSurface />}>
      <CeoContent />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ServicesPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/system/services/dns-forwarding");
  }, [router]);
  return null;
}

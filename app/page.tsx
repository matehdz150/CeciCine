import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0f0f14] text-white">
          Cargando...
        </div>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}

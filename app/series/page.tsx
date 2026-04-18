import { Suspense } from "react";
import SeriesPageClient from "./SeriesPageClient";

export const dynamic = "force-dynamic";

export default function SeriesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          Cargando...
        </div>
      }
    >
      <SeriesPageClient />
    </Suspense>
  );
}

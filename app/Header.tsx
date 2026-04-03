"use client";

import { useState } from "react";
import { Search } from "lucide-react";

export default function Header({
  onSearch,
}: {
  onSearch?: (q: string) => void; // 👈 opcional
}) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (!query.trim()) return;
    onSearch?.(query); // 👈 safe call
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="backdrop-blur-xl bg-black/60 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          
          {/* 🔥 LOGO */}
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold tracking-tight">
              Ceci<span className="text-amber-400">+</span>
            </h1>

            {/* NAV */}
            <nav className="hidden md:flex gap-6 text-sm text-white/60">
              <span className="text-white cursor-pointer">Home</span>
              <span className="hover:text-white cursor-pointer transition">
                Movies
              </span>
              <span className="hover:text-white cursor-pointer transition">
                Series
              </span>
              <span className="hover:text-white cursor-pointer transition">
                My List
              </span>
            </nav>
          </div>

        </div>
      </div>
    </header>
  );
}
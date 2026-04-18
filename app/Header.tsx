"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, Menu, X } from "lucide-react";

export default function Header({
  onSearch,
}: {
  onSearch?: (q: string) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearch = () => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) return;

    const targetBase =
      pathname.startsWith("/series") || pathname.startsWith("/watch/tv")
        ? "/series"
        : "/";

    router.push(`${targetBase}?q=${encodeURIComponent(trimmedQuery)}`);
    onSearch?.(trimmedQuery);

    setMenuOpen(false);
    setSearchOpen(false);
  };

  const navigateTo = (href: string) => {
    router.push(href);
    setMenuOpen(false);
    setSearchOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="backdrop-blur-xl bg-black/60 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">

            {/* LEFT */}
            <div className="flex items-center gap-3 sm:gap-8">
              {/* MENU MOBILE */}
              <button
                onClick={() => setMenuOpen(true)}
                className="md:hidden text-white/80 active:scale-95"
              >
                <Menu size={22} />
              </button>

              {/* LOGO */}
              <button
                onClick={() => navigateTo("/")}
                className="text-lg sm:text-2xl font-bold tracking-tight"
              >
                C<span className="text-amber-400">+</span>
              </button>

              {/* NAV DESKTOP */}
              <nav className="hidden md:flex gap-6 text-sm text-white/60">
                <button
                  onClick={() => navigateTo("/")}
                  className="text-white cursor-pointer"
                >
                  Home
                </button>
                <button
                  onClick={() => navigateTo("/")}
                  className="hover:text-white cursor-pointer transition"
                >
                  Movies
                </button>
                <button
                  onClick={() => navigateTo("/series")}
                  className="hover:text-white cursor-pointer transition"
                >
                  Series
                </button>
                <span className="hover:text-white cursor-default transition">
                  My List
                </span>
              </nav>
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-3">
              {/* SEARCH ICON (mobile) */}
              <button
                onClick={() => setSearchOpen((prev) => !prev)}
                className="sm:hidden text-white/80 active:scale-95"
              >
                <Search size={20} />
              </button>

              {/* SEARCH DESKTOP */}
              <div className="hidden sm:flex items-center bg-white/10 rounded-full px-3 py-1 border border-white/10">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm px-2 w-40 text-white"
                />
                <button
                  onClick={handleSearch}
                  className="text-white/80 hover:text-white active:scale-95"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* 🔍 SEARCH MOBILE DROPDOWN */}
          {searchOpen && (
            <div className="sm:hidden px-4 pb-3">
              <div className="flex items-center bg-white/10 rounded-full px-3 py-2 border border-white/10">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search..."
                  className="bg-transparent outline-none text-sm flex-1 text-white"
                />
                <button
                  onClick={handleSearch}
                  className="text-white/80 hover:text-white active:scale-95"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 📱 MOBILE MENU */}
      <div
        className={`fixed inset-0 z-50 bg-black/80 backdrop-blur transition ${
          menuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="absolute top-0 left-0 w-[75%] h-full bg-[#0f0f14] p-6 flex flex-col gap-6 border-r border-white/10">

          {/* CLOSE */}
          <button
            onClick={() => setMenuOpen(false)}
            className="self-end text-white/70"
          >
            <X size={22} />
          </button>

          {/* NAV */}
          <nav className="flex flex-col gap-4 text-lg">
            <button onClick={() => navigateTo("/")} className="text-left text-white">
              Home
            </button>
            <button onClick={() => navigateTo("/")} className="text-left text-white/70">
              Movies
            </button>
            <button
              onClick={() => navigateTo("/series")}
              className="text-left text-white/70"
            >
              Series
            </button>
            <span className="text-white/70">My List</span>
          </nav>
        </div>
      </div>
    </>
  );
}

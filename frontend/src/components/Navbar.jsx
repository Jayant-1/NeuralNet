import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const links = [
    { label: "Builder", href: "#workspace" },
    { label: "Datasets", href: "#datasets" },
    { label: "Training", href: "#training" },
    { label: "Deploy", href: "#deploy" },
  ];

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 w-full z-[9000] transition-all duration-500 border-0 ${
        scrolled
          ? "glass-panel py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" data-hover>
          <BrandLogo
            textSize="text-lg"
            
            
            withHoverSpin
          />
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              data-hover
              className="font-mono text-sm text-text-dim hover:text-cyan transition-colors duration-300 tracking-wide"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/dashboard"
            data-hover="launch"
            className="ml-4 px-5 py-2 rounded-full border border-acid/30 text-acid font-mono text-sm hover:bg-acid/10 transition-all duration-300"
          >
            Open Dashboard
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          data-hover
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden glass-panel mt-2 mx-4 rounded-2xl p-6 flex flex-col gap-4 border border-white/5">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              data-hover
              onClick={() => setOpen(false)}
              className="font-mono text-sm text-text-dim hover:text-cyan transition-colors"
            >
              {l.label}
            </a>
          ))}
          <Link
            to="/dashboard"
            data-hover="launch"
            onClick={() => setOpen(false)}
            className="mt-2 px-5 py-2 rounded-full border border-acid/30 text-acid font-mono text-sm text-center hover:bg-acid/10 transition-all"
          >
            Open Dashboard
          </Link>
        </div>
      )}
    </nav>
  );
}

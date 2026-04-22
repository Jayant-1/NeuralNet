import { useEffect, useRef, useState } from 'react';
import { Hexagon, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const links = [
    { label: 'Builder', href: '#workspace' },
    { label: 'Datasets', href: '#datasets' },
    { label: 'Training', href: '#training' },
    { label: 'Deploy', href: '#deploy' },
  ];

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 w-full z-[9000] transition-all duration-500 ${
        scrolled
          ? 'glass-panel border-b border-white/5 py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2 group" data-hover>
          <div className="relative">
            <Hexagon
              size={32}
              className="text-cyan transition-all duration-300 group-hover:rotate-90"
              strokeWidth={1.5}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-cyan" />
            </div>
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-white">
            Neural<span className="text-cyan">Net</span>
          </span>
        </a>

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
          <a
            href="#deploy"
            data-hover="launch"
            className="ml-4 px-5 py-2 rounded-full border border-acid/30 text-acid font-mono text-sm hover:bg-acid/10 transition-all duration-300"
          >
            Launch Studio
          </a>
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
          <a
            href="#deploy"
            data-hover="launch"
            onClick={() => setOpen(false)}
            className="mt-2 px-5 py-2 rounded-full border border-acid/30 text-acid font-mono text-sm text-center hover:bg-acid/10 transition-all"
          >
            Launch Studio
          </a>
        </div>
      )}
    </nav>
  );
}

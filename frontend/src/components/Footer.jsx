import { Github, Linkedin, Twitter } from "lucide-react";
import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";

export default function Footer() {
  return (
    <footer className="border-t border-base-border/30 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <Link to="/">
          <BrandLogo textSize="text-sm" />
        </Link>

        <p className="font-mono text-xs text-text-dim tracking-wide text-center max-w-sm">
          Design neural systems like an editorial team: structured, legible, and
          built to ship.
        </p>

        <div className="flex items-center gap-6">
          {[
            { icon: Github, href: "#" },
            { icon: Twitter, href: "#" },
            { icon: Linkedin, href: "#" },
          ].map(({ icon: Icon, href }, i) => (
            <a
              key={i}
              href={href}
              data-hover
              className="text-text-dim hover:text-cyan transition-colors"
            >
              <Icon size={18} />
            </a>
          ))}
        </div>

        <p className="font-mono text-xs text-text-dim">
          © 2026 NeuralNet Studio. Designed for high-signal ML teams.
        </p>
      </div>
    </footer>
  );
}

import { Hexagon, Github, Twitter, Linkedin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-base-border/30 py-16 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Hexagon size={24} className="text-violet" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-violet" />
            </div>
          </div>
          <span className="font-heading font-bold text-sm text-white">
            Neural<span className="text-violet">Net</span> Studio
          </span>
        </div>

        <div className="flex items-center gap-6">
          {[
            { icon: Github, href: '#' },
            { icon: Twitter, href: '#' },
            { icon: Linkedin, href: '#' },
          ].map(({ icon: Icon, href }, i) => (
            <a key={i} href={href} data-hover className="text-text-dim hover:text-cyan transition-colors">
              <Icon size={18} />
            </a>
          ))}
        </div>

        <p className="font-mono text-xs text-text-dim">
          © 2026 NeuralNet Studio. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

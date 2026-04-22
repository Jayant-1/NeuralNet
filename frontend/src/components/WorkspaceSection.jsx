import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Layers, GitBranch, Zap, Box, ArrowRight, Workflow } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ── Workspace node definitions ── */
const WS_NODES = [
  { id: 'conv', label: 'Conv2D Layer', icon: Layers, color: '#8A2BE2', x: '50%', y: '45%', delay: 0 },
  { id: 'relu', label: 'ReLU Activation', icon: Zap, color: '#00F2FF', x: '25%', y: '30%', delay: 0.15 },
  { id: 'pool', label: 'MaxPool', icon: Box, color: '#FF6B00', x: '75%', y: '28%', delay: 0.25 },
  { id: 'dense', label: 'Dense 128', icon: GitBranch, color: '#00FF41', x: '30%', y: '68%', delay: 0.35 },
  { id: 'out', label: 'Softmax Output', icon: ArrowRight, color: '#00F2FF', x: '72%', y: '65%', delay: 0.45 },
];

const CONNECTIONS = [
  { from: 'relu', to: 'conv' },
  { from: 'conv', to: 'pool' },
  { from: 'pool', to: 'out' },
  { from: 'relu', to: 'dense' },
  { from: 'dense', to: 'out' },
];

/* ── Workspace Node Card ── */
function WorkspaceNode({ node, nodeRef }) {
  const Icon = node.icon;
  return (
    <div
      ref={nodeRef}
      className="absolute glass-panel rounded-2xl px-4 py-3 flex items-center gap-3 opacity-0"
      style={{
        left: node.x,
        top: node.y,
        transform: 'translate(-50%, -50%)',
        borderColor: `${node.color}25`,
        borderWidth: '2px',
        zIndex: 10,
      }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${node.color}15` }}>
        <Icon size={16} style={{ color: node.color }} />
      </div>
      <span className="font-mono text-xs text-white whitespace-nowrap">{node.label}</span>
    </div>
  );
}

/* ── Breathing Central Node ── */
function BreathingNode() {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-breathe z-[5]"
    >
      <div
        className="glass-panel rounded-3xl px-8 py-6 flex flex-col items-center gap-3"
        style={{
          borderColor: '#8A2BE230',
          borderWidth: '2px',
          boxShadow: '0 0 80px rgba(138, 43, 226, 0.08), 0 0 30px rgba(138, 43, 226, 0.05)',
        }}
      >
        <div className="w-14 h-14 rounded-2xl bg-violet/10 flex items-center justify-center">
          <Workflow size={28} className="text-violet" />
        </div>
        <div className="font-heading font-semibold text-white text-sm">Convolutional Layer</div>
        <div className="font-mono text-[10px] text-text-dim tracking-widest uppercase">Processing</div>
        <div className="flex gap-1 mt-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: '#8A2BE2',
                opacity: 0.3 + i * 0.2,
                animation: `breathe ${2 + i * 0.3}s ease-in-out infinite`,
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSection() {
  const sectionRef = useRef(null);
  const gridRef = useRef(null);
  const titleRef = useRef(null);
  const descRef = useRef(null);
  const nodeRefs = useRef([]);
  const svgRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      /* Title reveal */
      gsap.from(titleRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        x: -80, opacity: 0, duration: 1.2, ease: 'power3.out',
      });
      gsap.from(descRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 75%', toggleActions: 'play none none reverse' },
        x: -40, opacity: 0, duration: 1, delay: 0.2, ease: 'power3.out',
      });

      /* Nodes fly in on scroll */
      nodeRefs.current.forEach((el, i) => {
        if (!el) return;
        const fromDir = i % 2 === 0 ? -120 : 120;
        gsap.fromTo(
          el,
          { x: fromDir, y: i % 3 === 0 ? -60 : 60, opacity: 0, scale: 0.7 },
          {
            x: 0, y: 0, opacity: 1, scale: 1,
            duration: 0.8,
            delay: WS_NODES[i]?.delay || 0,
            ease: 'back.out(1.5)',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 70%',
              toggleActions: 'play none none reverse',
            },
          }
        );
      });

      /* SVG connections draw in */
      if (svgRef.current) {
        const paths = svgRef.current.querySelectorAll('.ws-conn');
        paths.forEach((path, i) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 1,
            delay: 0.6 + i * 0.12,
            ease: 'power2.inOut',
            scrollTrigger: {
              trigger: gridRef.current,
              start: 'top 65%',
              toggleActions: 'play none none reverse',
            },
          });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  /* Compute SVG connection paths based on node positions */
  const getNodeCenter = (node) => {
    const xPct = parseFloat(node.x) / 100;
    const yPct = parseFloat(node.y) / 100;
    return { x: xPct * 100 + '%', y: yPct * 100 + '%' };
  };

  return (
    <section
      ref={sectionRef}
      data-section="workspace"
      id="workspace"
      className="section-padding relative overflow-hidden"
    >
      {/* Asymmetric Braga-style layout */}
      <div className="max-w-7xl mx-auto">
        {/* Offset title area */}
        <div className="mb-20 max-w-2xl">
          <div className="font-mono text-xs text-violet tracking-[0.3em] uppercase mb-4" ref={descRef}>
            Visual Builder
          </div>
          <h2 ref={titleRef} className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white leading-tight">
            Architect Your
            <br />
            <span className="text-violet">Neural Topology</span>
          </h2>
          <p className="mt-6 text-text-dim font-mono text-sm leading-relaxed max-w-lg">
            Drag layers, connect transformations, and watch your model take shape
            in real-time. No code. No friction. Just pure architecture.
          </p>
        </div>

        {/* Workspace grid */}
        <div
          ref={gridRef}
          className="relative w-full rounded-3xl border border-base-border/50 overflow-hidden"
          style={{
            height: '500px',
            background: `
              radial-gradient(circle at 50% 50%, rgba(138,43,226,0.03) 0%, transparent 60%),
              linear-gradient(rgba(42,42,58,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(42,42,58,0.15) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 40px 40px, 40px 40px',
          }}
        >
          {/* Breathing node (visible before scroll) */}
          <BreathingNode />

          {/* SVG connections */}
          <svg
            ref={svgRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 8 }}
          >
            {CONNECTIONS.map((conn, i) => {
              const fromNode = WS_NODES.find((n) => n.id === conn.from);
              const toNode = WS_NODES.find((n) => n.id === conn.to);
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={i}
                  className="ws-conn"
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke="#8A2BE2"
                  strokeWidth="1"
                  opacity="0.3"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {WS_NODES.map((node, i) => (
            <WorkspaceNode
              key={node.id}
              node={node}
              nodeRef={(el) => (nodeRefs.current[i] = el)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

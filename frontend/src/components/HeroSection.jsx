import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { Database, Cpu, BarChart3, GripVertical } from 'lucide-react';

/* ── Node config ── */
const NODE_DEFS = [
  { id: 'input', label: 'Data Input', icon: Database, color: '#00F2FF', defaultX: 0.15, defaultY: 0.45 },
  { id: 'process', label: 'Transform', icon: Cpu, color: '#8A2BE2', defaultX: 0.5, defaultY: 0.42 },
  { id: 'output', label: 'Predict', icon: BarChart3, color: '#00FF41', defaultX: 0.82, defaultY: 0.48 },
];

const SNAP_DIST = 180;
const UNSNAP_DIST = 260;

/* ── Weave Canvas (background threads) ── */
function WeaveCanvas({ canvasRef }) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let threads = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Thread {
      constructor() {
        this.reset();
      }
      reset() {
        const w = canvas.width, h = canvas.height;
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.6;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.length = 120 + Math.random() * 180;
        this.angle = Math.random() * Math.PI * 2;
        this.angVel = (Math.random() - 0.5) * 0.003;
        this.opacity = 0.04 + Math.random() * 0.08;
        this.hue = Math.random() > 0.5 ? 186 : 270; // cyan or violet
        this.width = 0.5 + Math.random() * 1;
        this.phase = Math.random() * Math.PI * 2;
        this.freq = 0.005 + Math.random() * 0.01;
        this.amp = 15 + Math.random() * 25;
      }
      update(t) {
        this.x += this.vx;
        this.y += this.vy;
        this.angle += this.angVel;
        this.phase += this.freq;
        if (this.x < -200 || this.x > canvas.width + 200 || this.y < -200 || this.y > canvas.height + 200) {
          this.reset();
        }
      }
      draw(ctx, t) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.beginPath();
        const steps = 30;
        for (let i = 0; i <= steps; i++) {
          const pct = i / steps;
          const lx = (pct - 0.5) * this.length;
          const ly = Math.sin(pct * Math.PI * 3 + this.phase) * this.amp * pct * (1 - pct);
          if (i === 0) ctx.moveTo(lx, ly);
          else ctx.lineTo(lx, ly);
        }
        ctx.strokeStyle = `hsla(${this.hue}, 100%, 60%, ${this.opacity})`;
        ctx.lineWidth = this.width;
        ctx.stroke();
        ctx.restore();
      }
    }

    for (let i = 0; i < 35; i++) threads.push(new Thread());

    let t = 0;
    const loop = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      threads.forEach((th) => {
        th.update(t);
        th.draw(ctx, t);
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [canvasRef]);

  return null;
}

/* ── SVG Gooey Filter ── */
function GooeyFilter() {
  return (
    <defs>
      <filter id="gooey">
        <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
        <feColorMatrix
          in="blur"
          mode="matrix"
          values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
          result="gooey"
        />
        <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
      </filter>
    </defs>
  );
}

/* ── Connection Line ── */
function ConnectionLine({ from, to, color }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2 - 40;
  const d = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

  return (
    <g>
      {/* Glow */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="4"
        opacity="0.15"
        filter="url(#gooey)"
      />
      {/* Main line */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeDasharray="8 4"
        opacity="0.8"
        className="connection-pulse"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-24"
          dur="1s"
          repeatCount="indefinite"
        />
      </path>
      {/* Pulse dot traveling along path */}
      <circle r="4" fill={color} opacity="0.9">
        <animateMotion dur="2s" repeatCount="indefinite" path={d} />
      </circle>
      <circle r="4" fill={color} opacity="0.3" filter="url(#gooey)">
        <animateMotion dur="2s" repeatCount="indefinite" path={d} />
      </circle>
    </g>
  );
}

/* ── Draggable Node ── */
function DraggableNode({ def, pos, onDrag, onDragEnd, containerRef }) {
  const nodeRef = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    dragging.current = true;
    const rect = containerRef.current.getBoundingClientRect();
    offset.current = {
      x: e.clientX - (rect.left + pos.x),
      y: e.clientY - (rect.top + pos.y),
    };
    nodeRef.current?.setPointerCapture(e.pointerId);
    nodeRef.current?.classList.add('scale-105');
  }, [pos, containerRef]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - offset.current.x;
    const y = e.clientY - rect.top - offset.current.y;
    const cx = Math.max(40, Math.min(rect.width - 40, x));
    const cy = Math.max(40, Math.min(rect.height - 40, y));
    onDrag(def.id, cx, cy);
  }, [def.id, onDrag, containerRef]);

  const handlePointerUp = useCallback((e) => {
    dragging.current = false;
    nodeRef.current?.releasePointerCapture(e.pointerId);
    nodeRef.current?.classList.remove('scale-105');
    onDragEnd(def.id);
  }, [def.id, onDragEnd]);

  const Icon = def.icon;

  return (
    <div
      ref={nodeRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      data-hover
      className="absolute select-none touch-none transition-transform duration-100"
      style={{
        left: pos.x - 72,
        top: pos.y - 42,
        zIndex: 20,
      }}
    >
      <div
        className="glass-panel rounded-2xl px-5 py-3 flex items-center gap-3 group transition-all duration-300 hover:scale-105"
        style={{
          borderColor: `${def.color}33`,
          borderWidth: '2px',
          boxShadow: `0 0 24px ${def.color}20, 0 0 60px ${def.color}08`,
        }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${def.color}18` }}
        >
          <Icon size={18} style={{ color: def.color }} />
        </div>
        <div>
          <div className="text-xs font-mono text-text-dim uppercase tracking-widest" style={{ fontSize: '9px' }}>
            {def.id}
          </div>
          <div className="text-sm font-heading font-semibold text-white whitespace-nowrap">
            {def.label}
          </div>
        </div>
        <GripVertical size={14} className="text-text-dim ml-1 opacity-40" />
      </div>
    </div>
  );
}

/* ── Main Hero Section ── */
export default function HeroSection() {
  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const playgroundRef = useRef(null);
  const headlineRef = useRef(null);
  const subRef = useRef(null);
  const ctaRef = useRef(null);

  const [nodes, setNodes] = useState({});
  const [connections, setConnections] = useState([]);
  const initialized = useRef(false);

  /* ── Initialize node positions on mount ── */
  useEffect(() => {
    if (initialized.current) return;
    const rect = playgroundRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) {
      const timer = setTimeout(() => { initialized.current = false; }, 100);
      return () => clearTimeout(timer);
    }
    initialized.current = true;
    const initial = {};
    NODE_DEFS.forEach((d) => {
      initial[d.id] = { x: d.defaultX * rect.width, y: d.defaultY * rect.height };
    });
    setNodes(initial);
  }, []);

  /* ── Drag handler ── */
  const handleDrag = useCallback((id, x, y) => {
    setNodes((prev) => ({ ...prev, [id]: { x, y } }));
  }, []);

  /* ── Snap detection ── */
  const handleDragEnd = useCallback((id) => {
    setNodes((current) => {
      const positions = current;
      const newConns = [];
      const ids = Object.keys(positions);
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = positions[ids[i]];
          const b = positions[ids[j]];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < SNAP_DIST) {
            const colorA = NODE_DEFS.find((d) => d.id === ids[i])?.color || '#fff';
            newConns.push({ from: ids[i], to: ids[j], color: colorA });
          }
        }
      }
      setConnections(newConns);
      return current;
    });
  }, []);

  /* ── Also check connections during drag ── */
  useEffect(() => {
    const ids = Object.keys(nodes);
    if (ids.length < 2) return;
    const newConns = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a = nodes[ids[i]];
        const b = nodes[ids[j]];
        if (!a || !b) continue;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < SNAP_DIST) {
          const colorA = NODE_DEFS.find((d) => d.id === ids[i])?.color || '#fff';
          newConns.push({ from: ids[i], to: ids[j], color: colorA });
        }
      }
    }
    setConnections(newConns);
  }, [nodes]);

  /* ── GSAP entrance ── */
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(headlineRef.current?.children || [], {
        y: 60,
        opacity: 0,
        duration: 1.2,
        stagger: 0.15,
        ease: 'power3.out',
        delay: 0.3,
      });
      gsap.from(subRef.current, {
        y: 30,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        delay: 0.8,
      });
      gsap.from(ctaRef.current, {
        y: 20,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        delay: 1.1,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-section="hero"
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Canvas background */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 0 }}
      />
      <WeaveCanvas canvasRef={canvasRef} />

      {/* Radial gradient accents */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-[0.04] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00F2FF, transparent 70%)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8A2BE2, transparent 70%)' }} />

      {/* Headline */}
      <div className="relative z-10 text-center mb-8 mt-12 px-4" ref={headlineRef}>
        <h1 className="font-heading font-bold text-5xl sm:text-6xl md:text-7xl lg:text-8xl tracking-tight leading-[0.95]">
          <span className="block text-white">Stop Coding.</span>
          <span className="block gradient-text mt-2">Start Weaving Intelligence.</span>
        </h1>
      </div>

      <p
        ref={subRef}
        className="relative z-10 text-text-dim font-mono text-sm md:text-base max-w-xl text-center my-4"
      >
        Drag the nodes below. Connect them. Watch intelligence flow.
        <br />
        NeuralNet Studio is the visual loom for your AI pipelines.
      </p>

      <div ref={ctaRef} className="relative z-10 flex gap-4 my-4">
        <a
          href="#workspace"
          data-hover
          className="px-7 py-3 rounded-full bg-cyan/10 border border-cyan/30 text-cyan font-mono text-sm hover:bg-cyan/20 transition-all duration-300"
        >
          Explore Builder
        </a>
        <a
          href="#deploy"
          data-hover="launch"
          className="px-7 py-3 rounded-full bg-acid/10 border border-acid/30 text-acid font-mono text-sm hover:bg-acid/20 transition-all duration-300"
        >
          Deploy Now
        </a>
      </div>

      {/* Node Playground */}
      <div
        ref={playgroundRef}
        className="relative z-10 w-full max-w-5xl mx-auto"
        style={{ height: '260px' }}
      >
        {/* SVG Connection Layer */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 15 }}
        >
          <GooeyFilter />
          {connections.map((conn, i) => {
            const from = nodes[conn.from];
            const to = nodes[conn.to];
            if (!from || !to) return null;
            return (
              <ConnectionLine
                key={`${conn.from}-${conn.to}`}
                from={from}
                to={to}
                color={conn.color}
              />
            );
          })}
        </svg>

        {/* Draggable Nodes */}
        {Object.keys(nodes).length > 0 &&
          NODE_DEFS.map((def) => (
            <DraggableNode
              key={def.id}
              def={def}
              pos={nodes[def.id]}
              onDrag={handleDrag}
              onDragEnd={handleDragEnd}
              containerRef={playgroundRef}
            />
          ))}

        {/* Hint text */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[11px] text-text-dim/50 tracking-widest uppercase pointer-events-none">
          ← drag nodes together to connect →
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        <div className="w-5 h-8 rounded-full border border-text-dim/30 flex justify-center pt-1.5">
          <div className="w-1 h-2 rounded-full bg-cyan animate-bounce" />
        </div>
      </div>
    </section>
  );
}

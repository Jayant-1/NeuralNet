import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BrainCircuit } from "lucide-react";
import { useEffect, useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

/* ── Neural Hub SVG ── */
function NeuralHub({ hubRef }) {
  const nodes = [
    // Input Neural
    { cx: 80, cy: 80, r: 6, layer: "input" },
    { cx: 80, cy: 150, r: 6, layer: "input" },
    { cx: 80, cy: 220, r: 6, layer: "input" },
    { cx: 80, cy: 290, r: 6, layer: "input" },
    // Hidden 1
    { cx: 220, cy: 100, r: 8, layer: "hidden" },
    { cx: 220, cy: 185, r: 8, layer: "hidden" },
    { cx: 220, cy: 270, r: 8, layer: "hidden" },
    // Hidden 2
    { cx: 360, cy: 120, r: 8, layer: "hidden" },
    { cx: 360, cy: 185, r: 8, layer: "hidden" },
    { cx: 360, cy: 250, r: 8, layer: "hidden" },
    // Output
    { cx: 500, cy: 150, r: 7, layer: "output" },
    { cx: 500, cy: 220, r: 7, layer: "output" },
  ];

  const connections = [];
  // Input -> Hidden1
  for (let i = 0; i < 4; i++)
    for (let j = 4; j < 7; j++) connections.push({ from: i, to: j });
  // Hidden1 -> Hidden2
  for (let i = 4; i < 7; i++)
    for (let j = 7; j < 10; j++) connections.push({ from: i, to: j });
  // Hidden2 -> Output
  for (let i = 7; i < 10; i++)
    for (let j = 10; j < 12; j++) connections.push({ from: i, to: j });

  const layerColor = (layer) => {
    if (layer === "input") return "#00F2FF";
    if (layer === "hidden") return "#8A2BE2";
    return "#00FF41";
  };

  return (
    <svg ref={hubRef} viewBox="0 0 580 370" className="w-full max-w-xl mx-auto">
      {/* Connections */}
      {connections.map((c, i) => (
        <line
          key={i}
          className="hub-line"
          x1={nodes[c.from].cx}
          y1={nodes[c.from].cy}
          x2={nodes[c.to].cx}
          y2={nodes[c.to].cy}
          stroke="#8A2BE2"
          strokeWidth="0.8"
          opacity="0.15"
        />
      ))}
      {/* Nodes */}
      {nodes.map((n, i) => (
        <g key={i}>
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r + 8}
            fill={layerColor(n.layer)}
            opacity="0.05"
            className="hub-glow"
          />
          <circle
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill={layerColor(n.layer)}
            opacity="0.8"
            className="hub-node"
          />
        </g>
      ))}
      {/* Layer labels */}
      <text
        x="80"
        y="330"
        textAnchor="middle"
        className="fill-text-dim font-mono"
        style={{ fontSize: "10px" }}
      >
        Input
      </text>
      <text
        x="220"
        y="330"
        textAnchor="middle"
        className="fill-text-dim font-mono"
        style={{ fontSize: "10px" }}
      >
        Hidden 1
      </text>
      <text
        x="360"
        y="330"
        textAnchor="middle"
        className="fill-text-dim font-mono"
        style={{ fontSize: "10px" }}
      >
        Hidden 2
      </text>
      <text
        x="500"
        y="330"
        textAnchor="middle"
        className="fill-text-dim font-mono"
        style={{ fontSize: "10px" }}
      >
        Output
      </text>
    </svg>
  );
}

/* ── Metrics Chart ── */
function MetricsChart({ chartRef }) {
  // Accuracy curve (ascending)
  const accData = [
    10, 25, 40, 52, 60, 68, 74, 78, 82, 85, 87, 89, 90, 91, 92, 92.5, 93, 93.2,
    93.5, 93.8,
  ];
  // Loss curve (descending)
  const lossData = [
    90, 75, 60, 50, 42, 36, 30, 26, 22, 19, 17, 15, 13, 12, 11, 10.5, 10, 9.5,
    9.2, 9,
  ];

  const w = 500,
    h = 180,
    pad = 40;
  const plotW = w - pad * 2;
  const plotH = h - pad;

  const toPath = (data) => {
    return data
      .map((v, i) => {
        const x = pad + (i / (data.length - 1)) * plotW;
        const y = h - pad - (v / 100) * plotH;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  };

  return (
    <svg
      ref={chartRef}
      viewBox={`0 0 ${w} ${h}`}
      className="w-full max-w-xl mx-auto mt-8"
    >
      {/* Grid */}
      {[0, 25, 50, 75, 100].map((v) => {
        const y = h - pad - (v / 100) * plotH;
        return (
          <g key={v}>
            <line
              x1={pad}
              y1={y}
              x2={w - pad}
              y2={y}
              stroke="#2A2A3A"
              strokeWidth="0.5"
            />
            <text
              x={pad - 8}
              y={y + 3}
              textAnchor="end"
              className="fill-text-dim"
              style={{ fontSize: "8px", fontFamily: "JetBrains Mono" }}
            >
              {v}%
            </text>
          </g>
        );
      })}

      {/* Accuracy line */}
      <path
        className="metric-line"
        d={toPath(accData)}
        fill="none"
        stroke="#00FF41"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Loss line */}
      <path
        className="metric-line"
        d={toPath(lossData)}
        fill="none"
        stroke="#00F2FF"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Labels */}
      <circle cx={w - pad - 70} cy={12} r={4} fill="#00FF41" />
      <text
        x={w - pad - 60}
        y={15}
        className="fill-white"
        style={{ fontSize: "9px", fontFamily: "JetBrains Mono" }}
      >
        Accuracy
      </text>
      <circle cx={w - pad - 70} cy={26} r={4} fill="#00F2FF" />
      <text
        x={w - pad - 60}
        y={29}
        className="fill-white"
        style={{ fontSize: "9px", fontFamily: "JetBrains Mono" }}
      >
        Loss
      </text>
    </svg>
  );
}

/* ── Data Particles ── */
function DataParticles({ containerRef }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const ps = [];
    const colors = ["#00F2FF", "#8A2BE2", "#00FF41", "#FF6B00"];
    for (let i = 0; i < 24; i++) {
      ps.push({
        id: i,
        color: colors[i % colors.length],
        startX: -20 - Math.random() * 60,
        startY: 30 + Math.random() * 60,
        size: 3 + Math.random() * 4,
        delay: i * 0.15,
        duration: 2 + Math.random() * 1.5,
      });
    }
    setParticles(ps);
  }, []);

  useEffect(() => {
    if (!containerRef.current || particles.length === 0) return;

    const ctx = gsap.context(() => {
      particles.forEach((p) => {
        const el = containerRef.current.querySelector(
          `[data-particle="${p.id}"]`,
        );
        if (!el) return;
        gsap.fromTo(
          el,
          { x: 0, opacity: 0 },
          {
            x: 400 + Math.random() * 200,
            opacity: 0,
            duration: p.duration,
            delay: p.delay,
            ease: "none",
            repeat: -1,
            keyframes: [
              { opacity: 0, duration: 0 },
              { opacity: 0.8, duration: 0.3 },
              { opacity: 0.8, duration: p.duration - 0.6 },
              { opacity: 0, duration: 0.3 },
            ],
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top 60%",
              toggleActions: "play pause resume pause",
            },
          },
        );
      });
    }, containerRef);

    return () => ctx.revert();
  }, [particles, containerRef]);

  return (
    <>
      {particles.map((p) => (
        <div
          key={p.id}
          data-particle={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            background: p.color,
            left: `${p.startX}px`,
            top: `${p.startY}%`,
            boxShadow: `0 0 8px ${p.color}60`,
            opacity: 0,
          }}
        />
      ))}
    </>
  );
}

export default function TrainingSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const hubRef = useRef(null);
  const chartRef = useRef(null);
  const particleContainerRef = useRef(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
      });

      /* Hub nodes pulse on scroll */
      if (hubRef.current) {
        const hubNodes = hubRef.current.querySelectorAll(".hub-node");
        gsap.from(hubNodes, {
          scale: 0,
          opacity: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: "back.out(2)",
          scrollTrigger: {
            trigger: hubRef.current,
            start: "top 70%",
            toggleActions: "play none none reverse",
          },
        });

        const hubLines = hubRef.current.querySelectorAll(".hub-line");
        hubLines.forEach((line) => {
          const len = Math.hypot(
            parseFloat(line.getAttribute("x2")) -
              parseFloat(line.getAttribute("x1")),
            parseFloat(line.getAttribute("y2")) -
              parseFloat(line.getAttribute("y1")),
          );
          gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(line, {
            strokeDashoffset: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: hubRef.current,
              start: "top 65%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }

      /* Metrics chart draw */
      if (chartRef.current) {
        const paths = chartRef.current.querySelectorAll(".metric-line");
        paths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(path, {
            strokeDashoffset: 0,
            duration: 2.5,
            ease: "power1.inOut",
            scrollTrigger: {
              trigger: chartRef.current,
              start: "top 75%",
              toggleActions: "play none none reverse",
            },
          });
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-section="training"
      id="training"
      className="section-padding relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div ref={titleRef} className="text-center mb-16">
          <div className="font-mono text-xs text-cyan tracking-[0.3em] uppercase mb-4">
            Training Engine
          </div>
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white">
            Watch the <span className="text-cyan">Black Box</span> Think
          </h2>
          <p className="mt-4 text-text-dim font-mono text-sm max-w-lg mx-auto">
            Real-time visualization of your neural network training. See data
            flow, watch convergence, and understand your model.
          </p>
        </div>

        {/* Neural Hub */}
        <div
          ref={particleContainerRef}
          className="relative glass-panel rounded-3xl p-8 border border-base-border/30 mb-8"
          style={{ overflow: "hidden" }}
        >
          <div className="flex items-center gap-3 mb-6">
            <BrainCircuit size={20} className="text-violet" />
            <span className="font-mono text-sm text-text-dim">
              Neural Architecture — Live Feed
            </span>
            <div className="ml-auto flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-acid animate-pulse" />
              <span className="font-mono text-[10px] text-acid uppercase tracking-widest">
                Training
              </span>
            </div>
          </div>

          <NeuralHub hubRef={hubRef} />

          {/* Data Particles overlay */}
          <DataParticles containerRef={particleContainerRef} />
        </div>

        {/* Metrics */}
        <div className="glass-panel rounded-3xl p-8 border border-base-border/30">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-sm text-text-dim">
              Training Metrics — Epoch 1→20
            </span>
          </div>
          <MetricsChart chartRef={chartRef} />
        </div>
      </div>
    </section>
  );
}

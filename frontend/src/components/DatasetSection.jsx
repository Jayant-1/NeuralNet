import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Image, FileText, Music, Table2, Video, Puzzle } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

/* ── Sparkline SVG ── */
function Sparkline({ data, color, width = 120, height = 40 }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#spark-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Dataset cards ── */
const DATASETS = [
  {
    id: 'images',
    label: 'Image Sets',
    desc: 'High-res labeled image collections for vision models',
    icon: Image,
    color: '#00F2FF',
    count: '2.4M',
    size: 'wide',
    data: [10, 25, 18, 35, 42, 38, 55, 48, 62, 70, 65, 78],
  },
  {
    id: 'text',
    label: 'Text Corpora',
    desc: 'Tokenized NLP datasets',
    icon: FileText,
    color: '#8A2BE2',
    count: '8.1M',
    size: 'small',
    data: [20, 30, 25, 45, 40, 55, 50, 65, 60, 75, 70, 80],
  },
  {
    id: 'audio',
    label: 'Audio Samples',
    desc: 'Waveform & spectrogram data',
    icon: Music,
    color: '#FF6B00',
    count: '560K',
    size: 'small',
    data: [5, 15, 12, 28, 22, 35, 30, 40, 38, 45, 42, 50],
  },
  {
    id: 'tabular',
    label: 'Tabular Data',
    desc: 'Structured CSV, Parquet, and SQL datasets for classical ML',
    icon: Table2,
    color: '#00FF41',
    count: '12.7M',
    size: 'small',
    data: [30, 35, 28, 42, 38, 50, 45, 55, 52, 60, 58, 72],
  },
  {
    id: 'video',
    label: 'Video Streams',
    desc: 'Frame-level annotations',
    icon: Video,
    color: '#00F2FF',
    count: '180K',
    size: 'small',
    data: [8, 12, 15, 20, 18, 25, 22, 30, 28, 35, 32, 38],
  },
  {
    id: 'custom',
    label: 'Custom Loaders',
    desc: 'Your proprietary formats',
    icon: Puzzle,
    color: '#8A2BE2',
    count: '∞',
    size: 'wide',
    data: [10, 20, 15, 30, 25, 35, 30, 40, 35, 45, 40, 48],
  },
];

/* ── Tilt Card ── */
function DataCard({ dataset, cardRef }) {
  const innerRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e) => {
    const rect = innerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    innerRef.current.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`;
  };

  const handleMouseLeave = () => {
    setHovered(false);
    innerRef.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)';
  };

  const Icon = dataset.icon;

  /* Grid sizing */
  let gridClass = 'col-span-1 row-span-1';
  if (dataset.size === 'large') gridClass = 'col-span-1 sm:col-span-2 row-span-1';
  if (dataset.size === 'wide') gridClass = 'col-span-1 sm:col-span-2 row-span-1';

  return (
    <div ref={cardRef} className={`${gridClass} opacity-0`}>
      <div
        ref={innerRef}
        data-hover
        onMouseEnter={() => setHovered(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="h-full glass-panel rounded-card p-6 transition-all duration-300 ease-out group"
        style={{
          borderColor: hovered ? `${dataset.color}40` : 'rgba(255,255,255,0.06)',
          borderWidth: '2px',
          boxShadow: hovered ? `0 0 40px ${dataset.color}15` : 'none',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{ background: `${dataset.color}12` }}
          >
            <Icon size={22} style={{ color: dataset.color }} />
          </div>
          <span className="font-mono text-xs px-3 py-1 rounded-full" style={{ color: dataset.color, background: `${dataset.color}10` }}>
            {dataset.count} rows
          </span>
        </div>

        {/* Content */}
        <h3 className="font-heading font-semibold text-white text-lg mb-2">{dataset.label}</h3>
        <p className="font-mono text-xs text-text-dim leading-relaxed mb-4">{dataset.desc}</p>

        {/* Sparkline on hover */}
        <div
          className="transition-all duration-500 overflow-hidden"
          style={{
            maxHeight: hovered ? '50px' : '0px',
            opacity: hovered ? 1 : 0,
          }}
        >
          <Sparkline data={dataset.data} color={dataset.color} width={dataset.size === 'large' || dataset.size === 'wide' ? 200 : 120} />
        </div>

        {/* Bottom bar */}
        <div className="mt-auto pt-3 flex items-center gap-2">
          <div className="flex-1 h-px" style={{ background: `${dataset.color}15` }} />
          <span className="font-mono text-[10px] text-text-dim uppercase tracking-widest">
            {hovered ? 'Previewing' : 'Ready'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DatasetSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        y: 50, opacity: 0, duration: 1, ease: 'power3.out',
      });

      cardRefs.current.forEach((el, i) => {
        if (!el) return;
        gsap.to(el, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          delay: i * 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
        });
        gsap.set(el, { y: 40 });
      });
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      data-section="dataset"
      id="datasets"
      className="section-padding relative overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Title */}
        <div ref={titleRef} className="text-center mb-16">
          <div className="font-mono text-xs text-action tracking-[0.3em] uppercase mb-4">
            Dataset Hub
          </div>
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white">
            Your Data. <span className="text-action">Organized.</span>
          </h2>
          <p className="mt-4 text-text-dim font-mono text-sm max-w-md mx-auto">
            Browse, preview, and connect datasets to your pipeline with a single click.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[260px]">
          {DATASETS.map((ds, i) => (
            <DataCard
              key={ds.id}
              dataset={ds}
              cardRef={(el) => (cardRefs.current[i] = el)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

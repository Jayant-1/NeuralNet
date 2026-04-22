import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Terminal as TermIcon, Send, CheckCircle, Copy, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const API_REQUEST = `$ curl -X POST https://api.neuralnet.studio/v1/predict \\
  -H "Authorization: Bearer nn_live_sk_***" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "sentiment-v3",
    "input": "NeuralNet Studio is incredible!"
  }'`;

const API_RESPONSE = `{
  "id": "pred_9f8a2c1b",
  "model": "sentiment-v3",
  "status": "success",
  "result": {
    "label": "positive",
    "confidence": 0.974,
    "latency_ms": 23
  }
}`;

function TerminalWindow({ children, title }) {
  return (
    <div className="rounded-2xl overflow-hidden border border-base-border/40"
      style={{ background: 'rgba(11,11,15,0.7)', backdropFilter: 'blur(16px)' }}>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-base-border/30">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/70" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
          <div className="w-3 h-3 rounded-full bg-green-500/70" />
        </div>
        <span className="font-mono text-xs text-text-dim ml-2">{title}</span>
        <TermIcon size={14} className="text-text-dim ml-auto" />
      </div>
      <div className="relative p-6 overflow-hidden">{children}</div>
    </div>
  );
}

export default function DeploymentSection() {
  const sectionRef = useRef(null);
  const titleRef = useRef(null);
  const termRef = useRef(null);
  const waveRef = useRef(null);
  const [fired, setFired] = useState(false);
  const [showResp, setShowResp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(titleRef.current, {
        scrollTrigger: { trigger: sectionRef.current, start: 'top 80%', toggleActions: 'play none none reverse' },
        y: 50, opacity: 0, duration: 1, ease: 'power3.out',
      });
      gsap.from(termRef.current, {
        scrollTrigger: { trigger: termRef.current, start: 'top 85%', toggleActions: 'play none none reverse' },
        y: 40, opacity: 0, duration: 0.8, ease: 'power3.out', delay: 0.2,
      });
    }, sectionRef);
    return () => ctx.revert();
  }, []);

  const handleTest = () => {
    if (fired) return;
    setFired(true);
    const w = waveRef.current;
    if (w) {
      gsap.set(w, { scaleX: 0, opacity: 1 });
      gsap.to(w, { scaleX: 1, duration: 0.6, ease: 'power2.out',
        onComplete: () => { setShowResp(true); gsap.to(w, { opacity: 0, duration: 0.8, delay: 0.3 }); }
      });
    }
  };

  const handleCopy = () => { navigator.clipboard?.writeText(API_RESPONSE); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const handleReset = () => { setFired(false); setShowResp(false); };

  const hlJSON = (json) => json.split('\n').map((line, i) => {
    let h = line
      .replace(/"([^"]+)":/g, '<span style="color:#00F2FF">"$1"</span>:')
      .replace(/: "([^"]+)"/g, ': <span style="color:#00FF41">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span style="color:#FF6B00">$1</span>');
    return (<div key={i} className="flex"><span className="text-text-dim/30 select-none w-6 text-right mr-4">{i+1}</span><span dangerouslySetInnerHTML={{__html:h}}/></div>);
  });

  return (
    <section ref={sectionRef} data-section="deployment" id="deploy" className="section-padding relative overflow-hidden">
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.03] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #00FF41, transparent 70%)' }} />
      <div className="max-w-4xl mx-auto">
        <div ref={titleRef} className="text-center mb-16">
          <div className="font-mono text-xs text-acid tracking-[0.3em] uppercase mb-4">Deployment</div>
          <h2 className="font-heading font-bold text-4xl md:text-5xl lg:text-6xl text-white">
            Ship It. <span className="text-acid">Instantly.</span>
          </h2>
          <p className="mt-4 text-text-dim font-mono text-sm max-w-md mx-auto">
            One click to deploy. Production-ready API endpoints with monitoring, caching, and auto-scaling.
          </p>
        </div>
        <div ref={termRef}>
          <TerminalWindow title="neuralnet-studio — api-test">
            <div ref={waveRef} className="absolute inset-0 pointer-events-none"
              style={{ background:'linear-gradient(90deg,transparent,rgba(0,255,65,0.08) 20%,rgba(0,255,65,0.15) 50%,rgba(0,255,65,0.08) 80%,transparent)', transformOrigin:'left center', scaleX:0, opacity:0, zIndex:5 }} />
            {!showResp ? (
              <div className="font-mono text-sm leading-relaxed">
                {API_REQUEST.split('\n').map((line,i)=>(<div key={i} className="flex"><span className="text-text-dim/30 select-none w-6 text-right mr-4">{i+1}</span><span className={line.startsWith('$')?'text-acid':'text-text-dim'}>{line}</span></div>))}
                {fired && !showResp && (<div className="mt-4 flex items-center gap-2 text-cyan"><div className="w-2 h-2 rounded-full bg-cyan animate-pulse"/><span className="text-xs">Sending request...</span></div>)}
              </div>
            ) : (
              <div className="font-mono text-sm leading-relaxed">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><CheckCircle size={16} className="text-acid"/><span className="text-acid text-xs font-bold uppercase tracking-widest">200 OK</span><span className="text-text-dim text-xs">• 23ms</span></div>
                  <button data-hover onClick={handleCopy} className="flex items-center gap-1 text-text-dim hover:text-cyan transition-colors text-xs"><Copy size={12}/>{copied?'Copied!':'Copy'}</button>
                </div>
                {hlJSON(API_RESPONSE)}
              </div>
            )}
          </TerminalWindow>
          <div className="flex items-center justify-center gap-4 mt-8">
            {!fired ? (
              <button data-hover="launch" onClick={handleTest} className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-acid/10 border-2 border-acid/30 text-acid font-mono text-sm font-semibold hover:bg-acid/20 transition-all duration-300">
                <Send size={16} className="group-hover:translate-x-1 transition-transform"/>Test API
              </button>
            ) : (
              <div className="flex gap-4">
                <button data-hover onClick={handleReset} className="px-6 py-3 rounded-2xl border border-base-border/50 text-text-dim font-mono text-sm hover:text-white transition-all">Reset</button>
                <button data-hover="launch" className="group flex items-center gap-3 px-8 py-4 rounded-2xl bg-acid/10 border-2 border-acid/30 text-acid font-mono text-sm font-semibold hover:bg-acid/20 transition-all">
                  <Rocket size={16} className="group-hover:-translate-y-1 transition-transform"/>Deploy to Production
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

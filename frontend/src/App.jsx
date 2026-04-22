import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import WorkspaceSection from './components/WorkspaceSection';
import DatasetSection from './components/DatasetSection';
import TrainingSection from './components/TrainingSection';
import DeploymentSection from './components/DeploymentSection';
import Footer from './components/Footer';

gsap.registerPlugin(ScrollTrigger);

/* ── Section color map for mouse follower ── */
const SECTION_COLORS = {
  hero: '#00F2FF',
  workspace: '#8A2BE2',
  dataset: '#FF6B00',
  training: '#00F2FF',
  deployment: '#00FF41',
};

export default function App() {
  const cursorRef = useRef(null);
  const followerRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const cursorPos = useRef({ x: -100, y: -100 });
  const followerPos = useRef({ x: -100, y: -100 });
  const [followerColor, setFollowerColor] = useState(SECTION_COLORS.hero);

  /* ── Custom cursor + mouse follower ── */
  useEffect(() => {
    const onMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = () => cursorRef.current?.classList.add('clicking');
    const onUp = () => cursorRef.current?.classList.remove('clicking');

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    /* hover detection */
    const onOver = (e) => {
      const el = e.target.closest('a, button, [data-hover]');
      if (el) {
        cursorRef.current?.classList.add('hovering');
        if (el.dataset.hover === 'launch') {
          cursorRef.current?.classList.add('hovering-launch');
        }
      }
    };
    const onOut = (e) => {
      const el = e.target.closest('a, button, [data-hover]');
      if (el) {
        cursorRef.current?.classList.remove('hovering', 'hovering-launch');
      }
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    /* animation loop */
    let raf;
    const loop = () => {
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.2;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.2;
      followerPos.current.x += (mousePos.current.x - followerPos.current.x) * 0.06;
      followerPos.current.y += (mousePos.current.y - followerPos.current.y) * 0.06;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(${cursorPos.current.x - 10}px, ${cursorPos.current.y - 10}px)`;
      }
      if (followerRef.current) {
        followerRef.current.style.transform = `translate(${followerPos.current.x - 250}px, ${followerPos.current.y - 250}px)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ── Section observer for follower color ── */
  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const name = entry.target.dataset.section;
            if (SECTION_COLORS[name]) setFollowerColor(SECTION_COLORS[name]);
          }
        });
      },
      { threshold: 0.3 }
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Custom cursor */}
      <div ref={cursorRef} className="custom-cursor" />

      {/* Mouse follower glow */}
      <div
        ref={followerRef}
        className="mouse-follower"
        style={{ background: followerColor }}
      />

      {/* Nav */}
      <Navbar />

      {/* Sections */}
      <main>
        <HeroSection />
        <WorkspaceSection />
        <DatasetSection />
        <TrainingSection />
        <DeploymentSection />
      </main>

      <Footer />
    </>
  );
}

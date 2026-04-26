import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/store";

import Navbar from "./components/Navbar";
import DashboardPage from "./pages/DashboardPage";
import DatasetsPage from "./pages/DatasetsPage";
import DeploymentsPage from "./pages/DeploymentsPage";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import SettingsPage from "./pages/SettingsPage";
import SignupPage from "./pages/SignupPage";

gsap.registerPlugin(ScrollTrigger);

/* ── Auth guard ── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore();
  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: "#0B0B0F" }}
      >
        <div className="w-8 h-8 border-2 border-cyan/30 border-t-cyan rounded-full animate-spin" />
      </div>
    );
  }
  return user ? children : <Navigate to="/login" replace />;
}

/* ── Section color map for mouse follower ── */
const SECTION_COLORS = {
  hero: "#00F2FF",
  workspace: "#8A2BE2",
  dataset: "#FF6B00",
  training: "#00F2FF",
  deployment: "#00FF41",
};

export default function App() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAuth =
    location.pathname === "/login" || location.pathname === "/signup";
  const [customCursorEnabled, setCustomCursorEnabled] = useState(
    () => localStorage.getItem("nn_pref_custom_cursor") !== "false",
  );
  const [reduceMotion, setReduceMotion] = useState(
    () => localStorage.getItem("nn_pref_reduce_motion") === "true",
  );
  const showFollower =
    (isLanding || isAuth) && customCursorEnabled && !reduceMotion;
  const cursorRef = useRef(null);
  const followerRef = useRef(null);
  const mousePos = useRef({ x: -100, y: -100 });
  const cursorPos = useRef({ x: -100, y: -100 });
  const followerPos = useRef({ x: -100, y: -100 });
  const [followerColor, setFollowerColor] = useState(SECTION_COLORS.hero);
  const { setUser, setLoading } = useAuthStore();

  /* ── Restore auth session ── */
  useEffect(() => {
    const storedUser = localStorage.getItem("ll_user");
    const storedToken = localStorage.getItem("ll_token");
    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("ll_user");
        localStorage.removeItem("ll_token");
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const updatePrefs = () => {
      setCustomCursorEnabled(
        localStorage.getItem("nn_pref_custom_cursor") !== "false",
      );
      setReduceMotion(localStorage.getItem("nn_pref_reduce_motion") === "true");
    };

    const handlePrefsChanged = (e) => {
      if (e.detail?.customCursorEnabled !== undefined) {
        setCustomCursorEnabled(e.detail.customCursorEnabled);
      }
      if (e.detail?.reduceMotion !== undefined) {
        setReduceMotion(e.detail.reduceMotion);
      }
    };

    window.addEventListener("storage", updatePrefs);
    window.addEventListener("focus", updatePrefs);
    window.addEventListener("nn-prefs-changed", handlePrefsChanged);
    updatePrefs();

    return () => {
      window.removeEventListener("storage", updatePrefs);
      window.removeEventListener("focus", updatePrefs);
      window.removeEventListener("nn-prefs-changed", handlePrefsChanged);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle(
      "use-custom-cursor",
      customCursorEnabled && !reduceMotion,
    );
    document.body.classList.toggle("pref-reduced-motion", reduceMotion);
  }, [customCursorEnabled, reduceMotion]);

  /* ── Custom cursor + mouse follower ── */
  useEffect(() => {
    if (!customCursorEnabled || reduceMotion) return;

    const onMove = (e) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    const onDown = () => cursorRef.current?.classList.add("clicking");
    const onUp = () => cursorRef.current?.classList.remove("clicking");

    const onOver = (e) => {
      const el = e.target.closest("a, button, [data-hover]");
      if (el) {
        cursorRef.current?.classList.add("hovering");
        if (el.dataset.hover === "launch")
          cursorRef.current?.classList.add("hovering-launch");
      }
    };
    const onOut = (e) => {
      const el = e.target.closest("a, button, [data-hover]");
      if (el)
        cursorRef.current?.classList.remove("hovering", "hovering-launch");
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    let raf;
    const loop = () => {
      cursorPos.current.x += (mousePos.current.x - cursorPos.current.x) * 0.2;
      cursorPos.current.y += (mousePos.current.y - cursorPos.current.y) * 0.2;
      followerPos.current.x +=
        (mousePos.current.x - followerPos.current.x) * 0.06;
      followerPos.current.y +=
        (mousePos.current.y - followerPos.current.y) * 0.06;
      if (cursorRef.current)
        cursorRef.current.style.transform = `translate(${cursorPos.current.x - 10}px, ${cursorPos.current.y - 10}px)`;
      if (followerRef.current && showFollower)
        followerRef.current.style.transform = `translate(${followerPos.current.x - 250}px, ${followerPos.current.y - 250}px)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      cancelAnimationFrame(raf);
    };
  }, [showFollower, customCursorEnabled, reduceMotion]);

  /* ── Section observer for follower color (landing only) ── */
  useEffect(() => {
    if (!isLanding) return;
    const sections = document.querySelectorAll("[data-section]");
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const name = entry.target.dataset.section;
            if (SECTION_COLORS[name]) setFollowerColor(SECTION_COLORS[name]);
          }
        });
      },
      { threshold: 0.3 },
    );
    sections.forEach((s) => obs.observe(s));
    return () => obs.disconnect();
  }, [isLanding]);

  return (
    <>
      {/* Global custom cursor */}
      {customCursorEnabled && !reduceMotion && (
        <div ref={cursorRef} className="custom-cursor" />
      )}
      {/* Glow Follower only on specific pages */}
      {showFollower && (
        <div
          ref={followerRef}
          className="mouse-follower"
          style={{ background: isAuth ? "#8A2BE2" : followerColor }}
        />
      )}

      {/* Landing-only overlays */}
      {isLanding && (
        <>
          <div className="grain-overlay" />
          <Navbar />
        </>
      )}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/datasets"
          element={
            <ProtectedRoute>
              <DatasetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deployments"
          element={
            <ProtectedRoute>
              <DeploymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <ProtectedRoute>
              <ProjectWorkspace />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

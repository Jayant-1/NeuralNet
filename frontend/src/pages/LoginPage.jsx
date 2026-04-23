import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/store";

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      localStorage.setItem("ll_token", data.token);
      localStorage.setItem("ll_user", JSON.stringify(data.user));
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#0B0B0F]">
      {/* Background Effects */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute w-[800px] h-[800px] rounded-full blur-[120px] bg-cyan/10 -top-[20%] -left-[10%] animate-pulse"></div>
        <div className="absolute w-[600px] h-[600px] rounded-full blur-[100px] bg-violet/10 -bottom-[10%] -right-[10%] animate-breathe"></div>
        <div className="grain-overlay" />
      </div>

      <div className="relative z-10 w-full max-w-md mx-auto px-6 animate-fade-in-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <Link to="/">
            <BrandLogo textSize="text-3xl"   />
          </Link>
        </div>

        {/* Card */}
        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan via-violet to-acid opacity-50"></div>

          <h2 className="text-2xl font-bold font-heading text-white mb-2 text-center">
            Welcome back
          </h2>
          <p className="text-dim text-sm text-center mb-8">
            Sign in to your account to continue
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">
                Email
              </label>
              <input
                type="email"
                className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all duration-300 font-mono placeholder:text-[#6B6B80]/50"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full bg-[#12121A] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all duration-300 font-mono placeholder:text-[#6B6B80]/50"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-cyan transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-8 py-3.5 px-6 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 hover:border-cyan hover:shadow-[0_0_20px_rgba(0,242,255,0.2)] transition-all duration-300 font-mono flex items-center justify-center gap-2 font-medium group"
              disabled={loading}
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Sign In{" "}
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-dim">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-cyan hover:text-white transition-colors ml-1"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

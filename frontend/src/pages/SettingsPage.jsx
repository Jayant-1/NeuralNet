import React, { useState } from "react";
import Sidebar from "../components/Sidebar";
import { User, Shield, Lock, AlertTriangle, Save, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/store";
import { authApi } from "../services/api";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const SettingsPage = () => {
  const { user, setUser, logout } = useAuthStore();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const handleUpdateProfile = async () => {
    setLoadingProfile(true);
    try {
      await authApi.updateProfile(fullName);
      // Update local user state
      const updatedUser = { ...user, full_name: fullName };
      setUser(updatedUser);
      localStorage.setItem("ll_user", JSON.stringify(updatedUser));
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update profile");
    }
    setLoadingProfile(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    setLoadingPassword(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    }
    setLoadingPassword(false);
  };

  const handleDeleteAccount = async () => {
    setLoadingDelete(true);
    try {
      await authApi.deleteAccount();
      toast.success("Account deleted. Goodbye!");
      localStorage.removeItem("ll_token");
      localStorage.removeItem("ll_user");
      logout();
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete account");
      setLoadingDelete(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#0B0B0F] overflow-hidden">
      <Sidebar activePage="settings" />

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/5 via-[#0B0B0F] to-[#0B0B0F]">
        <div className="grain-overlay" />

        <div className="max-w-4xl w-full mx-auto p-8 lg:p-12 z-10">
          <div className="mb-12 animate-fade-in-up">
            <h1 className="text-3xl font-heading font-bold text-white mb-2">
              Account <span className="gradient-text">Settings</span>
            </h1>
            <p className="text-dim text-sm">
              Manage your profile information and security settings.
            </p>
          </div>

          <div className="space-y-8 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            
            {/* Profile Section */}
            <section className="glass-panel p-8 rounded-3xl border border-white/5">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <User className="text-cyan" size={24} />
                <h2 className="text-xl font-heading font-bold text-white">Profile Information</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">Email Address</label>
                  <input
                    type="email"
                    defaultValue={user?.email}
                    disabled
                    className="w-full bg-[#1A1A28]/50 border border-[#2A2A3A]/50 rounded-xl px-4 py-3 text-sm text-dim cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loadingProfile}
                  className="px-6 py-2.5 rounded-xl bg-cyan/10 text-cyan border border-cyan/30 hover:bg-cyan/20 transition-colors font-mono text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={16} />
                  {loadingProfile ? "Saving..." : "Update Profile"}
                </button>
              </div>
            </section>

            {/* Password Section */}
            <section className="glass-panel p-8 rounded-3xl border border-white/5">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                <Lock className="text-violet" size={24} />
                <h2 className="text-xl font-heading font-bold text-white">Change Password</h2>
              </div>
              
              <div className="space-y-4 max-w-md mb-6">
                <div>
                  <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-dim uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl px-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-violet focus:ring-1 focus:ring-violet transition-all"
                  />
                </div>
              </div>
              <div className="flex justify-start">
                <button 
                  onClick={handleChangePassword}
                  disabled={loadingPassword}
                  className="px-6 py-2.5 rounded-xl bg-violet/10 text-violet border border-violet/30 hover:bg-violet/20 transition-colors font-mono text-sm font-bold flex items-center gap-2 disabled:opacity-50"
                >
                  <Shield size={16} />
                  {loadingPassword ? "Updating..." : "Change Password"}
                </button>
              </div>
            </section>

            {/* Danger Zone Section */}
            <section className="glass-panel border-red-500/20 bg-red-500/5 p-8 rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-400" size={24} />
                <h2 className="text-xl font-heading font-bold text-white">Danger Zone</h2>
              </div>
              <p className="text-sm text-dim mb-6">
                Once you delete your account, there is no going back. Please be certain.
              </p>
              
              {!showDeleteConfirm ? (
                <button 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-6 py-2.5 rounded-xl border border-red-500/50 text-red-400 hover:bg-red-500/10 transition-colors font-mono text-sm font-bold flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Delete Account
                </button>
              ) : (
                <div className="p-4 rounded-xl border border-red-500/50 bg-black/40">
                  <p className="text-sm text-white mb-4">
                    Are you absolutely sure? This will permanently delete your account, projects, datasets, and deployed models.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-4 py-2 rounded-xl text-dim hover:text-white hover:bg-white/5 transition-colors font-mono text-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleDeleteAccount}
                      disabled={loadingDelete}
                      className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-colors font-mono text-sm font-bold disabled:opacity-50"
                    >
                      {loadingDelete ? "Deleting..." : "Yes, Delete My Account"}
                    </button>
                  </div>
                </div>
              )}
            </section>

          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;

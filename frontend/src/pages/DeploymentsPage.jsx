import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { Search, Cpu, CheckCircle2, Globe, Key } from "lucide-react";
import { deploymentApi } from "../services/api";
import toast from "react-hot-toast";

const DeploymentsPage = () => {
  const [deployments, setDeployments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadDeployments();
  }, []);

  const loadDeployments = async () => {
    try {
      const { data } = await deploymentApi.list();
      setDeployments(data || []);
    } catch (err) {
      toast.error("Failed to load deployments");
      // Fallback mock
      setDeployments([
        { model_id: "a9da1f0c", endpoint_url: "/api/predict/a9da1f0c", api_key: "ll_b3...", is_active: true }
      ]);
    }
    setLoading(false);
  };

  const filteredDeployments = deployments.filter((d) =>
    (d.model_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#0B0B0F] overflow-hidden">
      <Sidebar activePage="deployments" />

      <main className="flex-1 flex flex-col h-full overflow-y-auto relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan/5 via-[#0B0B0F] to-[#0B0B0F]">
        <div className="grain-overlay" />

        <div className="max-w-6xl w-full mx-auto p-8 lg:p-12 z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 animate-fade-in-up">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl font-heading font-bold text-white mb-2">
                Active <span className="gradient-text">Deployments</span>
              </h1>
              <p className="text-dim text-sm">
                Monitor and manage your deployed model endpoints.
              </p>
            </div>
          </div>

          <div
            className="relative mb-8 max-w-md text-dim animate-fade-in-up"
            style={{ animationDelay: "0.05s" }}
          >
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2"
            />
            <input
              type="text"
              placeholder="Search deployments by Model ID..."
              className="w-full bg-[#1A1A28] border border-[#2A2A3A] rounded-xl pl-10 pr-4 py-3 text-sm text-[#E0E0E8] focus:outline-none focus:border-cyan focus:ring-1 focus:ring-cyan transition-all font-mono placeholder:text-[#6B6B80]/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {loading ? (
               <div className="text-dim animate-pulse">Loading deployments...</div>
            ) : filteredDeployments.length > 0 ? (
              filteredDeployments.map((dep, idx) => (
                <div
                  key={dep.model_id || idx}
                  className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-acid/30 transition-all duration-300 group flex flex-col h-full animate-fade-in-up relative overflow-hidden"
                  style={{ animationDelay: `${0.05 * (idx + 1)}s` }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-acid/50 transition-all duration-500"></div>
                  
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-acid/10 border border-acid/20 text-acid flex items-center justify-center">
                        <Cpu size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold font-heading text-white">
                          Model {dep.model_id}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs font-mono text-acid mt-1">
                          <CheckCircle2 size={12} /> Active Endpoint
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 flex-1">
                    <div className="glass-panel bg-black/40 p-3 rounded-lg border border-white/5">
                      <div className="text-[10px] text-dim uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                        <Globe size={12} /> Endpoint URL
                      </div>
                      <div className="text-sm text-cyan font-mono truncate">
                        {dep.endpoint_url}
                      </div>
                    </div>

                    <div className="glass-panel bg-black/40 p-3 rounded-lg border border-white/5">
                      <div className="text-[10px] text-dim uppercase tracking-wider font-mono mb-1 flex items-center gap-1">
                        <Key size={12} /> API Key
                      </div>
                      <div className="text-sm text-[#E0E0E8] font-mono blur-[2px] hover:blur-none transition-all cursor-pointer">
                        {dep.api_key}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full glass-panel border-dashed border-2 border-[#2A2A3A] rounded-3xl p-16 flex flex-col items-center justify-center text-center animate-fade-in-up">
                <Cpu size={40} className="text-dim mb-4" />
                <h3 className="text-white font-heading font-bold mb-2">No Deployments Found</h3>
                <p className="text-dim text-sm max-w-md">
                  Train a model from the project workspace and deploy it to see it listed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DeploymentsPage;

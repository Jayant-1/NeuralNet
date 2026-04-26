import {
  Activity,
  BarChart3,
  CheckCircle2,
  Code,
  FileText,
  Table,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTrainingStore } from "../../store/store";

const TrainingResults = ({ projectId }) => {
  const { metrics, status, compiledCode, modelSummary, modelId } =
    useTrainingStore();

  const lastMetric = metrics.length > 0 ? metrics[metrics.length - 1] : null;

  const statusBadge = {
    idle: {
      class: "bg-white/5 text-dim border-white/10",
      label: "Not Started",
    },
    running: {
      class: "bg-cyan/10 text-cyan border-cyan/30 animate-pulse",
      label: "Training...",
    },
    completed: {
      class: "bg-green-500/10 text-green-400 border-green-500/30",
      label: "Completed",
    },
    failed: {
      class: "bg-red-500/10 text-red-400 border-red-500/30",
      label: "Failed",
    },
  };
  const st = statusBadge[status] || statusBadge.idle;

  return (
    <div className="max-w-5xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-4xl font-heading font-black text-white mb-2 tracking-tight">
            RESULTS
          </h2>
          <p className="text-white text-base leading-relaxed">
            Real-time training metrics: accuracy, loss, and convergence analysis
            per epoch with comparative validation performance.
          </p>
        </div>
        <div className="flex gap-3 items-center">
          {modelId && (
            <span className="px-3 py-1.5 rounded-lg border border-violet/30 bg-violet/10 text-violet font-mono text-xs font-bold tracking-wider">
              MODEL: {modelId.substring(0, 8)}...
            </span>
          )}
          <span
            className={`px-3 py-1.5 rounded-lg border font-mono text-xs font-bold tracking-wider uppercase ${st.class}`}
          >
            {st.label}
          </span>
        </div>
      </div>

      {lastMetric && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center mb-2">
              <TrendingUp size={20} />
            </div>
            <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">
              Train Accuracy
            </div>
            <div className="text-xl font-bold text-white">
              {(lastMetric.train_acc * 100).toFixed(1)}%
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2">
              <CheckCircle2 size={20} />
            </div>
            <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">
              Val Accuracy
            </div>
            <div className="text-xl font-bold text-white">
              {(lastMetric.val_acc * 100).toFixed(1)}%
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mb-2">
              <TrendingDown size={20} />
            </div>
            <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">
              Train Loss
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {lastMetric.train_loss}
            </div>
          </div>
          <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-xl bg-orange-400/10 text-orange-400 flex items-center justify-center mb-2">
              <Activity size={20} />
            </div>
            <div className="text-xs text-dim font-mono uppercase tracking-wider mb-1">
              Val Loss
            </div>
            <div className="text-xl font-bold text-white font-mono">
              {lastMetric.val_loss}
            </div>
          </div>
        </div>
      )}

      {metrics.length > 0 ? (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accuracy Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">
                Accuracy per Epoch
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={metrics}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="accGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00f2ff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="accGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8a2be2" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8a2be2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="epoch"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={[0, 1]}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B0B0F",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: 13,
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#64748b", marginBottom: 4 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="train_acc"
                    stroke="#00f2ff"
                    fill="url(#accGrad1)"
                    strokeWidth={2}
                    name="Train Acc"
                    dot={false}
                    activeDot={{ r: 4, fill: "#00f2ff", strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="val_acc"
                    stroke="#8a2be2"
                    fill="url(#accGrad2)"
                    strokeWidth={2}
                    name="Val Acc"
                    dot={false}
                    activeDot={{ r: 4, fill: "#8a2be2", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Loss Chart */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10">
              <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">
                Loss per Epoch
              </h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={metrics}
                  margin={{ top: 5, right: 0, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="lossGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="lossGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.05)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="epoch"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B0B0F",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px",
                      fontSize: 13,
                    }}
                    itemStyle={{ color: "#fff" }}
                    labelStyle={{ color: "#64748b", marginBottom: 4 }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: "12px", color: "#94a3b8" }}
                  />
                  <Area
                    type="monotone"
                    dataKey="train_loss"
                    stroke="#ef4444"
                    fill="url(#lossGrad1)"
                    strokeWidth={2}
                    name="Train Loss"
                    dot={false}
                    activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="val_loss"
                    stroke="#f59e0b"
                    fill="url(#lossGrad2)"
                    strokeWidth={2}
                    name="Val Loss"
                    dot={false}
                    activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 0 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Epoch History Table */}
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-[#12121A]">
              <Table size={18} className="text-cyan" />
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Training History
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-mono text-dim uppercase bg-[#0B0B0F]">
                  <tr>
                    <th className="px-6 py-4 font-semibold tracking-wider">
                      Epoch
                    </th>
                    <th className="px-6 py-4 font-semibold text-right tracking-wider">
                      Train Loss
                    </th>
                    <th className="px-6 py-4 font-semibold text-right tracking-wider">
                      Val Loss
                    </th>
                    <th className="px-6 py-4 font-semibold text-right tracking-wider">
                      Train Acc
                    </th>
                    <th className="px-6 py-4 font-semibold text-right tracking-wider">
                      Val Acc
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {metrics.map((m) => (
                    <tr
                      key={m.epoch}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-white">
                        {m.epoch}
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-red-300">
                        {m.train_loss}
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-orange-300">
                        {m.val_loss}
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-cyan">
                        {(m.train_acc * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 font-mono text-right text-violet">
                        {(m.val_acc * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Generated Code */}
          {compiledCode && (
            <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-5 border-b border-white/5 flex items-center gap-3 bg-[#12121A]">
                <Code size={18} className="text-acid" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  Generated Keras Code (AST)
                </h4>
              </div>
              <div className="p-5 overflow-x-auto bg-[#050508]">
                <pre className="text-xs font-mono text-dim leading-relaxed select-text">
                  {compiledCode}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-16 text-center animate-fade-in-up border border-dashed border-white/10 rounded-3xl bg-[#12121A]">
          <div className="w-20 h-20 rounded-3xl bg-white/5 text-dim flex items-center justify-center mb-6">
            <BarChart3 size={40} />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            No training data yet
          </h3>
          <p className="text-dim">
            Start training from the Training Config tab to see metrics here.
          </p>
        </div>
      )}
    </div>
  );
};

export default TrainingResults;

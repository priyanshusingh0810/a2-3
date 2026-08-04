"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, HardDrive, Cpu, Lock, Sparkles, Key, CheckCircle2, 
  ArrowRight, Database, Folder, Moon, Sun, Loader2, Award, Zap
} from "lucide-react";
import api from "@/lib/api";

interface LocalOnboardingWizardProps {
  onComplete: () => void;
}

export const LocalOnboardingWizard: React.FC<LocalOnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState<"welcome" | "setup" | "license">("welcome");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup form states
  const [workspaceName, setWorkspaceName] = useState("My Company Analytics");
  const [userName, setUserName] = useState("John");
  const [password, setPassword] = useState("");
  const [selectedModel, setSelectedModel] = useState("llama3:latest");
  const [storageLocation, setStorageLocation] = useState("./data");
  const [theme, setTheme] = useState("dark");

  // License modal states
  const [licenseKey, setLicenseKey] = useState("");
  const [licenseSuccess, setLicenseSuccess] = useState("");

  // Hardware status
  const [hardware, setHardware] = useState<any>({
    cpu: "Optimal (Local Multi-Threading)",
    ram: "16 GB DDR4",
    storage: "Local SQLite (AES-256 Encrypted)",
    model: "Llama 3 (Local Ollama)"
  });

  const handleStartTrial = async () => {
    setLoading(true);
    setError("");
    try {
      await api.post("/onboarding/start-trial");
      setStep("setup");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to start local trial.");
    } finally {
      setLoading(false);
    }
  };

  const handleActivateLicense = async () => {
    if (!licenseKey) {
      setError("Please enter a valid license key.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/onboarding/activate-license", { license_key: licenseKey });
      setLicenseSuccess(res.data.message || "License activated successfully!");
      setTimeout(() => {
        setStep("setup");
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid license key.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/onboarding/setup", {
        workspace_name: workspaceName,
        user_name: userName,
        password: password || null,
        selected_model: selectedModel,
        storage_location: storageLocation,
        theme: theme
      });
      onComplete();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Setup wizard failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* STEP 1: WELCOME SCREEN */}
        {step === "welcome" && (
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full text-xs text-indigo-400 font-semibold">
              <Sparkles size={14} />
              <span>Enterprise Local AI Analytics</span>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                A3 Analytics
              </h1>
              <p className="mt-2 text-sm text-slate-400 font-medium">
                Private • Secure • Offline — Your data never leaves your computer.
              </p>
            </div>

            {/* Privacy Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {[
                { icon: ShieldCheck, title: "100% Local", desc: "On-Device Engine" },
                { icon: Lock, title: "No Cloud Upload", desc: "Strict Offline Privacy" },
                { icon: Zap, title: "Offline AI", desc: "Local Ollama LLM" },
                { icon: HardDrive, title: "AES-256 Storage", desc: "Encrypted SQLite" }
              ].map((badge, idx) => (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3.5 flex flex-col items-center text-center">
                  <badge.icon size={18} className="text-indigo-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">{badge.title}</span>
                  <span className="text-[10px] text-slate-500 mt-0.5">{badge.desc}</span>
                </div>
              ))}
            </div>

            {/* Hardware Status Badge */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Cpu size={14} className="text-indigo-400" />
                Hardware Environment Detected
              </h4>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <div><span className="text-slate-500">CPU Status:</span> {hardware.cpu}</div>
                <div><span className="text-slate-500">RAM Allocated:</span> {hardware.ram}</div>
                <div><span className="text-slate-500">Local Storage:</span> {hardware.storage}</div>
                <div><span className="text-slate-500">AI Model Engine:</span> {hardware.model}</div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleStartTrial}
                disabled={loading}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Award size={16} />}
                Start 14-Day Free Trial
              </button>

              <button
                onClick={() => setStep("license")}
                className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-700 transition-all"
              >
                <Key size={16} className="text-purple-400" />
                Activate License
              </button>

              <button
                onClick={() => setStep("setup")}
                className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold px-6 py-3 rounded-xl text-sm flex items-center justify-center gap-2 border border-slate-800 transition-all"
              >
                Continue Offline
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP: LICENSE ACTIVATION */}
        {step === "license" && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Key className="text-indigo-400" />
                Activate Enterprise License
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your signed license key (`A3LIC-*`). License checks are cached locally for offline execution.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="A3LIC-ENTERPRISE-2026-KEY"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
              />

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                  {error}
                </div>
              )}

              {licenseSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {licenseSuccess}
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => setStep("welcome")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>

              <button
                onClick={handleActivateLicense}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Activate Now
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: SETUP WIZARD */}
        {step === "setup" && (
          <form onSubmit={handleCompleteSetup} className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Database className="text-indigo-400" />
                First-Time Local Setup
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Configure your local workspace parameters. Everything remains stored on-device.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">User Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Optional Local Password</label>
                <input
                  type="password"
                  placeholder="Leave blank for instant auto-login"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Local AI Engine</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="llama3:latest">Llama 3 (Local Ollama - Recommended)</option>
                  <option value="qwen2.5:latest">Qwen 2.5 (Fast Analysis)</option>
                  <option value="deepseek-r1:latest">DeepSeek R1 (Advanced Reasoning)</option>
                  <option value="mistral:latest">Mistral 7B (General)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Storage Location</label>
                <input
                  type="text"
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Interface Theme</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs flex items-center justify-center gap-1.5 font-medium ${
                      theme === "dark" ? "bg-indigo-600/20 border-indigo-500 text-indigo-300" : "bg-slate-950 border-slate-800 text-slate-400"
                    }`}
                  >
                    <Moon size={14} /> Dark Mode
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                {error}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep("welcome")}
                className="text-xs text-slate-400 hover:text-white"
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Initialize Workspace
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default LocalOnboardingWizard;

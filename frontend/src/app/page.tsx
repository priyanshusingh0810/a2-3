'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard,
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2,
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download,
  Settings, ChevronDown, Plus, X
} from 'lucide-react';
import api from '@/lib/api';
import PreviewGrid from '@/components/preview-grid';
import ChartRenderer from '@/components/chart-renderer';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';
import { SignUpCard } from '@/components/ui/sign-up-card';
import { ForgotPasswordCard } from '@/components/ui/forgot-password-card';
import { ThemeToggle } from '@/components/theme-toggle';
import ModernLoginSignup from '@/components/ui/modern-login-signup';

// ─── TAB CONFIG ────────────────────────────────────────────────────
const TABS = [
  { id: 'upload',    icon: Upload,          label: 'Data Library' },
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'chat',      icon: MessageSquare,   label: 'AI Chat' },
  { id: 'forecast',  icon: LineChart,       label: 'Forecast' },
  { id: 'reports',   icon: FileText,        label: 'Reports' },
  { id: 'settings',  icon: Settings,        label: 'Settings' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function Home() {
  // ── Auth State ──────────────────────────────────────────────────
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser]         = useState<any>(null);
  const [authError, setAuthError]   = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ── App State ───────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabId>('upload');
  const [datasets, setDatasets]   = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset]     = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [analysisJob, setAnalysisJob] = useState<any>(null);
  const [dashboards, setDashboards]   = useState<any>(null);
  const [reports, setReports]         = useState<any[]>([]);
  const [globalLoading, setGlobalLoading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [datasetMenuOpen, setDatasetMenuOpen] = useState(false);

  // ── Cleaning State ──────────────────────────────────────────────
  const [cleaningOptions, setCleaningOptions] = useState({
    impute_missing: true, remove_duplicates: true,
    handle_outliers: true, drop_empty_columns: false,
  });
  const [cleaningLoading, setCleaningLoading] = useState(false);

  // ── Chat State ──────────────────────────────────────────────────
  const [conversations, setConversations]   = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages]     = useState<any[]>([]);
  const [chatInput, setChatInput]           = useState('');
  const [chatLoading, setChatLoading]       = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Report State ────────────────────────────────────────────────
  const [reportGenerating, setReportGenerating] = useState(false);

  // ── LLM Settings ────────────────────────────────────────────────
  const [llmProvider, setLlmProvider] = useState<'default'|'gemini'|'openai'|'ollama'|'mock'>('default');
  const [llmModel, setLlmModel]       = useState('');
  const [llmApiKey, setLlmApiKey]     = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{type:'success'|'error', text:string}|null>(null);

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Effects ─────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('a3_access_token');
    if (token) fetchCurrentUser();
  }, []);

  useEffect(() => {
    const handler = () => { setIsAuthenticated(false); setUser(null); setSelectedDatasetId(null); };
    window.addEventListener('auth_session_expired', handler);
    return () => window.removeEventListener('auth_session_expired', handler);
  }, []);

  useEffect(() => { if (isAuthenticated) fetchDatasets(); }, [isAuthenticated]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetDetails(selectedDatasetId);
      setChatMessages([]); setActiveConversationId(null);
    } else {
      setSelectedDataset(null); setPreviewData(null);
      setAnalysisJob(null); setDashboards(null); setReports([]);
    }
  }, [selectedDatasetId]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  useEffect(() => {
    if (analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running')) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => pollAnalysisJob(), 2500);
      }
    } else {
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    }
    return () => { if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; } };
  }, [analysisJob]);

  // ── API Handlers ────────────────────────────────────────────────
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data); setIsAuthenticated(true);
      if (res.data) {
        setLlmProvider(res.data.llm_provider || 'default');
        setLlmModel(res.data.llm_model || '');
        setLlmApiKey(res.data.llm_api_key || '');
      }
    } catch { localStorage.removeItem('a3_access_token'); localStorage.removeItem('a3_refresh_token'); }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        await fetchCurrentUser();
      } else if (authMode === 'register') {
        if (password !== confirmPassword) { setAuthError('Passwords do not match'); setAuthLoading(false); return; }
        await api.post('/auth/register', { email, password });
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        await fetchCurrentUser();
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed.');
    } finally { setAuthLoading(false); }
  };

  const handleGoogleAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setAuthError('Google Client ID is not configured.'); return;
    }
    setAuthError(''); setGoogleLoading(true);
    try {
      const google = (window as any).google;
      if (!google?.accounts?.oauth2) throw new Error('Google Identity Services failed to load.');
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId, scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse?.access_token) {
            try {
              const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
              localStorage.setItem('a3_access_token', res.data.access_token);
              localStorage.setItem('a3_refresh_token', res.data.refresh_token);
              await fetchCurrentUser();
            } catch (err: any) { setAuthError(err.response?.data?.detail || 'Google auth failed.'); }
            finally { setGoogleLoading(false); }
          } else { setGoogleLoading(false); }
        },
        error_callback: (error: any) => { setAuthError(error.message || 'OAuth error.'); setGoogleLoading(false); }
      });
      client.requestAccessToken();
    } catch (err: any) { setAuthError(err.message || 'Failed to initialize Google OAuth.'); setGoogleLoading(false); }
  };

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('a3_access_token'); localStorage.removeItem('a3_refresh_token');
    setIsAuthenticated(false); setUser(null); setSelectedDatasetId(null); setSelectedDataset(null);
  };

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/datasets/');
      setDatasets(res.data);
      if (res.data.length > 0 && !selectedDatasetId) setSelectedDatasetId(res.data[0].id);
    } catch (err) { console.error('Failed to load datasets', err); }
  };

  const fetchDatasetDetails = async (id: string) => {
    setGlobalLoading(true);
    try {
      const [datasetRes, previewRes, jobRes, reportsRes] = await Promise.all([
        api.get(`/datasets/${id}`),
        api.get(`/datasets/${id}/preview?limit=40`),
        api.get(`/datasets/${id}/job`),
        api.get(`/reports/list?dataset_id=${id}`),
      ]);
      setSelectedDataset(datasetRes.data); setPreviewData(previewRes.data);
      setAnalysisJob(jobRes.data); setReports(reportsRes.data);
      if (jobRes.data.status === 'completed') {
        const dashRes = await api.get(`/dashboards/${id}`);
        setDashboards(dashRes.data);
      }
      fetchConversations(id);
    } catch (err) { console.error('Failed to load dataset details', err); }
    finally { setGlobalLoading(false); }
  };

  const pollAnalysisJob = async () => {
    if (!selectedDatasetId) return;
    try {
      const res = await api.get(`/datasets/${selectedDatasetId}/job`);
      setAnalysisJob(res.data);
      if (res.data.status === 'completed') fetchDatasetDetails(selectedDatasetId);
    } catch (err) { console.error('Error polling job', err); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const formData = new FormData(); formData.append('file', file);
    setUploadProgress(true);
    try {
      const res = await api.post('/datasets/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await fetchDatasets(); setSelectedDatasetId(res.data.id); setActiveTab('upload');
    } catch (err: any) { alert(err.response?.data?.detail || 'Failed to parse file.'); }
    finally { setUploadProgress(false); }
  };

  const deleteDataset = async (id: string) => {
    if (!confirm('Delete this dataset? All chats and reports will be removed.')) return;
    try { await api.delete(`/datasets/${id}`); setSelectedDatasetId(null); await fetchDatasets(); }
    catch { alert('Failed to delete dataset'); }
  };

  const handleAutoClean = async () => {
    if (!selectedDatasetId) return; setCleaningLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/clean`, cleaningOptions);
      alert('Cleaning completed!'); await fetchDatasets(); setSelectedDatasetId(res.data.id);
    } catch { alert('Failed to run cleaning operations.'); }
    finally { setCleaningLoading(false); }
  };

  const fetchConversations = async (datasetId: string) => {
    try { const res = await api.get(`/chat/conversations?dataset_id=${datasetId}`); setConversations(res.data); }
    catch (err) { console.error(err); }
  };

  const loadConversation = async (convId: string) => {
    setChatLoading(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}`);
      setActiveConversationId(convId); setChatMessages(res.data.messages || []);
    } catch (err) { console.error(err); } finally { setChatLoading(false); }
  };

  const handleChatSubmit = async (e?: React.FormEvent, presetQuestion?: string) => {
    if (e) e.preventDefault();
    const queryText = presetQuestion || chatInput;
    if (!queryText.trim() || !selectedDatasetId) return;
    setChatMessages(prev => [...prev, { role: 'user', content: queryText }]);
    setChatInput(''); setChatLoading(true);
    try {
      const res = await api.post(`/chat/query?dataset_id=${selectedDatasetId}`, {
        question: queryText, conversation_id: activeConversationId || undefined,
      });
      setChatMessages(res.data.messages);
      if (!activeConversationId) { setActiveConversationId(res.data.conversation_id); fetchConversations(selectedDatasetId); }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err.response?.data?.detail || 'Failed to process query.'}` }]);
    } finally { setChatLoading(false); }
  };

  const handleGenerateReport = async () => {
    if (!selectedDatasetId) return; setReportGenerating(true);
    try {
      await api.post(`/reports/generate?dataset_id=${selectedDatasetId}`);
      const res = await api.get(`/reports/list?dataset_id=${selectedDatasetId}`);
      setReports(res.data); alert('Report compiled successfully.');
    } catch (err: any) { alert(err.response?.data?.detail || 'Failed to generate PDF.'); }
    finally { setReportGenerating(false); }
  };

  const handleDownloadReport = async (reportId: string, title: string) => {
    try {
      const res = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}.pdf`; link.click();
    } catch { alert('Failed to download PDF.'); }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); setSettingsLoading(true); setSettingsMessage(null);
    try {
      const res = await api.put('/auth/llm-settings', {
        llm_provider: llmProvider, llm_model: llmModel || null, llm_api_key: llmApiKey || null,
      });
      setUser(res.data); setLlmProvider(res.data.llm_provider || 'default');
      setLlmModel(res.data.llm_model || ''); setLlmApiKey(res.data.llm_api_key || '');
      setSettingsMessage({ type: 'success', text: 'LLM Settings updated successfully!' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update settings.' });
    } finally { setSettingsLoading(false); }
  };

  // ─────────────────────────────────────────────────────────────────
  // ── PANEL RENDERERS ──────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────

  const renderUpload = () => {
    if (!selectedDataset) return (
      <div className="relative w-full min-h-[75vh] flex flex-col items-center justify-center py-20 text-center overflow-hidden">
        
        {/* Floating Background Effects */}
        <div className="absolute inset-0 pointer-events-none select-none z-0">
          {/* Custom style injection for animations */}
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes float-1 {
              0% { transform: translate(0px, 0px) rotate(0deg); }
              50% { transform: translate(-10px, -15px) rotate(3deg); }
              100% { transform: translate(0px, 0px) rotate(0deg); }
            }
            @keyframes float-2 {
              0% { transform: translate(0px, 0px) rotate(0deg); }
              50% { transform: translate(12px, -20px) rotate(-4deg); }
              100% { transform: translate(0px, 0px) rotate(0deg); }
            }
            @keyframes float-3 {
              0% { transform: translate(0px, 0px) rotate(0deg); }
              50% { transform: translate(-8px, 12px) rotate(2deg); }
              100% { transform: translate(0px, 0px) rotate(0deg); }
            }
            @keyframes float-4 {
              0% { transform: translate(0px, 0px) rotate(0deg); }
              50% { transform: translate(15px, 10px) rotate(-3deg); }
              100% { transform: translate(0px, 0px) rotate(0deg); }
            }
            .animate-float-1 { animation: float-1 8s ease-in-out infinite; }
            .animate-float-2 { animation: float-2 10s ease-in-out infinite; }
            .animate-float-3 { animation: float-3 9s ease-in-out infinite; }
            .animate-float-4 { animation: float-4 11s ease-in-out infinite; }
          `}} />

          {/* 3D Shiny Logo - PowerBI */}
          <div className="absolute left-[8%] top-[12%] opacity-25 hover:opacity-50 transition-opacity duration-300 animate-float-1">
            <svg width="85" height="85" viewBox="0 0 100 100" fill="none" className="filter drop-shadow-[0_8px_32px_rgba(245,158,11,0.2)]">
              <defs>
                <linearGradient id="pbi-base" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#1e1e24" />
                  <stop offset="50%" stopColor="#0f0f12" />
                  <stop offset="100%" stopColor="#020205" />
                </linearGradient>
                <linearGradient id="pbi-shine-gold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="50%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
                <linearGradient id="pbi-gold-top" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <path d="M20 70 L30 65 L30 85 L20 90 Z" fill="url(#pbi-shine-gold)" opacity="0.8" />
              <path d="M30 65 L40 70 L40 90 L30 85 Z" fill="#0f0f12" />
              <path d="M20 70 L30 65 L40 70 L30 75 Z" fill="url(#pbi-gold-top)" />
              <path d="M42 50 L52 45 L52 80 L42 85 Z" fill="url(#pbi-shine-gold)" />
              <path d="M52 45 L62 50 L62 85 L52 80 Z" fill="#1e1e24" />
              <path d="M42 50 L52 45 L62 50 L52 55 Z" fill="url(#pbi-gold-top)" />
              <path d="M64 30 L74 25 L74 75 L64 80 Z" fill="url(#pbi-shine-gold)" />
              <path d="M74 25 L84 30 L84 80 L74 75 Z" fill="#020205" />
              <path d="M64 30 L74 25 L84 30 L74 35 Z" fill="url(#pbi-gold-top)" />
            </svg>
          </div>

          {/* 3D Shiny Logo - Excel */}
          <div className="absolute right-[8%] top-[10%] opacity-25 hover:opacity-50 transition-opacity duration-300 animate-float-2">
            <svg width="85" height="85" viewBox="0 0 100 100" fill="none" className="filter drop-shadow-[0_8px_32px_rgba(16,185,129,0.2)]">
              <defs>
                <linearGradient id="xl-green" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="60%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#064e3b" />
                </linearGradient>
                <linearGradient id="xl-black" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#27272a" />
                  <stop offset="100%" stopColor="#09090b" />
                </linearGradient>
                <linearGradient id="xl-shine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M35 25 L85 15 L85 75 L35 85 Z" fill="url(#xl-black)" stroke="#22c55e" strokeWidth="1.5" strokeOpacity="0.4" />
              <path d="M51 22 L51 82 M67 19 L67 79 M35 45 L85 35 M35 65 L85 55" stroke="rgba(16,185,129,0.2)" strokeWidth="1" />
              <path d="M15 35 L45 28 L45 72 L15 79 Z" fill="url(#xl-green)" />
              <path d="M22 45 L28 45 L33 53 L38 45 L44 45 L36 56 L44 67 L38 67 L33 59 L28 67 L22 67 L30 56 Z" fill="#ffffff" />
              <path d="M15 35 L45 28 L45 50 L15 57 Z" fill="url(#xl-shine)" />
            </svg>
          </div>

          {/* 3D Shiny Logo - Python */}
          <div className="absolute left-[10%] bottom-[12%] opacity-25 hover:opacity-50 transition-opacity duration-300 animate-float-3">
            <svg width="85" height="85" viewBox="0 0 100 100" fill="none" className="filter drop-shadow-[0_8px_32px_rgba(59,130,246,0.2)]">
              <defs>
                <linearGradient id="py-blue" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="50%" stopColor="#2563eb" />
                  <stop offset="100%" stopColor="#1e3a8a" />
                </linearGradient>
                <linearGradient id="py-yellow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fde047" />
                  <stop offset="50%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#78350f" />
                </linearGradient>
                <linearGradient id="py-black-shine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M49 15 C32 15 28 20 28 30 L28 40 L38 40 L38 34 C38 28 42 26 48 26 L58 26 C64 26 66 22 66 16 L66 15 C59 15 53 15 49 15 Z" fill="url(#py-blue)" />
              <path d="M38 40 L49 40 L49 50 L42 50 C32 50 28 48 28 38 L28 40 Z" fill="url(#py-blue)" opacity="0.9" />
              <circle cx="37" cy="21" r="2" fill="#0f172a" />
              <path d="M51 85 C68 85 72 80 72 70 L72 60 L62 60 L62 66 C62 72 58 74 52 74 L42 74 C36 74 34 78 34 84 L34 85 C41 85 47 85 51 85 Z" fill="url(#py-yellow)" />
              <path d="M62 60 L51 60 L51 50 L58 50 C68 50 72 52 72 62 L72 60 Z" fill="url(#py-yellow)" opacity="0.9" />
              <circle cx="63" cy="79" r="2" fill="#0f172a" />
              <path d="M28 30 C28 25 32 20 40 18 C34 22 30 28 30 35 Z" fill="url(#py-black-shine)" />
              <path d="M72 70 C72 75 68 80 60 82 C66 78 70 72 70 65 Z" fill="url(#py-black-shine)" />
            </svg>
          </div>

          {/* 3D Shiny Logo - Analytics */}
          <div className="absolute right-[12%] bottom-[12%] opacity-25 hover:opacity-50 transition-opacity duration-300 animate-float-4">
            <svg width="85" height="85" viewBox="0 0 100 100" fill="none" className="filter drop-shadow-[0_8px_32px_rgba(139,92,246,0.2)]">
              <defs>
                <linearGradient id="chart-glow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#7c3aed" />
                  <stop offset="100%" stopColor="#4c1d95" />
                </linearGradient>
                <linearGradient id="chart-black" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#2d3748" />
                  <stop offset="100%" stopColor="#1a202c" />
                </linearGradient>
              </defs>
              <path d="M15 65 L50 45 L85 65 L50 85 Z" fill="url(#chart-black)" stroke="#8b5cf6" strokeWidth="1.5" strokeOpacity="0.3" />
              <path d="M25 60 L32 56 L32 40 L25 44 Z" fill="url(#chart-glow)" opacity="0.6" />
              <path d="M32 56 L39 60 L39 44 L32 40 Z" fill="#4c1d95" />
              <path d="M25 44 L32 40 L39 44 L32 48 Z" fill="#c084fc" />
              <path d="M45 70 L52 66 L52 35 L45 39 Z" fill="url(#chart-glow)" />
              <path d="M52 66 L59 70 L59 39 L52 35 Z" fill="#4c1d95" opacity="0.8" />
              <path d="M45 39 L52 35 L59 39 L52 43 Z" fill="#c084fc" />
              <path d="M65 60 L72 56 L72 25 L65 29 Z" fill="url(#chart-glow)" />
              <path d="M72 56 L79 60 L79 29 L72 25 Z" fill="#4c1d95" />
              <path d="M65 29 L72 25 L79 29 L72 33 Z" fill="#c084fc" />
            </svg>
          </div>

          {/* Floating Glassmorphic Chart 1 (Line Chart) */}
          <div className="absolute left-[24%] top-[15%] hidden lg:block opacity-30 hover:opacity-60 transition-opacity duration-300 animate-float-2">
            <div className="w-48 h-32 bg-black/40 border border-white/[0.06] rounded-2xl p-3.5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between mb-1">
                <div className="w-12 h-2 bg-white/10 rounded-full" />
                <div className="w-6 h-2 bg-emerald-500/20 text-emerald-400 text-[6px] font-bold rounded-full flex items-center justify-center">+18%</div>
              </div>
              <svg className="w-full h-14" viewBox="0 0 200 60" fill="none">
                <defs>
                  <linearGradient id="line-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,50 Q25,20 50,40 T100,10 T150,30 T200,5 L200,60 L0,60 Z" fill="url(#line-area)" />
                <path d="M0,50 Q25,20 50,40 T100,10 T150,30 T200,5" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="100" cy="10" r="3" fill="#60a5fa" stroke="#000" strokeWidth="1" />
                <circle cx="150" cy="30" r="3" fill="#60a5fa" stroke="#000" strokeWidth="1" />
              </svg>
              <div className="flex justify-between text-[7px] text-white/30">
                <span>Jan</span>
                <span>Feb</span>
                <span>Mar</span>
                <span>Apr</span>
              </div>
            </div>
          </div>

          {/* Floating Glassmorphic Chart 2 (Bar Chart) */}
          <div className="absolute right-[24%] bottom-[15%] hidden lg:block opacity-30 hover:opacity-60 transition-opacity duration-300 animate-float-1">
            <div className="w-44 h-30 bg-black/40 border border-white/[0.06] rounded-2xl p-3.5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <div className="w-14 h-2 bg-white/10 rounded-full mb-2" />
              <div className="flex items-end justify-between h-12 px-1">
                <div className="w-3 bg-gradient-to-t from-pink-500/80 to-purple-500/80 rounded-t-sm" style={{ height: '40%' }} />
                <div className="w-3 bg-gradient-to-t from-pink-500/80 to-purple-500/80 rounded-t-sm" style={{ height: '75%' }} />
                <div className="w-3 bg-gradient-to-t from-pink-500/80 to-purple-500/80 rounded-t-sm" style={{ height: '55%' }} />
                <div className="w-3 bg-gradient-to-t from-pink-500/80 to-purple-500/80 rounded-t-sm" style={{ height: '90%' }} />
                <div className="w-3 bg-gradient-to-t from-pink-500/80 to-purple-500/80 rounded-t-sm" style={{ height: '30%' }} />
              </div>
              <div className="w-full h-[1px] bg-white/10 mt-1" />
            </div>
          </div>

          {/* Floating Glassmorphic Chart 3 (Doughnut Chart) */}
          <div className="absolute right-[22%] top-[16%] hidden xl:block opacity-35 hover:opacity-60 transition-opacity duration-300 animate-float-3">
            <div className="w-36 h-32 bg-black/40 border border-white/[0.06] rounded-2xl p-3 backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-between shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <div className="w-10 h-2 bg-white/10 rounded-full self-start" />
              <div className="relative w-14 h-14 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="url(#doughnut-glow)" strokeWidth="2.5" strokeDasharray="70 30" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="doughnut-glow" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#ec4899" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-[8px] font-bold text-white/80">70%</span>
                </div>
              </div>
              <div className="w-12 h-1.5 bg-white/15 rounded-full" />
            </div>
          </div>

          {/* Floating Glassmorphic Chart 4 (Scatter/Bubble Plot) */}
          <div className="absolute left-[20%] bottom-[16%] hidden xl:block opacity-35 hover:opacity-60 transition-opacity duration-300 animate-float-4">
            <div className="w-40 h-32 bg-black/40 border border-white/[0.06] rounded-2xl p-3.5 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
              <div className="w-12 h-2 bg-white/10 rounded-full mb-1" />
              <div className="relative w-full h-14 bg-white/[0.02] border border-white/5 rounded-lg overflow-hidden">
                <div className="absolute left-[20%] top-[40%] w-3 h-3 rounded-full bg-cyan-400/50 animate-pulse" />
                <div className="absolute left-[45%] top-[20%] w-4 h-4 rounded-full bg-indigo-400/50 animate-pulse" style={{animationDelay:'1s'}} />
                <div className="absolute left-[65%] top-[60%] w-2 h-2 rounded-full bg-purple-400/50 animate-pulse" style={{animationDelay:'0.5s'}} />
                <div className="absolute left-[80%] top-[30%] w-5 h-5 rounded-full bg-pink-400/50 animate-pulse" style={{animationDelay:'1.5s'}} />
              </div>
              <div className="w-full h-[1px] bg-white/10 mt-1" />
            </div>
          </div>
        </div>

        {/* Upload card and details */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-primary/40" style={{background:'rgba(212,102,58,0.10)', border:'1px solid rgba(212,102,58,0.20)'}}>
            <Upload size={32} style={{color:'var(--primary)'}} />
          </div>
          <h2 className="font-playfair font-bold text-2xl mb-3" style={{color:'var(--foreground)'}}>Upload your first dataset</h2>
          <p className="text-sm mb-8 max-w-md" style={{color:'var(--muted-foreground)'}}>
            Upload a CSV, Excel, or JSON file. Our AI agents will automatically profile, clean, and analyze your data.
          </p>
          <label className="btn-primary cursor-pointer shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300">
            <Upload size={16} /> <span>Choose a file to upload</span>
            <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    );

    return (
      <div className="space-y-6">
        {/* Dataset header card */}
        <div className="glass-panel p-8 overflow-hidden relative" style={{background: 'linear-gradient(135deg, var(--foreground) 0%, #2d1a0e 100%)'}}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider" style={{background:'rgba(212,102,58,0.3)', color:'#ffb899', border:'1px solid rgba(212,102,58,0.4)'}}>
                {selectedDataset.business_domain || 'General Analytics'}
              </span>
              <span className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>AI Understanding Output</span>
            </div>
            <h2 className="font-playfair font-bold text-3xl text-white mb-3 leading-tight">{selectedDataset.name}</h2>
            <p className="text-sm leading-relaxed max-w-3xl" style={{color:'rgba(255,255,255,0.65)'}}>
              {selectedDataset.summary || 'AI agents are generating a dataset summary...'}
            </p>
          </div>
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full opacity-10" style={{background:'var(--primary)'}} />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {label:'Rows', value: selectedDataset.row_count?.toLocaleString() || '—'},
            {label:'Columns', value: selectedDataset.column_count || '—'},
            {label:'File Type', value: selectedDataset.file_type?.toUpperCase() || '—'},
            {label:'Size', value: `${(selectedDataset.file_size / 1024).toFixed(1)} KB`},
          ].map((stat, i) => (
            <div key={i} className="glass-panel p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{color:'var(--muted-foreground)'}}>{stat.label}</p>
              <p className="font-playfair font-bold text-2xl" style={{color:'var(--foreground)'}}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Column schema */}
        <div className="glass-panel p-6">
          <div className="flex items-center gap-2 mb-5">
            <Database size={18} style={{color:'var(--primary)'}} />
            <h3 className="font-semibold text-base" style={{color:'var(--foreground)'}}>Column Schema & Business Dictionary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDataset.columns_metadata && Object.entries(selectedDataset.columns_metadata).map(([colName, meta]: [string, any]) => (
              <div key={colName} className="p-4 rounded-xl transition-all" style={{background:'var(--secondary)', border:'1px solid var(--border)'}}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs font-semibold truncate" style={{color:'var(--foreground)'}}>{colName}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded font-mono uppercase font-bold" style={{background:'var(--muted)', color:'var(--muted-foreground)'}}>{meta.data_type}</span>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{color:'var(--muted-foreground)'}}>{meta.description || 'Column descriptor.'}</p>
                <div className="flex gap-3 text-[10px] font-mono" style={{color:'var(--muted-foreground)'}}>
                  <span>Nulls: {meta.null_percentage?.toFixed(1)}%</span>
                  <span>Unique: {meta.unique_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data preview grid */}
        {previewData && (
          <div className="glass-panel p-6">
            <div className="flex items-center gap-2 mb-5">
              <FileText size={18} style={{color:'var(--primary)'}} />
              <h3 className="font-semibold text-base" style={{color:'var(--foreground)'}}>Raw Data Preview
                <span className="ml-2 text-xs font-normal" style={{color:'var(--muted-foreground)'}}>({selectedDataset.row_count} rows total)</span>
              </h3>
            </div>
            <PreviewGrid columns={previewData.columns} rows={previewData.rows} columnsMeta={selectedDataset.columns_metadata} />
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => {
    if (!dashboards?.layout) return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <LayoutDashboard size={40} className="mb-4" style={{color:'var(--muted-foreground)'}} />
        <h3 className="font-playfair font-bold text-xl mb-2" style={{color:'var(--foreground)'}}>Dashboard not ready</h3>
        <p className="text-sm" style={{color:'var(--muted-foreground)'}}>Select a dataset and wait for profiling to complete.</p>
      </div>
    );

    const kpiWidgets   = dashboards.layout.filter((w: any) => w.type === 'kpi');
    const chartWidgets = dashboards.layout.filter((w: any) => w.type === 'chart');

    return (
      <div className="space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...kpiWidgets,
            { id: 'domain', title: 'Domain Vertical', config: { value: selectedDataset?.business_domain || 'General', label: 'AI Classified' }, icon: 'sparkles' },
            { id: 'filetype', title: 'File Format', config: { value: selectedDataset?.file_type?.toUpperCase() || '—', label: `${(selectedDataset?.file_size/1024).toFixed(1)} KB` }, icon: 'file' },
          ].map((kpi: any) => (
            <motion.div key={kpi.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.4}} className="glass-panel p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:'var(--muted-foreground)'}}>{kpi.title}</p>
              <p className="font-playfair font-bold text-2xl mb-1 truncate" style={{color:'var(--foreground)'}}>{kpi.config.value}</p>
              <p className="text-xs" style={{color:'var(--muted-foreground)'}}>{kpi.config.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Quality recommendation panel */}
        {analysisJob?.quality_report && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}} className="glass-panel p-6">
            <div className="flex flex-col lg:flex-row gap-6 justify-between pb-5 mb-5" style={{borderBottom:'1px solid var(--border)'}}>
              <div>
                <h3 className="font-semibold text-base flex items-center gap-2 mb-1" style={{color:'var(--foreground)'}}>
                  <AlertTriangle size={18} style={{color:'#f59e0b'}} /> Data Quality Engine
                </h3>
                <p className="text-xs" style={{color:'var(--muted-foreground)'}}>
                  {analysisJob.quality_report.issues?.length || 0} issues detected. Auto-clean options below.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                {[['remove_duplicates','Dedup'],['impute_missing','Impute Nulls'],['handle_outliers','Clip Outliers']].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none" style={{color:'var(--muted-foreground)'}}>
                    <input type="checkbox" checked={(cleaningOptions as any)[key]}
                      onChange={e => setCleaningOptions(p => ({...p, [key]: e.target.checked}))}
                      className="rounded" style={{accentColor:'var(--primary)'}} />
                    {label}
                  </label>
                ))}
                <button onClick={handleAutoClean} disabled={cleaningLoading} className="btn-primary py-2 px-4 text-xs disabled:opacity-50">
                  {cleaningLoading ? <Loader2 size={13} className="animate-spin"/> : <RefreshCw size={13}/>}
                  Auto Clean
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{color:'var(--muted-foreground)'}}>Detector Logs</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisJob.quality_report.issues?.length > 0 ? analysisJob.quality_report.issues.map((iss:any, i:number) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs p-3 rounded-xl" style={{background:'var(--secondary)', border:'1px solid var(--border)'}}>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${iss.severity==='high'?'bg-red-100 text-red-600':iss.severity==='medium'?'bg-amber-100 text-amber-600':'bg-blue-100 text-blue-600'}`}>{iss.severity}</span>
                      <span style={{color:'var(--foreground)'}}>{iss.message}</span>
                    </div>
                  )) : (
                    <div className="flex items-center gap-2 text-xs p-3 rounded-xl" style={{background:'rgba(16,185,129,0.08)', color:'#10b981'}}>
                      <CheckCircle2 size={14}/> Zero issues flagged. Clean dataset.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-3" style={{color:'var(--muted-foreground)'}}>AI Action Plan</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {analysisJob.quality_report.actionable_plan?.map((step:string, i:number) => (
                    <div key={i} className="flex items-start gap-2 text-xs p-3 rounded-xl" style={{background:'var(--secondary)', border:'1px solid var(--border)'}}>
                      <span style={{color:'var(--primary)', fontWeight:700}}>→</span>
                      <span style={{color:'var(--foreground)'}}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Charts bento grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {chartWidgets.map((widget: any, i: number) => (
            <motion.div key={widget.id} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.15+i*0.05}} className="glass-panel p-6">
              <h4 className="font-semibold text-sm mb-1" style={{color:'var(--foreground)'}}>{widget.title}</h4>
              {analysisJob?.quality_report && widget.config?.layout?.title?.text && (
                <p className="text-xs italic mb-4" style={{color:'var(--muted-foreground)'}}>Analyzing trends for {widget.config.layout.title.text}.</p>
              )}
              <ChartRenderer plotlyJson={widget.config} />
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderChat = () => (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-230px)]">
      {/* Conversation sidebar */}
      <div className="glass-panel p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between pb-3" style={{borderBottom:'1px solid var(--border)'}}>
          <p className="text-xs font-bold uppercase tracking-wider" style={{color:'var(--muted-foreground)'}}>Conversations</p>
          <button onClick={() => { setActiveConversationId(null); setChatMessages([]); }}
            className="text-xs px-2.5 py-1 rounded-lg font-semibold transition" style={{background:'rgba(212,102,58,0.1)', color:'var(--primary)', border:'1px solid rgba(212,102,58,0.2)'}}>
            + New
          </button>
        </div>
        <div className="space-y-1 overflow-y-auto flex-grow">
          {conversations.length > 0 ? conversations.map(conv => (
            <button key={conv.id} onClick={() => loadConversation(conv.id)}
              className="w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center gap-2 truncate transition"
              style={activeConversationId===conv.id?{background:'var(--primary)',color:'#fff'}:{color:'var(--muted-foreground)', background:'transparent'}}>
              <MessageSquare size={12}/> {conv.title}
            </button>
          )) : (
            <p className="text-xs text-center py-8 select-none" style={{color:'var(--muted-foreground)'}}>No conversations yet</p>
          )}
        </div>
        <div className="text-xs flex gap-2 p-3 rounded-xl" style={{background:'var(--secondary)', color:'var(--muted-foreground)'}}>
          <HelpCircle size={13} className="shrink-0 mt-0.5" style={{color:'var(--primary)'}}/> AI executes code locally. Your data stays on-device.
        </div>
      </div>

      {/* Chat main */}
      <div className="lg:col-span-3 glass-panel flex flex-col overflow-hidden">
        <div className="flex-grow p-5 overflow-y-auto space-y-4">
          {chatMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{background:'rgba(212,102,58,0.10)', border:'1px solid rgba(212,102,58,0.20)'}}>
                <MessageSquare size={28} style={{color:'var(--primary)'}}/>
              </div>
              <h3 className="font-playfair font-bold text-xl mb-2" style={{color:'var(--foreground)'}}>AI Data Chat</h3>
              <p className="text-xs mb-8" style={{color:'var(--muted-foreground)'}}>Ask questions in plain English. AI translates them to Python and returns results instantly.</p>
              <div className="grid grid-cols-2 gap-3 w-full">
                {['"Show Sales by Region"','"Top 5 product categories?"','"Find outlier records"','"Correlations check"'].map((q,i) => (
                  <button key={i} onClick={() => handleChatSubmit(undefined, q.replace(/"/g,''))}
                    className="text-left text-xs p-3 rounded-xl transition" style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--foreground)'}}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : chatMessages.map((msg, i) => (
            <div key={i} className={`flex flex-col max-w-[82%] ${msg.role==='user'?'ml-auto items-end':'mr-auto items-start'}`}>
              <div className="text-xs leading-relaxed p-4 rounded-2xl" style={msg.role==='user'
                ? {background:'var(--primary)', color:'#fff', borderBottomRightRadius:4}
                : {background:'var(--card)', border:'1px solid var(--border)', color:'var(--foreground)', borderBottomLeftRadius:4}}>
                {msg.content}
              </div>
              {msg.chart && <div className="mt-3 glass-panel p-4 w-[500px] max-w-full"><ChartRenderer plotlyJson={msg.chart}/></div>}
            </div>
          ))}
          {chatLoading && (
            <div className="flex items-center gap-2.5 text-xs px-4 py-3 rounded-xl w-max animate-pulse" style={{background:'var(--secondary)', color:'var(--muted-foreground)'}}>
              <Loader2 size={13} className="animate-spin" style={{color:'var(--primary)'}}/> AI is analyzing your data...
            </div>
          )}
          <div ref={chatEndRef}/>
        </div>
        <form onSubmit={handleChatSubmit} className="p-4 flex gap-3" style={{borderTop:'1px solid var(--border)', background:'var(--card)'}}>
          <input value={chatInput} onChange={e => setChatInput(e.target.value)}
            placeholder="Ask A3 a question about your data..."
            className="flex-grow text-xs px-4 py-3 rounded-full outline-none"
            style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--foreground)'}}/>
          <button type="submit" disabled={chatLoading} className="btn-primary px-5 py-2.5 disabled:opacity-50 flex items-center justify-center">
            <Send size={15}/>
          </button>
        </form>
      </div>
    </div>
  );

  const renderForecast = () => {
    const hasForecast = analysisJob?.insights?.forecast_chart !== undefined;
    return (
      <div className="glass-panel p-8 space-y-8">
        <div>
          <h3 className="font-playfair font-bold text-xl flex items-center gap-2.5 mb-2" style={{color:'var(--foreground)'}}>
            <LineChart style={{color:'#10b981'}} size={22}/> Auto Time-Series Trend Forecaster
          </h3>
          <p className="text-sm" style={{color:'var(--muted-foreground)'}}>A3 scans columns, isolates date index, and fits predictive regression trends locally.</p>
        </div>
        {hasForecast ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 glass-panel p-5"><ChartRenderer plotlyJson={analysisJob.insights.forecast_chart}/></div>
            <div className="space-y-4">
              <div className="p-5 rounded-2xl" style={{background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.15)'}}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{color:'#10b981'}}><TrendingUp size={13}/> Commentary</p>
                <p className="text-xs italic leading-relaxed" style={{color:'var(--foreground)'}}>"{analysisJob.insights.forecast_commentary || 'Trend is stable.'}"</p>
              </div>
              <div className="p-5 rounded-2xl text-xs space-y-2" style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--muted-foreground)'}}>
                <p className="font-semibold" style={{color:'var(--foreground)'}}>Model Specs:</p>
                <p>• Polynomial Ridge Regression (2°)</p><p>• Autoregressive seasonality</p>
                <p>• Auto-selected numerical target</p><p>• 100% Local ($0.0 cost)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.15)'}}>
              <LineChart size={28} style={{color:'#10b981'}}/>
            </div>
            <h4 className="font-semibold text-base mb-2" style={{color:'var(--foreground)'}}>No Forecast Available</h4>
            <p className="text-sm max-w-md" style={{color:'var(--muted-foreground)'}}>Requires a date/time column and a numeric metric. Upload a dataset with this schema to enable forecasting.</p>
          </div>
        )}
      </div>
    );
  };

  const renderReports = () => (
    <div className="glass-panel p-8 space-y-6">
      <div className="flex items-center justify-between pb-5" style={{borderBottom:'1px solid var(--border)'}}>
        <div>
          <h3 className="font-playfair font-bold text-xl flex items-center gap-2.5 mb-1" style={{color:'var(--foreground)'}}>
            <FileText style={{color:'#a855f7'}} size={22}/> Executive Report Builder
          </h3>
          <p className="text-sm" style={{color:'var(--muted-foreground)'}}>Compile insights and charts into downloadable executive-ready PDFs.</p>
        </div>
        <button onClick={handleGenerateReport} disabled={reportGenerating || analysisJob?.status !== 'completed'}
          className="flex items-center gap-2 text-xs font-semibold px-5 py-2.5 rounded-full transition disabled:opacity-50"
          style={{background:'#a855f7', color:'#fff'}}>
          {reportGenerating ? <Loader2 size={13} className="animate-spin"/> : <FileText size={13}/>} Generate Report
        </button>
      </div>
      <div className="space-y-3">
        {reports.length > 0 ? reports.map(rep => (
          <div key={rep.id} className="flex items-center justify-between p-5 rounded-2xl transition" style={{background:'var(--secondary)', border:'1px solid var(--border)'}}>
            <div>
              <h4 className="font-semibold text-sm mb-1" style={{color:'var(--foreground)'}}>{rep.title}</h4>
              <p className="text-xs flex items-center gap-1.5" style={{color:'var(--muted-foreground)'}}><Calendar size={11}/>{new Date(rep.created_at).toLocaleDateString()}</p>
            </div>
            <button onClick={() => handleDownloadReport(rep.id, rep.title)}
              className="p-3 rounded-xl transition" style={{background:'rgba(212,102,58,0.10)', color:'var(--primary)', border:'1px solid rgba(212,102,58,0.20)'}}>
              <Download size={15}/>
            </button>
          </div>
        )) : (
          <div className="text-center py-16 rounded-2xl border-2 border-dashed text-sm" style={{borderColor:'var(--border)', color:'var(--muted-foreground)'}}>
            No reports yet. Click 'Generate Report' to build one.
          </div>
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="glass-panel p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h3 className="font-playfair font-bold text-xl flex items-center gap-2.5 mb-1" style={{color:'var(--foreground)'}}>
          <Settings style={{color:'var(--primary)'}} size={22}/> AI Model Settings
        </h3>
        <p className="text-sm" style={{color:'var(--muted-foreground)'}}>Configure the LLM provider powering your AI agents.</p>
      </div>
      <form onSubmit={handleSaveSettings} className="space-y-5">
        {settingsMessage && (
          <div className={`p-4 rounded-xl text-xs flex items-center gap-2 ${settingsMessage.type==='success'?'text-green-600':'text-red-500'}`}
            style={{background:settingsMessage.type==='success'?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)', border:`1px solid ${settingsMessage.type==='success'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`}}>
            {settingsMessage.type==='success'?<CheckCircle2 size={14}/>:<AlertTriangle size={14}/>} {settingsMessage.text}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-xs font-semibold block" style={{color:'var(--foreground)'}}>LLM Provider</label>
          <select value={llmProvider} onChange={e => { const p=e.target.value as any; setLlmProvider(p); if(p==='gemini')setLlmModel('gemini-2.5-flash'); else if(p==='openai')setLlmModel('gpt-4o-mini'); else if(p==='ollama')setLlmModel('qwen2.5:latest'); else setLlmModel(''); }}
            className="w-full p-3 text-xs rounded-xl outline-none" style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--foreground)'}}>
            <option value="default">System Default (Gemini/Ollama/Mock)</option>
            <option value="gemini">Google Gemini API</option>
            <option value="openai">OpenAI API</option>
            <option value="ollama">Local Ollama</option>
            <option value="mock">Local Heuristic Mock</option>
          </select>
        </div>
        {llmProvider !== 'default' && llmProvider !== 'mock' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold block" style={{color:'var(--foreground)'}}>Model Name</label>
            <input value={llmModel} onChange={e => setLlmModel(e.target.value)}
              placeholder={llmProvider==='gemini'?'e.g., gemini-2.5-flash':llmProvider==='openai'?'e.g., gpt-4o-mini':'e.g., qwen2.5:latest'}
              className="w-full p-3 text-xs rounded-xl outline-none" style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--foreground)'}}/>
          </div>
        )}
        {llmProvider !== 'default' && llmProvider !== 'ollama' && llmProvider !== 'mock' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold block" style={{color:'var(--foreground)'}}>API Key</label>
            <input type="password" value={llmApiKey} onChange={e => setLlmApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full p-3 text-xs rounded-xl outline-none" style={{background:'var(--secondary)', border:'1px solid var(--border)', color:'var(--foreground)'}}/>
          </div>
        )}
        <button type="submit" disabled={settingsLoading} className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50">
          {settingsLoading && <Loader2 size={14} className="animate-spin"/>} Save Configuration
        </button>
      </form>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────
  // ── AUTH SCREEN ──────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <ModernLoginSignup
        emailProp={email}
        setEmailProp={setEmail}
        passwordProp={password}
        setPasswordProp={setPassword}
        nameProp={name}
        setNameProp={setName}
        confirmPasswordProp={confirmPassword}
        setConfirmPasswordProp={setConfirmPassword}
        isLoadingProp={authLoading}
        onSubmitProp={handleAuthSubmit}
        authErrorProp={authError}
        onGoogleSubmitProp={handleGoogleAuth}
        isGoogleLoadingProp={googleLoading}
        isLogin={authMode === 'login'}
        setIsLogin={(val) => {
          setAuthMode(val ? 'login' : 'register');
          setAuthError('');
        }}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────
  // ── MAIN APP — Formula Bot Full-Width Layout ─────────────────────
  // ─────────────────────────────────────────────────────────────────
  const isJobRunning = selectedDatasetId && analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running');

  return (
    <div className="min-h-screen grid-bg">
      {/* ── FLOATING DARK NAVBAR (exact Formula Bot style) ── */}
      <div className="sticky top-0 z-50 flex justify-center px-4 pt-4 pb-2 pointer-events-none">
        <nav className="fb-nav w-full max-w-5xl px-5 py-3 flex items-center justify-between pointer-events-auto">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img 
              src="/logo.jpg" 
              alt="A3 Logo" 
              className="w-7 h-7 rounded-full object-cover border border-white/20"
            />
            <span className="font-playfair font-bold text-white text-lg tracking-tight">A3 <span className="font-sans font-normal text-sm opacity-60">Analyst</span></span>
          </div>

          {/* Center: Tab navigation pills */}
          <div className="hidden md:flex items-center gap-1 p-1 rounded-full" style={{background:'rgba(255,255,255,0.08)'}}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const isDisabled = (tab.id !== 'upload' && tab.id !== 'settings') && (!selectedDatasetId || analysisJob?.status !== 'completed');
              return (
                <button key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isDisabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={activeTab === tab.id
                    ? {background:'rgba(255,255,255,1)', color:'#0f0f0f'}
                    : {color:'rgba(255,255,255,0.65)'}}>
                  <Icon size={13}/> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Right: Dataset selector + actions */}
          <div className="flex items-center gap-2">
            {/* Dataset dropdown */}
            <div className="relative">
              <button onClick={() => setDatasetMenuOpen(p => !p)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition"
                style={{background:'rgba(255,255,255,0.10)', color:'rgba(255,255,255,0.8)', border:'1px solid rgba(255,255,255,0.12)'}}>
                <Database size={12}/>
                <span className="max-w-[120px] truncate">{selectedDataset?.name || 'Select dataset'}</span>
                <ChevronDown size={11} className={`transition-transform ${datasetMenuOpen ? 'rotate-180' : ''}`}/>
              </button>
              {datasetMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl overflow-hidden shadow-2xl z-50"
                  style={{background:'rgba(15,15,15,0.96)', border:'1px solid rgba(255,255,255,0.10)', backdropFilter:'blur(16px)'}}>
                  <div className="p-2">
                    {datasets.map(ds => (
                      <button key={ds.id} onClick={() => { setSelectedDatasetId(ds.id); setDatasetMenuOpen(false); }}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition group"
                        style={{color: ds.id===selectedDatasetId ? 'white' : 'rgba(255,255,255,0.6)', background: ds.id===selectedDatasetId ? 'rgba(255,255,255,0.12)' : 'transparent'}}>
                        <div className="flex items-center gap-2 min-w-0">
                          <Database size={12} style={{color:'var(--primary)'}} className="shrink-0"/>
                          <span className="truncate">{ds.name}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteDataset(ds.id); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition">
                          <X size={11}/>
                        </button>
                      </button>
                    ))}
                    {datasets.length === 0 && <p className="text-center py-4 text-xs" style={{color:'rgba(255,255,255,0.4)'}}>No datasets</p>}
                  </div>
                  <div className="p-2 pt-0" style={{borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <label className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs cursor-pointer w-full transition" style={{color:'var(--primary)', background:'rgba(212,102,58,0.12)'}}>
                      {uploadProgress ? <Loader2 size={12} className="animate-spin"/> : <Plus size={12}/>}
                      {uploadProgress ? 'Uploading...' : 'Upload new dataset'}
                      <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={e => { setDatasetMenuOpen(false); handleFileUpload(e); }} className="hidden"/>
                    </label>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* User + logout */}
            <button onClick={handleLogout} title="Log Out"
              className="p-2 rounded-full transition" style={{color:'rgba(255,255,255,0.55)', background:'rgba(255,255,255,0.08)'}}>
              <LogOut size={14}/>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile tab bar */}
      <div className="md:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto" style={{borderBottom:'1px solid var(--border)', background:'var(--card)'}}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isDisabled = (tab.id !== 'upload' && tab.id !== 'settings') && (!selectedDatasetId || analysisJob?.status !== 'completed');
          return (
            <button key={tab.id} onClick={() => !isDisabled && setActiveTab(tab.id)} disabled={isDisabled}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition ${isDisabled?'opacity-30':''}`}
              style={activeTab===tab.id?{background:'var(--foreground)', color:'var(--background)'}:{color:'var(--muted-foreground)'}}>
              <Icon size={13}/> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── MAIN CONTENT ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Job running banner */}
        {isJobRunning && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} className="mb-6 p-4 rounded-2xl flex items-center gap-4"
            style={{background:'rgba(212,102,58,0.08)', border:'1px solid rgba(212,102,58,0.18)'}}>
            <Loader2 size={20} className="animate-spin shrink-0" style={{color:'var(--primary)'}}/>
            <div>
              <p className="text-sm font-semibold" style={{color:'var(--foreground)'}}>Multi-Agent Profiling In Progress</p>
              <p className="text-xs" style={{color:'var(--muted-foreground)'}}>AI agents are scanning your data. Dashboard will update automatically.</p>
            </div>
          </motion.div>
        )}

        {/* Global loading */}
        {globalLoading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 size={32} className="animate-spin" style={{color:'var(--primary)'}}/>
            <p className="text-sm animate-pulse" style={{color:'var(--muted-foreground)'}}>Loading workspace...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.3}}>
              {activeTab === 'upload'    && renderUpload()}
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'chat'      && renderChat()}
              {activeTab === 'forecast'  && renderForecast()}
              {activeTab === 'reports'   && renderReports()}
              {activeTab === 'settings'  && renderSettings()}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

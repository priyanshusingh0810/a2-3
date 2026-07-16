'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard, 
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download,
  Settings, Sliders, Bookmark, Users, Layers, Activity, ChevronRight, Play, Award
} from 'lucide-react';
import api from '@/lib/api';
import PreviewGrid from '@/components/preview-grid';
import ChartRenderer from '@/components/chart-renderer';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';
import { SignUpCard } from '@/components/ui/sign-up-card';
import { ForgotPasswordCard } from '@/components/ui/forgot-password-card';

type ActiveTab = 'dashboard' | 'datasets' | 'chat' | 'forecast' | 'reports' | 'simulations' | 'memory' | 'workspace' | 'templates' | 'settings';

export default function Home() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // --- WORKSPACE STATES ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('datasets');
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  
  // Dataset detail states
  const [previewData, setPreviewData] = useState<any>(null);
  const [analysisJob, setAnalysisJob] = useState<any>(null);
  const [dashboards, setDashboards] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  
  // Data loading indicators
  const [globalLoading, setGlobalLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(false);

  // --- DATA CLEANING STATES ---
  const [cleaningOptions, setCleaningOptions] = useState({
    impute_missing: true,
    remove_duplicates: true,
    handle_outliers: true,
    drop_empty_columns: false
  });
  const [cleaningLoading, setCleaningLoading] = useState(false);

  // --- CHAT STATES ---
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- REPORT GENERATION STATES ---
  const [reportGenerating, setReportGenerating] = useState(false);

  // --- LLM CONFIG/SETTINGS STATES ---
  const [llmProvider, setLlmProvider] = useState<'default' | 'gemini' | 'openai' | 'ollama' | 'mock'>('default');
  const [llmModel, setLlmModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- NEW ADVANCED STATES ---
  // What-if Simulations
  const [simPrice, setSimPrice] = useState<number>(0); // price delta (-20 to +20)
  const [simMarketing, setSimMarketing] = useState<number>(0); // marketing budget delta
  const [simHires, setSimHires] = useState<number>(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // AI Memory list
  const [memories, setMemories] = useState<any[]>([]);
  const [memoryLoading, setMemoryLoading] = useState<boolean>(false);

  // Multiple Explanation Modes
  const [explanationMode, setExplanationMode] = useState<'CEO' | 'Manager' | 'Data Scientist' | 'Student'>('CEO');
  const [explanations, setExplanations] = useState<any>(null);

  // Presentation Slider index
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  // Quick NL search input from welcome hero
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage(null);
    try {
      const res = await api.put('/auth/llm-settings', {
        llm_provider: llmProvider,
        llm_model: llmModel || null,
        llm_api_key: llmApiKey || null
      });
      setUser(res.data);
      setLlmProvider(res.data.llm_provider || 'default');
      setLlmModel(res.data.llm_model || '');
      setLlmApiKey(res.data.llm_api_key || '');
      setSettingsMessage({ type: 'success', text: 'LLM Settings updated successfully!' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to update LLM settings.' });
    } finally {
      setSettingsLoading(false);
    }
  };

  // --- POLLING TIMER ---
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    const token = localStorage.getItem('a3_access_token');
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  useEffect(() => {
    const handleExpired = () => {
      setIsAuthenticated(false);
      setUser(null);
      setSelectedDatasetId(null);
      setSelectedDataset(null);
    };
    window.addEventListener('auth_session_expired', handleExpired);
    return () => window.removeEventListener('auth_session_expired', handleExpired);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDatasets();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetDetails(selectedDatasetId);
      setChatMessages([]);
      setActiveConversationId(null);
      setSimResult(null);
    } else {
      setSelectedDataset(null);
      setPreviewData(null);
      setAnalysisJob(null);
      setDashboards(null);
      setReports([]);
      setMemories([]);
      setExplanations(null);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running')) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          pollAnalysisJob();
        }, 2000);
      }
    } else {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    }
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [analysisJob]);

  // --- API HANDLERS ---
  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
      setIsAuthenticated(true);
      if (res.data) {
        setLlmProvider(res.data.llm_provider || 'default');
        setLlmModel(res.data.llm_model || '');
        setLlmApiKey(res.data.llm_api_key || '');
      }
    } catch (err) {
      localStorage.removeItem('a3_access_token');
      localStorage.removeItem('a3_refresh_token');
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        await fetchCurrentUser();
      } else if (authMode === 'register') {
        if (password !== confirmPassword) {
          setAuthError("Passwords do not match");
          setAuthLoading(false);
          return;
        }
        await api.post('/auth/register', { email, password });
        const res = await api.post('/auth/login', { email, password });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        await fetchCurrentUser();
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed. Please check credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
      setAuthError('Google Client ID is not configured.');
      return;
    }
    setAuthError('');
    setGoogleLoading(true);
    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        throw new Error('Google Identity Services script failed to load.');
      }
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
              localStorage.setItem('a3_access_token', res.data.access_token);
              localStorage.setItem('a3_refresh_token', res.data.refresh_token);
              await fetchCurrentUser();
            } catch (err: any) {
              setAuthError(err.response?.data?.detail || 'Google authentication failed.');
            } finally {
              setGoogleLoading(false);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: () => {
          setGoogleLoading(false);
        }
      });
      client.requestAccessToken();
    } catch (err: any) {
      setAuthError(err.message || 'Failed to initialize Google OAuth.');
      setGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {}
    localStorage.removeItem('a3_access_token');
    localStorage.removeItem('a3_refresh_token');
    setIsAuthenticated(false);
    setUser(null);
    setSelectedDatasetId(null);
    setSelectedDataset(null);
  };

  const fetchDatasets = async () => {
    try {
      const res = await api.get('/datasets/');
      setDatasets(res.data);
      if (res.data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load datasets', err);
    }
  };

  const fetchDatasetDetails = async (id: string) => {
    setGlobalLoading(true);
    try {
      const [datasetRes, previewRes, jobRes, reportsRes, memoryRes, explanationsRes] = await Promise.all([
        api.get(`/datasets/${id}`),
        api.get(`/datasets/${id}/preview?limit=40`),
        api.get(`/datasets/${id}/job`),
        api.get(`/reports/list?dataset_id=${id}`),
        api.get(`/datasets/${id}/memory`),
        api.get(`/datasets/${id}/explanations`).catch(() => ({ data: null }))
      ]);
      
      setSelectedDataset(datasetRes.data);
      setPreviewData(previewRes.data);
      setAnalysisJob(jobRes.data);
      setReports(reportsRes.data);
      setMemories(memoryRes.data);
      setExplanations(explanationsRes.data);
      
      if (jobRes.data.status === 'completed') {
        const dashboardRes = await api.get(`/dashboards/${id}`);
        setDashboards(dashboardRes.data);
      }
      fetchConversations(id);
    } catch (err) {
      console.error('Failed to load dataset details', err);
    } finally {
      setGlobalLoading(false);
    }
  };

  const pollAnalysisJob = async () => {
    if (!selectedDatasetId) return;
    try {
      const res = await api.get(`/datasets/${selectedDatasetId}/job`);
      setAnalysisJob(res.data);
      if (res.data.status === 'completed') {
        fetchDatasetDetails(selectedDatasetId);
      }
    } catch (err) {
      console.error('Error polling job status', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    setUploadProgress(true);
    try {
      const res = await api.post('/datasets/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchDatasets();
      setSelectedDatasetId(res.data.id);
      setActiveTab('datasets');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to parse file.');
    } finally {
      setUploadProgress(false);
    }
  };

  const deleteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return;
    try {
      await api.delete(`/datasets/${id}`);
      setSelectedDatasetId(null);
      await fetchDatasets();
    } catch (err) {
      alert('Failed to delete dataset');
    }
  };

  const handleAutoClean = async () => {
    if (!selectedDatasetId) return;
    setCleaningLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/clean`, cleaningOptions);
      alert('Cleaning completed! Cleaned dataset registered.');
      await fetchDatasets();
      setSelectedDatasetId(res.data.id);
    } catch (err) {
      alert('Failed to run cleaning operations.');
    } finally {
      setCleaningLoading(false);
    }
  };

  // --- NEW AGENT TRIGGER: CEO MODE ---
  const handleTriggerCeoMode = async () => {
    if (!selectedDatasetId) return;
    setGlobalLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/ceo-mode`);
      setAnalysisJob(res.data);
      alert('CEO Mode initialized! Multi-Agent orchestration running in background.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to trigger CEO Mode.');
    } finally {
      setGlobalLoading(false);
    }
  };

  // --- SCENARIO SIMULATOR ACTIONS ---
  const handleRunSimulation = async () => {
    if (!selectedDatasetId) return;
    setSimLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/simulations`, {
        price_delta: simPrice / 100.0,
        marketing_delta: simMarketing / 100.0,
        hiring_delta: simHires
      });
      setSimResult(res.data);
    } catch (err) {
      alert('Failed to run custom What-if simulation.');
    } finally {
      setSimLoading(false);
    }
  };

  // --- AI MEMORY ACTIONS ---
  const handleSaveMemory = async () => {
    if (!selectedDatasetId) return;
    setMemoryLoading(true);
    try {
      await api.post(`/datasets/${selectedDatasetId}/memory`);
      const res = await api.get(`/datasets/${selectedDatasetId}/memory`);
      setMemories(res.data);
      alert('KPI baseline saved to AI Memory.');
    } catch (err) {
      alert('Failed to save KPI baseline.');
    } finally {
      setMemoryLoading(false);
    }
  };

  // --- CHAT ACTIONS ---
  const fetchConversations = async (datasetId: string) => {
    try {
      const res = await api.get(`/chat/conversations?dataset_id=${datasetId}`);
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadConversation = async (convId: string) => {
    setChatLoading(true);
    try {
      const res = await api.get(`/chat/conversations/${convId}`);
      setActiveConversationId(convId);
      setChatMessages(res.data.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent, presetQuestion?: string) => {
    if (e) e.preventDefault();
    const queryText = presetQuestion || chatInput;
    if (!queryText.trim() || !selectedDatasetId) return;

    const tempUserMsg = { role: 'user', content: queryText };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post(`/chat/query?dataset_id=${selectedDatasetId}`, {
        question: queryText,
        conversation_id: activeConversationId || undefined
      });
      setChatMessages(res.data.messages);
      if (!activeConversationId) {
        setActiveConversationId(res.data.conversation_id);
        fetchConversations(selectedDatasetId);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Error: ${err.response?.data?.detail || 'Failed to compile query.'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Execute quick search query from hero
  const handleQuickSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearchQuery.trim()) return;
    setActiveTab('chat');
    handleChatSubmit(undefined, quickSearchQuery);
    setQuickSearchQuery('');
  };

  // --- REPORT ACTIONS ---
  const handleGenerateReport = async () => {
    if (!selectedDatasetId) return;
    setReportGenerating(true);
    try {
      await api.post(`/reports/generate?dataset_id=${selectedDatasetId}`);
      const res = await api.get(`/reports/list?dataset_id=${selectedDatasetId}`);
      setReports(res.data);
      alert('Executive report PDF compiled successfully.');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate PDF.');
    } finally {
      setReportGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, title: string) => {
    try {
      const res = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}.pdf`;
      link.click();
    } catch (err) {
      alert('Failed to download PDF.');
    }
  };

  // --- RENDERING SUB-PANELS ---
  
  // Dashboard Widget Renderer
  const renderDashboardWidgets = () => {
    if (!dashboards || !dashboards.layout) return (
      <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500 select-none">
        No dashboard config generated. Please upload a dataset and complete multi-agent profiling.
      </div>
    );

    const kpiWidgets = dashboards.layout.filter((w: any) => w.type === 'kpi');
    const chartWidgets = dashboards.layout.filter((w: any) => w.type === 'chart');

    return (
      <div className="space-y-8 animate-fade-in">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpiWidgets.map((kpi: any) => (
            <div key={kpi.id} className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">{kpi.title}</p>
                <h3 className="section-heading text-3xl mt-1 text-white">{kpi.config.value}</h3>
                <span className="text-[10px] text-slate-500 font-medium">{kpi.config.label}</span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10 group-hover:scale-105 transition-transform duration-200">
                {kpi.id.includes('quality') ? <Shield size={18} /> : <Database size={18} />}
              </div>
            </div>
          ))}
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Business Domain</p>
              <h3 className="section-heading text-xl mt-1.5 text-white truncate max-w-[150px]">
                {selectedDataset?.business_domain || 'General'}
              </h3>
              <span className="text-[9px] text-teal-400 font-mono font-bold uppercase tracking-wider">AI Classified</span>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/10 group-hover:scale-105 transition-transform duration-200">
              <Sparkles size={18} />
            </div>
          </div>
          <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">File Format</p>
              <h3 className="section-heading text-3xl mt-1 text-white uppercase">{selectedDataset?.file_type}</h3>
              <span className="text-[10px] text-slate-500 font-medium">{(selectedDataset?.file_size / 1024).toFixed(1)} KB size</span>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10 group-hover:scale-105 transition-transform duration-200">
              <FileText size={18} />
            </div>
          </div>
        </div>

        {/* Dataset Health Score section */}
        {analysisJob?.quality_score !== undefined && (
          <div className="glass-panel p-6 rounded-2xl shadow-xl">
            <h3 className="section-heading text-lg text-white mb-5 flex items-center gap-2">
              <Activity size={18} className="text-indigo-400" />
              Dataset Health Scorecard
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-900 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 flex items-center justify-center font-bold text-lg text-white select-none">
                  {analysisJob.quality_score}%
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase">Overall Quality</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Weighted completeness and duplicate penalties.</p>
                </div>
              </div>
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-900 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-teal-500/20 border-t-teal-500 flex items-center justify-center font-bold text-lg text-white select-none">
                  {analysisJob.quality_report?.completeness_score || 100}%
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase">Completeness Index</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Ratio of non-empty data cells in rows.</p>
                </div>
              </div>
              <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-900 flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 border-purple-500/20 border-t-purple-500 flex items-center justify-center font-bold text-lg text-white select-none">
                  {analysisJob.quality_report?.consistency_score || 100}%
                </div>
                <div>
                  <p className="text-slate-400 text-xs font-bold uppercase">Consistency Index</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Outlier spikes and range sanity check.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Insights Panel */}
        {analysisJob?.insights && (
          <div className="glass-panel p-6 rounded-2xl shadow-xl">
            <h3 className="section-heading text-lg text-white mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-teal-400 animate-pulse" />
              Auto Insight Engine
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Key Insights</span>
                {analysisJob.insights.key_findings?.map((item: string, idx: number) => (
                  <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-slate-900 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-teal-400 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Business Opportunities</span>
                {analysisJob.insights.business_opportunities?.map((item: string, idx: number) => (
                  <div key={idx} className="bg-slate-950/50 p-4 rounded-xl border border-slate-900 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-indigo-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Explanatory Widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {chartWidgets.map((widget: any) => (
            <div key={widget.id} className="glass-panel p-5 rounded-2xl flex flex-col justify-between shadow-xl">
              <div className="mb-4">
                <h4 className="section-heading text-base text-white">{widget.title}</h4>
              </div>
              <div className="w-full flex-grow">
                <ChartRenderer plotlyJson={widget.config} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Datasets Library & Preview tab
  const renderDatasetsOverview = () => {
    if (!selectedDataset) return (
      <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 text-xs text-slate-500 select-none">
        No active datasets found. Please upload a dataset.
      </div>
    );

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Dataset Summary & Multi-Explanation card */}
        <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/20 relative shadow-2xl">
          <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-800/80 pb-4 mb-4">
            <div>
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-3 py-1 rounded-full font-bold border border-indigo-500/20 uppercase tracking-wider select-none">
                {selectedDataset.business_domain || 'General Analytics'}
              </span>
              <h2 className="section-heading text-2xl text-white mt-2">{selectedDataset.name}</h2>
            </div>
            {/* Explanation mode buttons */}
            {explanations && (
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['CEO', 'Manager', 'Data Scientist', 'Student'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setExplanationMode(mode)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      explanationMode === mode 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="min-h-[60px] text-slate-300 text-xs md:text-sm leading-relaxed transition-opacity duration-300">
            {explanations && explanations[explanationMode] ? (
              <p className="italic font-medium">"{explanations[explanationMode]}"</p>
            ) : (
              <p>{selectedDataset.summary || 'Summary drafting in progress...'}</p>
            )}
          </div>
        </div>

        {/* Cleaning Action Plan Dashboard */}
        {analysisJob?.quality_report && (
          <div className="glass-panel p-6 rounded-2xl shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/50 pb-5 mb-5">
              <div>
                <h3 className="section-heading text-base flex items-center gap-2 text-white">
                  <AlertTriangle className="text-amber-500" size={18} />
                  Actionable Data Cleaning Plan
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Customize cleaning parameters to run clean commands on dataset copies.</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-[10px]">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                  <input type="checkbox" checked={cleaningOptions.remove_duplicates} onChange={e => setCleaningOptions(prev => ({ ...prev, remove_duplicates: e.target.checked }))} className="accent-indigo-500 rounded h-3.5 w-3.5 cursor-pointer"/>
                  Dedup Rows
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 select-none">
                  <input type="checkbox" checked={cleaningOptions.impute_missing} onChange={e => setCleaningOptions(prev => ({ ...prev, impute_missing: e.target.checked }))} className="accent-indigo-500 rounded h-3.5 w-3.5 cursor-pointer"/>
                  Impute Nulls
                </label>
                <button onClick={handleAutoClean} disabled={cleaningLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 shadow-md">
                  {cleaningLoading ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
                  Auto Clean
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Issues Flagged</span>
                {analysisJob.quality_report.issues?.map((iss: any, idx: number) => (
                  <div key={idx} className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 text-[11px] text-slate-300 leading-normal flex items-start gap-2.5">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-bold shrink-0 ${
                      iss.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>{iss.severity}</span>
                    <span>{iss.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Cleaning Plan Steps</span>
                {analysisJob.quality_report.actionable_plan?.map((step: string, idx: number) => (
                  <div key={idx} className="bg-slate-950/30 p-2.5 rounded-lg border border-slate-900/40 text-[11px] text-slate-300 leading-normal flex items-start gap-2">
                    <span className="text-indigo-400 font-bold shrink-0">•</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Grid Preview section */}
        {previewData && (
          <div className="space-y-3">
            <h3 className="section-heading text-lg text-white flex items-center gap-2">
              <FileText size={18} className="text-teal-400" />
              Raw Data Grid Preview
              <span className="text-xs text-slate-500 font-normal">({selectedDataset.row_count} rows total)</span>
            </h3>
            <PreviewGrid 
              columns={previewData.columns} 
              rows={previewData.rows} 
              columnsMeta={selectedDataset.columns_metadata} 
            />
          </div>
        )}
      </div>
    );
  };

  // Scenario Simulator Tab
  const renderScenarioSimulator = () => {
    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 animate-fade-in">
        <div>
          <h3 className="section-heading text-lg flex items-center gap-2 text-white">
            <Sliders className="text-indigo-400" size={20} />
            What-if Scenario Simulator
          </h3>
          <p className="text-xs text-slate-400 mt-1">Modify pricing adjustments, marketing expenditures, and hires to evaluate forecasted business shifts.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-5 bg-slate-950/60 p-5 rounded-xl border border-slate-900">
            {/* Price Delta Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Pricing Adjustment</span>
                <span className="text-indigo-400 font-mono font-bold">{simPrice >= 0 ? '+' : ''}{simPrice}%</span>
              </div>
              <input 
                type="range" min="-20" max="20" value={simPrice} 
                onChange={(e) => setSimPrice(parseInt(e.target.value))} 
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>-20% Drop</span>
                <span>Baseline</span>
                <span>+20% Hike</span>
              </div>
            </div>

            {/* Marketing Budget Delta Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Marketing Spend Delta</span>
                <span className="text-teal-400 font-mono font-bold">{simMarketing >= 0 ? '+' : ''}{simMarketing}%</span>
              </div>
              <input 
                type="range" min="-30" max="30" value={simMarketing} 
                onChange={(e) => setSimMarketing(parseInt(e.target.value))} 
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>-30% Budget Cut</span>
                <span>Baseline</span>
                <span>+30% Budget Hike</span>
              </div>
            </div>

            {/* Hiring delta */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300 font-semibold">
                <span>Additional Team Resources</span>
                <span className="text-purple-400 font-mono font-bold">{simHires >= 0 ? '+' : ''}{simHires} Hires</span>
              </div>
              <input 
                type="range" min="0" max="10" value={simHires} 
                onChange={(e) => setSimHires(parseInt(e.target.value))} 
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[9px] text-slate-500">
                <span>No hires</span>
                <span>+10 hires</span>
              </div>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simLoading}
              className="btn-primary w-full py-2.5 text-xs font-semibold justify-center shadow-lg"
            >
              {simLoading ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
              Calculate What-if Outcomes
            </button>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-center space-y-4">
            {simResult ? (
              <div className="bg-indigo-950/10 border border-indigo-500/10 p-6 rounded-xl space-y-4 shadow-inner">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Predicted Shift Summary</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                    simResult.pct_change >= 0 
                      ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                      : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>
                    {simResult.pct_change >= 0 ? '+' : ''}{simResult.pct_change}% Impact
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-950">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Baseline {simResult.metric}</p>
                    <p className="text-2xl font-mono font-bold text-slate-300 mt-1">${simResult.before.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-950">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Simulated {simResult.metric}</p>
                    <p className="text-2xl font-mono font-bold text-white mt-1">${simResult.after.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed italic">"{simResult.explanation}"</p>
              </div>
            ) : (
              <div className="bg-slate-900/30 p-6 rounded-xl border border-slate-900 text-center py-12 flex flex-col items-center justify-center text-slate-500">
                <Sliders size={28} className="text-slate-700 mb-3" />
                <p className="text-xs">Adjust sliders on the left and trigger calculation to display business projections.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // AI Memory Comparison Tab
  const renderAIMemory = () => {
    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <h3 className="section-heading text-lg flex items-center gap-2 text-white">
              <Bookmark className="text-purple-400" size={20} />
              AI Memory Snapshot Baseline
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Review performance baselines and verify operational trends compared with previous analyses.</p>
          </div>
          <button
            onClick={handleSaveMemory}
            disabled={memoryLoading || !selectedDatasetId}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center gap-1.5 shadow-md"
          >
            {memoryLoading ? <Loader2 className="animate-spin" size={12} /> : <Bookmark size={12} />}
            Capture Snapshot
          </button>
        </div>

        <div className="space-y-4">
          {memories.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-3 px-4 uppercase font-bold tracking-wider">Date Captured</th>
                    <th className="py-3 px-4 uppercase font-bold tracking-wider">Business Goal</th>
                    <th className="py-3 px-4 uppercase font-bold tracking-wider">Quality score</th>
                    <th className="py-3 px-4 uppercase font-bold tracking-wider">Dimensions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-slate-300">
                  {memories.map((mem) => (
                    <tr key={mem.id} className="hover:bg-slate-900/30">
                      <td className="py-3 px-4 font-medium flex items-center gap-2">
                        <Calendar size={13} className="text-slate-500" />
                        {new Date(mem.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">{mem.business_goals}</td>
                      <td className="py-3 px-4 font-mono font-bold text-teal-400">{mem.kpis?.quality_score}%</td>
                      <td className="py-3 px-4 font-mono text-[11px]">{mem.kpis?.rows} rows × {mem.kpis?.columns} cols</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/40 rounded-xl border border-slate-900 text-xs text-slate-500 select-none">
              No performance baselines captured. Click 'Capture Snapshot' to save dashboard metrics.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Industry Templates list Tab
  const renderIndustryTemplates = () => {
    const templates = [
      { title: "Retail Sales Audit", domain: "Retail & E-commerce", description: "Audits sales registers, highlights top categories, spots negative margins, and forecasts checkout trends." },
      { title: "Financial Transactions Ledger", domain: "Banking & Finance", description: "Performs correlation check on investment metrics, maps outlier transfers, and suggests asset plans." },
      { title: "Patient Log Diagnostics", domain: "Healthcare & Medicine", description: "Details consult distributions, assesses wait time outliers, and builds scheduling recommendations." },
      { title: "SaaS Subscriber Churn", domain: "SaaS Technology", description: "Calculates user session decay, groups customer profiles via K-means, and flags cancel priorities." },
      { title: "HR Productivity Scorecard", domain: "Human Resources", description: "Inspects task completion speeds, runs employee workload balance tests, and structures hiring recommendations." }
    ];

    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 animate-fade-in">
        <div>
          <h3 className="section-heading text-lg flex items-center gap-2 text-white">
            <Layers className="text-teal-400" size={20} />
            Industry Analysis Templates
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Kickstart operational reports using pre-configured target metrics, templates, and agent checklists.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((temp, idx) => (
            <div key={idx} className="bg-slate-950/60 p-5 rounded-2xl border border-slate-900 hover:border-slate-800 transition flex flex-col justify-between group cursor-pointer shadow-md">
              <div>
                <span className="text-[9px] uppercase font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded-md">{temp.domain}</span>
                <h4 className="section-heading text-sm text-slate-200 mt-3 group-hover:text-white transition">{temp.title}</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{temp.description}</p>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500 font-bold mt-4 font-mono group-hover:text-teal-400 transition">
                Apply Template <ChevronRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Briefing slides center
  const renderPresentationSlides = () => {
    const slides = analysisJob?.presentation_deck || [];
    if (slides.length === 0) return null;
    const activeSlide = slides[activeSlideIdx];

    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-6 animate-fade-in border-t-2 border-t-indigo-500/40">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div>
            <h3 className="section-heading text-base flex items-center gap-2 text-white">
              <Award className="text-indigo-400 animate-bounce" size={18} />
              Briefing Slides Center
            </h3>
            <p className="text-[10px] text-slate-500">Autonomous slide deck briefing compiled for executive review.</p>
          </div>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-900 text-xs">
            <button 
              disabled={activeSlideIdx === 0} 
              onClick={() => setActiveSlideIdx(p => p - 1)}
              className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-40"
            >
              ◄ Previous
            </button>
            <span className="px-3 text-slate-300 font-bold">{activeSlideIdx + 1} / {slides.length}</span>
            <button 
              disabled={activeSlideIdx === slides.length - 1} 
              onClick={() => setActiveSlideIdx(p => p + 1)}
              className="px-2 py-1 text-slate-400 hover:text-white disabled:opacity-40"
            >
              Next ►
            </button>
          </div>
        </div>

        {/* Slide view */}
        <div className="bg-slate-950/60 p-8 rounded-2xl border border-slate-900 min-h-[300px] flex flex-col justify-between shadow-inner relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 right-0 p-3 text-[10px] uppercase font-bold text-slate-600 tracking-widest select-none">
            Slide Type: {activeSlide.type}
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-mono">{activeSlide.subtitle}</span>
            <h2 className="section-heading text-xl md:text-2xl text-white mt-1 border-b border-slate-900 pb-3">{activeSlide.title}</h2>
            
            {activeSlide.bullets && (
              <ul className="mt-5 space-y-3">
                {activeSlide.bullets.map((b: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
                    <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeSlide.metrics && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
                {activeSlide.metrics.map((m: any, i: number) => (
                  <div key={i} className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{m.label}</span>
                    <p className="text-lg font-mono font-bold text-slate-200 mt-1">{m.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-8 text-[9px] text-slate-500 flex justify-between border-t border-slate-900 pt-3 select-none">
            <span>A3 Autonomous Presentation Engine</span>
            <span>Private & Confidential</span>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDERING CHAT PLAYGROUND ---
  const renderChatPlayground = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-160px)] animate-fade-in">
        <div className="lg:col-span-1 glass-panel rounded-2xl p-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="section-heading text-xs uppercase font-bold text-slate-400">Conversations</h4>
              <button 
                onClick={() => {
                  setActiveConversationId(null);
                  setChatMessages([]);
                }}
                className="text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded-md transition border border-indigo-500/15 font-semibold"
              >
                + New
              </button>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[350px]">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs truncate transition flex items-center gap-2.5 ${
                      activeConversationId === conv.id 
                        ? 'bg-indigo-650 text-white font-semibold shadow-md' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare size={13} />
                    {conv.title}
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 py-8 select-none">No past conversations</div>
              )}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-900 text-[10px] text-slate-500 flex items-start gap-2 select-none">
            <HelpCircle className="text-indigo-400 shrink-0 mt-0.5" size={13} />
            <span>AI processes queries by generating sandboxed Python scripts locally. Data never leaves your platform workspace.</span>
          </div>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl">
          <div className="flex-grow p-5 overflow-y-auto space-y-4 max-h-[calc(100vh-270px)] bg-slate-950/10">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto pt-6">
                <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full mb-4 border border-indigo-500/10">
                  <MessageSquare size={26} />
                </div>
                <h3 className="section-heading text-lg text-white">Autonomous AI Data Chat</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Type questions in simple English. The AI analyst writes Python aggregations, executes them locally in the secure sandbox, and generates Plotly widgets.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 w-full text-left">
                  <button onClick={() => handleChatSubmit(undefined, "Show Sales distribution by Region")} className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs text-slate-300 transition leading-relaxed">
                    "Show Sales by Region"
                  </button>
                  <button onClick={() => handleChatSubmit(undefined, "What are the top 5 product categories?")} className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs text-slate-300 transition leading-relaxed">
                    "What are the top 5 product categories?"
                  </button>
                  <button onClick={() => handleChatSubmit(undefined, "Identify outlier records in numerical columns")} className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs text-slate-300 transition leading-relaxed">
                    "Identify outlier rows"
                  </button>
                  <button onClick={() => handleChatSubmit(undefined, "Is there a correlation between columns?")} className="p-3 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-xl text-xs text-slate-300 transition leading-relaxed">
                    "Correlation check"
                  </button>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-650 text-white rounded-br-none shadow-md' 
                      : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.chart && (
                    <div className="w-[300px] sm:w-[420px] md:w-[550px] glass-panel p-4 rounded-2xl mt-2.5">
                      <ChartRenderer plotlyJson={msg.chart} />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 py-2.5 px-4 rounded-xl border border-slate-800 w-max animate-pulse">
                <Loader2 className="animate-spin text-indigo-400" size={13} />
                <span>AI analyst coding data script...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-3.5 bg-slate-950 border-t border-slate-850 flex gap-2.5">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask A3 a dataset question (e.g., 'Show highest revenue state.')"
              className="input-clean flex-grow py-2.5 px-3 text-xs placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="btn-primary py-2.5 px-4 select-none shrink-0 flex items-center justify-center shadow-md disabled:opacity-50"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  // Forecasting Panel
  const renderForecasting = () => {
    const hasForecast = analysisJob?.insights?.forecast_chart !== undefined;
    return (
      <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-xl animate-fade-in">
        <div>
          <h3 className="section-heading text-lg flex items-center gap-2.5 text-white">
            <LineChart className="text-teal-400" size={20} />
            Auto Time-Series Trend Forecaster
          </h3>
          <p className="text-xs text-slate-400 mt-1">A3 fits polynomial regression curves locally to compute seasonal trend indicators.</p>
        </div>

        {hasForecast ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 glass-panel p-4 rounded-xl">
              <ChartRenderer plotlyJson={analysisJob.insights.forecast_chart} />
            </div>
            <div className="xl:col-span-1 space-y-4 flex flex-col justify-center">
              <div className="bg-teal-500/5 border border-teal-500/10 p-4.5 rounded-2xl">
                <h4 className="text-xs uppercase text-teal-400 font-bold font-mono tracking-wider mb-2 flex items-center gap-1.5 select-none">
                  <TrendingUp size={13} /> Predictive Trend Commentary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{analysisJob.insights.forecast_commentary || 'Trend is stable according to models.'}"
                </p>
              </div>
              <div className="bg-slate-950/60 p-4.5 border border-slate-900 rounded-2xl space-y-2 text-xs text-slate-500">
                <p className="text-white font-semibold font-sans">Model Details:</p>
                <p>• Type: Polynomial Ridge Regression (2nd degree)</p>
                <p>• Periodicity: Auto resampled timeframe scale</p>
                <p>• Cost: 100% Local / On-Device execution</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center max-w-md mx-auto">
            <div className="p-3 bg-teal-500/10 text-teal-400 rounded-full mb-4 border border-teal-500/10">
              <LineChart size={24} />
            </div>
            <h4 className="section-heading text-sm text-white">No Forecast Compiled</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Temporal forecaster requires a valid date index column (e.g. 'Date', 'Created_At') and numeric metric. Verify data headers inside datasets tab.
            </p>
          </div>
        )}
      </div>
    );
  };

  // PDF report builder
  const renderReports = () => {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="glass-panel p-6 rounded-2xl space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-5">
            <div>
              <h3 className="section-heading text-lg flex items-center gap-2 text-white">
                <FileText className="text-purple-400" size={20} />
                Executive PDF Report Center
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Compile dataset metrics, statistical correlation logs, and recommendation scorecards.</p>
            </div>
            <button
              onClick={handleGenerateReport}
              disabled={reportGenerating || analysisJob?.status !== 'completed'}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg text-xs flex items-center gap-1.5 shadow-md disabled:opacity-50 disabled:pointer-events-none"
            >
              {reportGenerating ? <Loader2 className="animate-spin" size={12} /> : <FileText size={12} />}
              Generate PDF
            </button>
          </div>

          <div className="space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">Compiled Reports</span>
            {reports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="bg-slate-950/60 border border-slate-900 p-4 rounded-xl flex items-center justify-between shadow-md">
                    <div className="space-y-1 min-w-0">
                      <h4 className="section-heading text-xs text-slate-200 truncate max-w-[200px]">{rep.title}</h4>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(rep.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport(rep.id, rep.title)}
                      className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/15"
                    >
                      <Download size={13} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-slate-900 border-dashed text-xs text-slate-500 select-none">
                No reports compiled. Trigger 'Generate PDF' above to create reports.
              </div>
            )}
          </div>
        </div>

        {/* Presentation slide deck rendering */}
        {analysisJob?.presentation_deck && renderPresentationSlides()}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="glass-panel p-6 rounded-2xl max-w-xl mx-auto space-y-5 shadow-xl animate-fade-in">
        <div>
          <h3 className="section-heading text-lg flex items-center gap-2 text-white">
            <Settings className="text-indigo-400" size={20} />
            AI Analyst Routing Settings
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Configure system default configurations or manage API keys for model endpoints.</p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          {settingsMessage && (
            <div className={`p-3.5 rounded-lg text-xs flex items-center gap-2 ${
              settingsMessage.type === 'success' ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {settingsMessage.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
              <span>{settingsMessage.text}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">LLM Provider</label>
            <select
              value={llmProvider}
              onChange={e => {
                const prov = e.target.value as any;
                setLlmProvider(prov);
                if (prov === 'default') setLlmModel('');
                else if (prov === 'gemini') setLlmModel('gemini-2.5-flash');
                else if (prov === 'openai') setLlmModel('gpt-4o-mini');
                else if (prov === 'ollama') setLlmModel('qwen2.5:latest');
                else if (prov === 'mock') setLlmModel('');
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl p-2.5 text-xs text-white"
            >
              <option value="default">System Default (Gemini/Ollama/Mock)</option>
              <option value="gemini">Google Gemini API</option>
              <option value="openai">OpenAI API</option>
              <option value="ollama">Local Ollama</option>
              <option value="mock">Local Heuristic Mock</option>
            </select>
          </div>

          {llmProvider !== 'default' && llmProvider !== 'mock' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Model Name</label>
              <input
                type="text"
                value={llmModel}
                onChange={e => setLlmModel(e.target.value)}
                placeholder="Model identifier name"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          )}

          {llmProvider !== 'default' && llmProvider !== 'ollama' && llmProvider !== 'mock' && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Custom API Key</label>
              <input
                type="password"
                value={llmApiKey}
                onChange={e => setLlmApiKey(e.target.value)}
                placeholder="Enter provider API key"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          )}

          <button type="submit" disabled={settingsLoading} className="btn-primary w-full py-2.5 text-xs font-semibold justify-center shadow-lg">
            {settingsLoading ? <Loader2 className="animate-spin" size={14} /> : null}
            Save AI Configuration
          </button>
        </form>
      </div>
    );
  };

  // --- RENDERING WORKSPACE PLACEHOLDER ---
  const renderWorkspace = () => {
    return (
      <div className="glass-panel p-6 rounded-2xl shadow-xl text-center py-16 flex flex-col items-center justify-center space-y-4 animate-fade-in">
        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/10">
          <Users size={24} />
        </div>
        <h3 className="section-heading text-lg text-white">Team Shared Workspace</h3>
        <p className="text-xs text-slate-400 max-w-sm leading-relaxed">Collaborate with fellow analysts. Share datasets, reports, and AI briefings instantly. This placeholder workspace is design-ready for multi-user integration.</p>
      </div>
    );
  };

  // --- RENDERING RIGHT ACTIVITY PANEL (AGENT HUB) ---
  const renderRightAgentPanel = () => {
    const isRunning = analysisJob?.status === 'pending' || analysisJob?.status === 'running';
    const hasReport = analysisJob?.business_report !== undefined && analysisJob?.business_report !== null;
    
    // Find active agent name based on logs
    let activeAgent = "Orchestrator Agent";
    if (analysisJob?.agent_run_history && analysisJob.agent_run_history.length > 0) {
      const runningLogs = analysisJob.agent_run_history.filter((l: any) => l.status === 'running');
      if (runningLogs.length > 0) {
        activeAgent = runningLogs[runningLogs.length - 1].agent;
      } else {
        const completedLogs = analysisJob.agent_run_history.filter((l: any) => l.status === 'completed');
        if (completedLogs.length > 0) {
          activeAgent = completedLogs[completedLogs.length - 1].agent;
        }
      }
    }

    return (
      <aside className="w-80 border-l border-slate-700/50 bg-slate-900/90 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto p-5 space-y-6">
        {/* Pulse header */}
        <div className="border-b border-slate-800 pb-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">Active Agent status</span>
          <div className="flex items-center gap-3 mt-1.5">
            <div className={`p-1.5 rounded-lg border ${isRunning ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              <Activity className={isRunning ? 'animate-pulse' : ''} size={15} />
            </div>
            <div className="min-w-0">
              <h4 className="section-heading text-xs text-white truncate">{isRunning ? activeAgent : (analysisJob?.status === 'completed' ? 'Agent Pipeline Idle' : 'Ready to Analyze')}</h4>
              <span className="text-[9px] text-slate-500 font-mono font-medium">{isRunning ? 'Running Tasks...' : 'Idle'}</span>
            </div>
          </div>
        </div>

        {/* Timeline Log */}
        <div className="space-y-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">Agent Task Checklist</span>
          <div className="space-y-3 overflow-y-auto max-h-[220px] pr-1">
            {analysisJob?.agent_run_history && analysisJob.agent_run_history.length > 0 ? (
              analysisJob.agent_run_history.map((log: any, idx: number) => (
                <div key={idx} className="flex gap-2.5 items-start text-[11px]">
                  <div className={`shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                    log.status === 'completed' ? 'bg-teal-500' : (log.status === 'failed' ? 'bg-red-500' : 'bg-indigo-500 animate-ping')
                  }`}></div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-300 block">{log.agent}</span>
                    <span className="text-slate-500 leading-tight block mt-0.5">{log.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-600 italic py-4">No tasks executed in this session. Click 'CEO Mode' to initiate.</div>
            )}
          </div>
        </div>

        {/* Decision Engine scorecard */}
        {hasReport && analysisJob.business_report && (
          <div className="bg-slate-950/60 p-4.5 rounded-2xl border border-slate-900 space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider select-none">Decision Scorecard</span>
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase border ${
                analysisJob.business_report.risk_level === 'Low' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 
                (analysisJob.business_report.risk_level === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20')
              }`}>{analysisJob.business_report.risk_level} Risk</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">ROI</span>
                <p className="font-mono text-xs font-bold text-slate-200 mt-0.5">{analysisJob.business_report.expected_roi}</p>
              </div>
              <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-850 text-center">
                <span className="text-[9px] text-slate-500 font-bold uppercase">Confidence</span>
                <p className="font-mono text-xs font-bold text-slate-200 mt-0.5">{analysisJob.business_report.confidence_score}%</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Priority Score ({analysisJob.business_report.priority_score}/100)</span>
              <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full" style={{ width: `${analysisJob.business_report.priority_score}%` }}></div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic">"{analysisJob.business_report.priority_reason}"</p>
            </div>

            {analysisJob.business_report.action_plan && (
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Action Plan Checklist</span>
                {analysisJob.business_report.action_plan.map((act: string, idx: number) => (
                  <div key={idx} className="flex gap-2 text-[10px] text-slate-300 leading-normal">
                    <span className="text-teal-400 font-boldshrink-0">✓</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>
    );
  };

  // --- MAIN AUTH SCREEN RENDERING ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen relative overflow-hidden flex items-center justify-center bg-slate-950">
        {authMode === 'login' && (
          <SignInCard
            emailProp={email} setEmailProp={setEmail} passwordProp={password} setPasswordProp={setPassword}
            isLoadingProp={authLoading} onSubmitProp={handleAuthSubmit} authErrorProp={authError}
            onSwitchToRegister={() => { setAuthMode('register'); setAuthError(''); }}
            onSwitchToForgotPassword={() => { setAuthMode('forgot-password'); setAuthError(''); }}
            onGoogleSubmitProp={handleGoogleAuth} isGoogleLoadingProp={googleLoading}
          />
        )}
        {authMode === 'register' && (
          <SignUpCard
            nameProp={name} setNameProp={setName} emailProp={email} setEmailProp={setEmail}
            passwordProp={password} setPasswordProp={setPassword} confirmPasswordProp={confirmPassword} setConfirmPasswordProp={setConfirmPassword}
            isLoadingProp={authLoading} onSubmitProp={handleAuthSubmit} authErrorProp={authError}
            onSwitchToLogin={() => { setAuthMode('login'); setAuthError(''); }}
            onGoogleSubmitProp={handleGoogleAuth} isGoogleLoadingProp={googleLoading}
          />
        )}
        {authMode === 'forgot-password' && (
          <ForgotPasswordCard
            emailProp={email} setEmailProp={setEmail} isLoadingProp={authLoading}
            onSwitchToLogin={() => { setAuthMode('login'); setAuthError(''); }}
          />
        )}
      </div>
    );
  }

  // --- AUTHENTICATED APP SCREEN ---
  return (
    <div className="min-h-screen flex grid-bg">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="w-64 border-r border-slate-700/50 bg-slate-900/95 flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto">
        <div className="p-5 flex flex-col gap-6 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="p-2 bg-indigo-650 rounded-xl text-white shadow-md">
              <Sparkles size={16} />
            </div>
            <span className="section-heading text-base text-white">A3 <span className="text-indigo-400 text-xs font-semibold uppercase tracking-wider font-mono">Analyst</span></span>
          </div>

          {/* Navigation Items (10 tabs) */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'dashboard' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={15} />
              Insight Dashboard
            </button>
            <button
              onClick={() => setActiveTab('datasets')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'datasets' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Database size={15} />
              Datasets Library
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'chat' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={15} />
              AI Analyst Chat
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'forecast' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <LineChart size={15} />
              Trend Forecasting
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'reports' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileText size={15} />
              Document Reports
            </button>
            <button
              onClick={() => setActiveTab('simulations')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'simulations' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Sliders size={15} />
              Scenario Simulator
            </button>
            <button
              onClick={() => setActiveTab('memory')}
              disabled={!selectedDatasetId}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'memory' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Bookmark size={15} />
              AI Memory
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'workspace' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Users size={15} />
              Team Workspace
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'templates' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Layers size={15} />
              Industry Templates
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'settings' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Settings size={15} />
              AI Settings
            </button>
          </nav>

          {/* Active datasets list */}
          <div className="space-y-2 flex-grow overflow-hidden flex flex-col border-t border-slate-800 pt-4">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-1">Datasets list</span>
            <div className="space-y-1 overflow-y-auto pr-1 flex-grow">
              {datasets.map((ds) => (
                <div 
                  key={ds.id}
                  className={`group flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer ${
                    selectedDatasetId === ds.id 
                      ? 'bg-slate-800/60 border border-slate-700/60 text-white font-medium' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                  onClick={() => setSelectedDatasetId(ds.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-grow">
                    <Database size={13} className={selectedDatasetId === ds.id ? 'text-indigo-400' : 'text-slate-500'} />
                    <span className="truncate">{ds.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDataset(ds.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 rounded transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User logout section */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.email}</p>
            <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono py-0.5 px-1.5 rounded uppercase font-bold tracking-wider">
              {user?.role}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/8 rounded-lg transition"
            title="Log Out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE CONTAINER */}
      <main className="flex-grow p-6 overflow-y-auto max-h-screen">
        {/* Welcome Banner / Search Header */}
        <header className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800/80 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-xl">
          <div className="space-y-1 max-w-xl">
            <h1 className="section-heading text-xl md:text-2xl text-white flex items-center gap-2">
              Autonomous Analyst Briefing Center
            </h1>
            <p className="text-xs text-slate-400">
              Run statistical checking, predictive model runs, and download compiled executive briefs in one place.
            </p>
            {/* Quick Ask bar */}
            <form onSubmit={handleQuickSearchSubmit} className="flex gap-2 mt-4 max-w-md">
              <input
                type="text"
                value={quickSearchQuery}
                onChange={e => setQuickSearchQuery(e.target.value)}
                placeholder="Ask A3 (e.g. 'Show highest revenue state.')"
                className="bg-slate-950/60 border border-slate-800/80 focus:border-indigo-500 focus:outline-none rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 flex-grow"
              />
              <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1.5 px-3 rounded-lg text-xs shadow-md">
                Ask
              </button>
            </form>
          </div>

          <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
            {selectedDatasetId && (
              <button
                onClick={handleTriggerCeoMode}
                className="bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shadow-lg select-none"
              >
                <Sparkles size={14} className="animate-spin" />
                CEO Mode
              </button>
            )}
            {uploadProgress ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 px-4 py-2 rounded-lg">
                <Loader2 className="animate-spin text-indigo-400" size={13} />
                <span>Uploading...</span>
              </div>
            ) : (
              <label className="btn-primary cursor-pointer text-xs select-none py-2 px-4 rounded-xl">
                <Upload size={13} />
                <span>Upload Dataset</span>
                <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={handleFileUpload} className="hidden" />
              </label>
            )}
          </div>
        </header>

        {/* Global Loading Spinner */}
        {globalLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-indigo-500" size={28} />
              <p className="text-xs text-slate-500 font-semibold animate-pulse">Running Agent Checklist...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Show warning if analysis job is running */}
            {selectedDatasetId && analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running') && (
              <div className="bg-indigo-600/10 border border-indigo-500/15 p-5 rounded-2xl text-center mb-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={22} />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Agent Profiling In Progress</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Agents (Understanding, Cleaning, Profiling, Stats, ML, Forecasting, Recommendation, Research) are analyzing files. Dashboard metrics will auto-refresh.
                </p>
              </div>
            )}

            {/* TAB SCREENS */}
            {activeTab === 'dashboard' && renderDashboardWidgets()}
            {activeTab === 'datasets' && renderDatasetsOverview()}
            {activeTab === 'chat' && renderChatPlayground()}
            {activeTab === 'forecast' && renderForecasting()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'simulations' && renderScenarioSimulator()}
            {activeTab === 'memory' && renderAIMemory()}
            {activeTab === 'workspace' && renderWorkspace()}
            {activeTab === 'templates' && renderIndustryTemplates()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        )}
      </main>

      {/* RIGHT ACTIVITY PANEL (AGENT HUB) */}
      {renderRightAgentPanel()}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard, 
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download,
  Settings
} from 'lucide-react';
import api from '@/lib/api';
import PreviewGrid from '@/components/preview-grid';
import ChartRenderer from '@/components/chart-renderer';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';
import { SignUpCard } from '@/components/ui/sign-up-card';
import { ForgotPasswordCard } from '@/components/ui/forgot-password-card';

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
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'chat' | 'forecast' | 'reports' | 'settings'>('upload');
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

  // --- POLLING FOR ANALYSIS JOB ---
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    const token = localStorage.getItem('a3_access_token');
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  // Handle Session Expiry Event
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

  // Fetch datasets list when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchDatasets();
    }
  }, [isAuthenticated]);

  // Fetch dataset info when selection changes
  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetDetails(selectedDatasetId);
      // Clear chat
      setChatMessages([]);
      setActiveConversationId(null);
    } else {
      setSelectedDataset(null);
      setPreviewData(null);
      setAnalysisJob(null);
      setDashboards(null);
      setReports([]);
    }
  }, [selectedDatasetId]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Start polling when analysis job is pending or running
  useEffect(() => {
    if (analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running')) {
      if (!pollTimerRef.current) {
        pollTimerRef.current = setInterval(() => {
          pollAnalysisJob();
        }, 2500);
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
        // Auto sign in
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
      setAuthError('');
      setGoogleLoading(true);
      try {
        const res = await api.post('/auth/google', { access_token: 'mock_token_for_testing' });
        localStorage.setItem('a3_access_token', res.data.access_token);
        localStorage.setItem('a3_refresh_token', res.data.refresh_token);
        await fetchCurrentUser();
      } catch (err: any) {
        setAuthError(err.response?.data?.detail || 'Failed to simulate Google Sign-In.');
      } finally {
        setGoogleLoading(false);
      }
      return;
    }

    setAuthError('');
    setGoogleLoading(true);

    try {
      const google = (window as any).google;
      if (!google || !google.accounts || !google.accounts.oauth2) {
        throw new Error('Google Identity Services script failed to load. Please refresh and try again.');
      }

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'openid email profile',
        callback: async (tokenResponse: any) => {
          if (tokenResponse && tokenResponse.access_token) {
            try {
              // Send the access token to our backend for validation and sign in
              const res = await api.post('/auth/google', { access_token: tokenResponse.access_token });
              localStorage.setItem('a3_access_token', res.data.access_token);
              localStorage.setItem('a3_refresh_token', res.data.refresh_token);
              await fetchCurrentUser();
            } catch (err: any) {
              setAuthError(err.response?.data?.detail || err.message || 'Google authentication failed.');
            } finally {
              setGoogleLoading(false);
            }
          } else {
            setGoogleLoading(false);
          }
        },
        error_callback: (error: any) => {
          setAuthError(error.message || 'Google OAuth prompt error.');
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
    } catch (err) {
      // Continue with local logout even if server call fails
    }
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
      // Auto select first dataset if none selected
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
      const [datasetRes, previewRes, jobRes, reportsRes] = await Promise.all([
        api.get(`/datasets/${id}`),
        api.get(`/datasets/${id}/preview?limit=40`),
        api.get(`/datasets/${id}/job`),
        api.get(`/reports/list?dataset_id=${id}`)
      ]);
      
      setSelectedDataset(datasetRes.data);
      setPreviewData(previewRes.data);
      setAnalysisJob(jobRes.data);
      setReports(reportsRes.data);
      
      // Load dashboard if profiling done
      if (jobRes.data.status === 'completed') {
        const dashboardRes = await api.get(`/dashboards/${id}`);
        setDashboards(dashboardRes.data);
      }
      
      // Load chats
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
        // Refresh full layout
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
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      // Add to list and select it
      await fetchDatasets();
      setSelectedDatasetId(res.data.id);
      setActiveTab('upload');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to parse file. Ensure it is valid CSV, XLSX, or JSON.');
    } finally {
      setUploadProgress(false);
    }
  };

  const deleteDataset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset? This will remove all chats, reports, and files.')) return;
    try {
      await api.delete(`/datasets/${id}`);
      setSelectedDatasetId(null);
      // Refresh list
      await fetchDatasets();
    } catch (err) {
      alert('Failed to delete dataset');
    }
  };

  // --- DATA CLEANING ACTIONS ---
  const handleAutoClean = async () => {
    if (!selectedDatasetId) return;
    setCleaningLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/clean`, cleaningOptions);
      alert('Cleaning completed! A new cleaned version of the dataset has been registered.');
      await fetchDatasets();
      setSelectedDatasetId(res.data.id);
    } catch (err) {
      alert('Failed to run cleaning operations.');
    } finally {
      setCleaningLoading(false);
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
      // Map message lists
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

    // Append user message immediately
    const tempUserMsg = { role: 'user', content: queryText };
    setChatMessages(prev => [...prev, tempUserMsg]);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await api.post(`/chat/query?dataset_id=${selectedDatasetId}`, {
        question: queryText,
        conversation_id: activeConversationId || undefined
      });

      // Update message list
      setChatMessages(res.data.messages);
      
      // If new conversation, set active and fetch lists
      if (!activeConversationId) {
        setActiveConversationId(res.data.conversation_id);
        fetchConversations(selectedDatasetId);
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev, 
        { role: 'assistant', content: `Error: ${err.response?.data?.detail || 'Failed to process sandbox query.'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // --- REPORT ACTIONS ---
  const handleGenerateReport = async () => {
    if (!selectedDatasetId) return;
    setReportGenerating(true);
    try {
      await api.post(`/reports/generate?dataset_id=${selectedDatasetId}`);
      // Refresh list
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
      alert('Failed to download PDF file.');
    }
  };

  // --- RENDERING SUB-PANELS ---
  const renderDashboardWidgets = () => {
    if (!dashboards || !dashboards.layout) return null;

    // Filter into KPI and Chart widgets
    const kpiWidgets = dashboards.layout.filter((w: any) => w.type === 'kpi');
    const chartWidgets = dashboards.layout.filter((w: any) => w.type === 'chart');

    return (
      <div className="space-y-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiWidgets.map((kpi: any) => (
            <div key={kpi.id} className="glass-panel p-6 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider">{kpi.title}</p>
                <h3 className="section-heading text-3xl mt-1 text-white">{kpi.config.value}</h3>
                <span className="text-xs text-slate-500 font-medium">{kpi.config.label}</span>
              </div>
              <div className="p-3.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/10">
                {kpi.id.includes('quality') ? <Shield size={22} /> : <Database size={22} />}
              </div>
            </div>
          ))}
          {/* Business Domain & File Type cards */}
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider">Domain Vertical</p>
              <h3 className="section-heading text-2xl mt-1 text-white truncate max-w-[170px]">
                {selectedDataset?.business_domain || 'General'}
              </h3>
              <span className="text-[11px] text-teal-400 font-mono font-semibold">AI Classified</span>
            </div>
            <div className="p-3.5 bg-teal-500/10 rounded-xl text-teal-400 border border-teal-500/10">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="glass-panel p-6 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[11px] uppercase font-semibold tracking-wider">File Format</p>
              <h3 className="section-heading text-3xl mt-1 text-white uppercase">{selectedDataset?.file_type}</h3>
              <span className="text-xs text-slate-500 font-medium">{(selectedDataset?.file_size / 1024).toFixed(1)} KB size</span>
            </div>
            <div className="p-3.5 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/10">
              <FileText size={22} />
            </div>
          </div>
        </div>

        {/* Actionable Recommendations Panel */}
        {analysisJob?.quality_report && (
          <div className="glass-panel p-8 rounded-2xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-700/50 pb-6 mb-6">
              <div>
                <h3 className="section-heading text-xl flex items-center gap-2.5 text-white">
                  <AlertTriangle className="text-amber-500" size={22} />
                  Data Quality & Recommendation Engine
                </h3>
                <p className="section-subtext text-xs md:text-sm mt-1">
                  AI detected {analysisJob.quality_report.issues?.length || 0} issues. Customize settings and run clean.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-200 select-none">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.remove_duplicates} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, remove_duplicates: e.target.checked }))} 
                    className="accent-indigo-500 rounded h-4 w-4 cursor-pointer"
                  />
                  Dedup Rows
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-200 select-none">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.impute_missing} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, impute_missing: e.target.checked }))} 
                    className="accent-indigo-500 rounded h-4 w-4 cursor-pointer"
                  />
                  Impute Nulls
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-200 select-none">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.handle_outliers} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, handle_outliers: e.target.checked }))} 
                    className="accent-indigo-500 rounded h-4 w-4 cursor-pointer"
                  />
                  Clip Outliers
                </label>
                <button
                  onClick={handleAutoClean}
                  disabled={cleaningLoading}
                  className="btn-primary py-2 px-4 text-xs font-semibold select-none shadow-md"
                >
                  {cleaningLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Auto Clean Dataset
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Issues list */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Detector Logs</p>
                {analysisJob.quality_report.issues?.length > 0 ? (
                  analysisJob.quality_report.issues.map((iss: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 text-xs bg-slate-900/60 p-3 border border-slate-800 rounded-xl">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] uppercase font-bold shrink-0 ${
                        iss.severity === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 
                        (iss.severity === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-blue-500/15 text-blue-400 border border-blue-500/25')
                      }`}>
                        {iss.severity}
                      </span>
                      <span className="text-slate-300 leading-relaxed">{iss.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold bg-teal-500/10 p-3 border border-teal-500/20 rounded-xl">
                    <CheckCircle2 size={16} />
                    <span>Zero issues flagged. Highly clean configuration.</span>
                  </div>
                )}
              </div>
              {/* Action plan */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2">
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Actionable AI Steps</p>
                <div className="space-y-2">
                  {analysisJob.quality_report.actionable_plan?.map((step: string, idx: number) => (
                    <div key={idx} className="text-xs text-slate-300 flex items-start gap-2.5 bg-slate-900/30 p-3 border border-slate-800/40 rounded-xl">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {chartWidgets.map((widget: any) => (
            <div key={widget.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="section-heading text-lg text-white">{widget.title}</h4>
                {/* Find the explanation description from the visualization agent result */}
                {analysisJob?.quality_report && (
                  <p className="text-xs text-slate-400 mt-1 italic">
                    {widget.config?.layout?.title?.text ? `Analyzing trends for ${widget.config.layout.title.text}.` : ''}
                  </p>
                )}
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

  const renderDatasetOverview = () => {
    if (!selectedDataset) return null;
    return (
      <div className="space-y-8">
        {/* Domain and Summary Header */}
        <div className="glass-panel p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20">
          <div className="flex items-center gap-2 mb-3">
            <span className="bg-indigo-500/10 text-indigo-400 text-[11px] px-3 py-1 rounded-full font-semibold border border-indigo-500/20 uppercase tracking-wider select-none">
              {selectedDataset.business_domain || 'General Analytics'}
            </span>
            <span className="text-slate-500 text-[11px] font-medium select-none">AI Understanding Output</span>
          </div>
          <h2 className="section-heading text-3xl text-white mb-3">{selectedDataset.name}</h2>
          <p className="section-subtext text-slate-300 text-sm leading-relaxed max-w-4xl">
            {selectedDataset.summary || 'AI agent is writing the dataset summary...'}
          </p>
        </div>

        {/* Columns Definition List */}
        <div className="glass-panel p-8 rounded-2xl">
          <h3 className="section-heading text-lg text-white mb-6 flex items-center gap-2">
            <Database size={18} className="text-indigo-400" />
            Column Schema & Business Dictionary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {selectedDataset.columns_metadata && 
              Object.entries(selectedDataset.columns_metadata).map(([name, meta]: [string, any]) => (
                <div key={name} className="bg-slate-900/60 p-5 border border-slate-800 rounded-2xl flex flex-col justify-between hover:border-slate-700/80 transition-all duration-200">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-slate-850 pb-2 mb-3">
                      <span className="font-mono text-xs font-semibold text-slate-200 truncate">{name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700/50">
                        {meta.data_type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {meta.description || 'Purpose column description helper.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-[10px] text-slate-500 font-mono font-medium">
                    <span>Nulls: {meta.null_percentage?.toFixed(1)}%</span>
                    <span>Unique: {meta.unique_count}</span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* Data Grid Preview */}
        {previewData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="section-heading text-lg text-white flex items-center gap-2">
                <FileText size={18} className="text-teal-400" />
                Raw Data Grid Preview <span className="text-xs text-slate-500 font-normal font-sans">({selectedDataset.row_count} rows total)</span>
              </h3>
            </div>
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

  // --- RENDERING CHAT INTERFACE ---
  const renderChatPlayground = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-160px)]">
        {/* Left conversations list */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/50 pb-3.5">
              <h4 className="section-heading text-sm text-white">Conversations</h4>
              <button 
                onClick={() => {
                  setActiveConversationId(null);
                  setChatMessages([]);
                }}
                className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2.5 py-1.5 rounded-lg transition border border-indigo-500/15 font-semibold"
              >
                + New Chat
              </button>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-[400px]">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs truncate transition flex items-center gap-2.5 ${
                      activeConversationId === conv.id 
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/10' 
                        : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare size={14} />
                    {conv.title}
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 py-8 select-none">No past conversations</div>
              )}
            </div>
          </div>
          <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-start gap-2 select-none">
            <HelpCircle className="text-indigo-400 shrink-0 mt-0.5" size={14} />
            <span>AI executes pandas scripts locally on your data. Data stays completely on-device.</span>
          </div>
        </div>

        {/* Right main conversation thread */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col justify-between overflow-hidden">
          {/* Thread messages window */}
          <div className="flex-grow p-6 overflow-y-auto space-y-5 max-h-[calc(100vh-280px)] bg-slate-900/10">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-lg mx-auto pt-12">
                <div className="p-4.5 bg-indigo-500/10 text-indigo-400 rounded-full mb-5 border border-indigo-500/10">
                  <MessageSquare size={32} />
                </div>
                <h3 className="section-heading text-xl text-white">Autonomous AI Data Chat</h3>
                <p className="section-subtext text-xs mt-2 leading-relaxed">
                  Ask conversational questions in plain English. The AI agent translates queries to Python data commands, executes them locally in a secure sandbox, and formats results.
                </p>
                <div className="grid grid-cols-2 gap-3 mt-8 w-full">
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Show Sales distribution by Region")} 
                    className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 rounded-xl text-left text-xs text-slate-300 transition leading-relaxed"
                  >
                    "Show Sales by Region"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "What are the top 5 product categories?")} 
                    className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 rounded-xl text-left text-xs text-slate-300 transition leading-relaxed"
                  >
                    "What are the top 5 product categories?"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Identify outlier records in numerical columns")} 
                    className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 rounded-xl text-left text-xs text-slate-300 transition leading-relaxed"
                  >
                    "Identify outlier rows"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Is there a correlation between columns?")} 
                    className="p-3 bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700/80 rounded-xl text-left text-xs text-slate-300 transition leading-relaxed"
                  >
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
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-600/10' 
                      : 'bg-slate-800/60 border border-slate-700/50 text-slate-200 rounded-bl-none shadow-sm'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.chart && (
                    <div className="w-[320px] sm:w-[450px] md:w-[600px] glass-panel p-5 rounded-2xl mt-3">
                      <ChartRenderer plotlyJson={msg.chart} />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2.5 text-xs text-slate-400 bg-slate-800/50 py-3 px-5 rounded-xl border border-slate-700/50 w-max animate-pulse">
                <Loader2 className="animate-spin text-indigo-400" size={14} />
                <span>AI Agent is writing script and analyzing tables...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom input form */}
          <form onSubmit={handleChatSubmit} className="p-4 bg-slate-900 border-t border-slate-700/50 flex gap-2.5">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask A3 a dataset question (e.g., 'What is the sum of profit for each category?')"
              className="input-clean flex-grow py-3 px-4 text-xs placeholder:text-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="btn-primary py-3 px-5 select-none shrink-0 flex items-center justify-center shadow-md disabled:opacity-50"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  // --- RENDERING FORECAST PANEL ---
  const renderForecasting = () => {
    // Check if the completed job has forecast values
    const hasForecast = analysisJob?.insights?.forecast_chart !== undefined;
    
    return (
      <div className="glass-panel p-8 rounded-2xl space-y-8">
        <div>
          <h3 className="section-heading text-xl flex items-center gap-2.5 text-white">
            <LineChart className="text-teal-400" size={22} />
            Auto Time-Series Trend Forecaster
          </h3>
          <p className="section-subtext text-xs md:text-sm mt-1">
            A3 scans columns, isolates date index, and fits predictive regression trends locally.
          </p>
        </div>

        {hasForecast ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 glass-panel p-6 rounded-2xl">
              <ChartRenderer plotlyJson={analysisJob.insights.forecast_chart} />
            </div>
            <div className="xl:col-span-1 space-y-4 flex flex-col justify-center">
              <div className="bg-teal-500/5 border border-teal-500/10 p-5 rounded-2xl">
                <h4 className="text-xs uppercase text-teal-400 font-bold font-mono tracking-wider mb-2.5 flex items-center gap-1.5 select-none">
                  <TrendingUp size={14} /> Predictive Trend Commentary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed italic">
                  "{analysisJob.insights.forecast_commentary || 'Trend is stable according to models.'}"
                </p>
              </div>
              <div className="bg-slate-900/60 p-5 border border-slate-800 rounded-2xl space-y-2.5 text-xs text-slate-400">
                <p className="text-white font-semibold select-none">Model Specifications:</p>
                <p>• Model Type: Polynomial Ridge Regression (2nd degree)</p>
                <p>• Seasonality: Autoregressive Month/Day periodicity</p>
                <p>• target: Automatically selected primary numerical scale</p>
                <p>• Cost: 100% Local ($0.0 API Cost)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-lg mx-auto">
            <div className="p-4 bg-teal-500/10 text-teal-400 rounded-full mb-5 border border-teal-500/10">
              <LineChart size={28} />
            </div>
            <h4 className="section-heading text-base text-white">No Forecast Available</h4>
            <p className="section-subtext text-xs text-slate-400 mt-2 leading-relaxed">
              Forecasting requires a date/time column (e.g. 'Date', 'Year', 'Created_At') and a numeric metric (e.g. 'Sales', 'Profit') to aggregate. Ensure your uploaded dataset matches this schema.
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- RENDERING REPORTS PANEL ---
  const renderReports = () => {
    return (
      <div className="glass-panel p-8 rounded-2xl space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-slate-700/50 pb-6">
          <div>
            <h3 className="section-heading text-xl flex items-center gap-2.5 text-white">
              <FileText className="text-purple-400" size={22} />
              Executive PDF Report Builder
            </h3>
            <p className="section-subtext text-xs md:text-sm mt-1">
              Compile full analytical scorecards, insights, and trend commentary into downloadable executive-ready PDFs.
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={reportGenerating || analysisJob?.status !== 'completed'}
            className="bg-purple-600 hover:bg-purple-500 hover:shadow-purple-500/20 hover:shadow-lg text-white font-semibold py-2.5 px-5 rounded-xl text-xs transition flex items-center gap-2 select-none disabled:opacity-50 disabled:pointer-events-none"
          >
            {reportGenerating ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
            Generate New Report
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider select-none">Compiled Reports</p>
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div key={rep.id} className="bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 p-5 rounded-2xl transition flex items-center justify-between shadow-sm hover:shadow-md">
                  <div className="space-y-1.5 min-w-0">
                    <h4 className="section-heading text-sm text-slate-200 truncate max-w-[200px] sm:max-w-[300px]">{rep.title}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                      <Calendar size={12} />
                      {new Date(rep.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport(rep.id, rep.title)}
                    className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition border border-indigo-500/15"
                  >
                    <Download size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-slate-800 border-dashed text-xs text-slate-500 select-none">
              No reports generated. Click 'Generate New Report' to build one.
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- RENDERING SETTINGS PANEL ---
  const renderSettings = () => {
    return (
      <div className="glass-panel p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
        <div>
          <h3 className="section-heading text-xl flex items-center gap-2.5 text-white">
            <Settings className="text-indigo-400" size={22} />
            AI LLM Model Settings
          </h3>
          <p className="section-subtext text-xs md:text-sm mt-1 text-slate-400">
            Configure system-wide default model configurations or provide custom keys for external LLM providers.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          {settingsMessage && (
            <div className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
              settingsMessage.type === 'success' 
                ? 'bg-teal-500/10 border border-teal-500/20 text-teal-400' 
                : 'bg-red-500/10 border border-red-500/20 text-red-400'
            }`}>
              {settingsMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              <span>{settingsMessage.text}</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 block">LLM Provider</label>
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
              className="w-full bg-slate-950 border border-slate-700/60 focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-xs text-white font-sans"
            >
              <option value="default">System Default (Gemini/Ollama/Mock)</option>
              <option value="gemini">Google Gemini API</option>
              <option value="openai">OpenAI API</option>
              <option value="ollama">Local Ollama</option>
              <option value="mock">Local Heuristic Mock</option>
            </select>
          </div>

          {llmProvider !== 'default' && llmProvider !== 'mock' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Model Name</label>
              <input
                type="text"
                value={llmModel}
                onChange={e => setLlmModel(e.target.value)}
                placeholder={
                  llmProvider === 'gemini' ? 'e.g., gemini-2.5-flash, gemini-1.5-pro' :
                  llmProvider === 'openai' ? 'e.g., gpt-4o-mini, gpt-4o' :
                  llmProvider === 'ollama' ? 'e.g., qwen2.5:latest, llama3' : 'Model name'
                }
                className="w-full bg-slate-950 border border-slate-700/60 focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-xs text-white placeholder:text-slate-500 font-sans"
              />
            </div>
          )}

          {llmProvider !== 'default' && llmProvider !== 'ollama' && llmProvider !== 'mock' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 block">Custom API Key</label>
              <input
                type="password"
                value={llmApiKey}
                onChange={e => setLlmApiKey(e.target.value)}
                placeholder="Enter API key (leave unchanged to keep current key, or empty to clear)"
                className="w-full bg-slate-950 border border-slate-700/60 focus:border-indigo-500 focus:outline-none rounded-xl p-3 text-xs text-white placeholder:text-slate-500 font-sans"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={settingsLoading}
              className="btn-primary w-full py-3 select-none flex items-center justify-center gap-2 font-semibold shadow-md disabled:opacity-50"
            >
              {settingsLoading ? <Loader2 className="animate-spin" size={14} /> : null}
              Save Configuration Settings
            </button>
          </div>
        </form>
      </div>
    );
  };

  // --- MAIN AUTH SCREEN RENDERING ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-screen relative overflow-hidden flex items-center justify-center">
        {authMode === 'login' && (
          <SignInCard
            emailProp={email}
            setEmailProp={setEmail}
            passwordProp={password}
            setPasswordProp={setPassword}
            isLoadingProp={authLoading}
            onSubmitProp={handleAuthSubmit}
            authErrorProp={authError}
            onSwitchToRegister={() => { setAuthMode('register'); setAuthError(''); }}
            onSwitchToForgotPassword={() => { setAuthMode('forgot-password'); setAuthError(''); }}
            onGoogleSubmitProp={handleGoogleAuth}
            isGoogleLoadingProp={googleLoading}
          />
        )}
        {authMode === 'register' && (
          <SignUpCard
            nameProp={name}
            setNameProp={setName}
            emailProp={email}
            setEmailProp={setEmail}
            passwordProp={password}
            setPasswordProp={setPassword}
            confirmPasswordProp={confirmPassword}
            setConfirmPasswordProp={setConfirmPassword}
            isLoadingProp={authLoading}
            onSubmitProp={handleAuthSubmit}
            authErrorProp={authError}
            onSwitchToLogin={() => { setAuthMode('login'); setAuthError(''); }}
            onGoogleSubmitProp={handleGoogleAuth}
            isGoogleLoadingProp={googleLoading}
          />
        )}
        {authMode === 'forgot-password' && (
          <ForgotPasswordCard
            emailProp={email}
            setEmailProp={setEmail}
            isLoadingProp={authLoading}
            onSwitchToLogin={() => { setAuthMode('login'); setAuthError(''); }}
          />
        )}
      </div>
    );
  }

  // --- AUTHENTICATED APP SCREEN ---
  return (
    <div className="min-h-screen flex grid-bg">
      {/* SIDEBAR CONTAINER */}
      <aside className="w-64 border-r border-slate-700/50 bg-slate-900/95 flex flex-col justify-between shrink-0 h-screen sticky top-0">
        <div className="p-5 flex flex-col gap-7 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-1">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Sparkles size={18} />
            </div>
            <span className="section-heading text-lg text-white">A3 <span className="text-indigo-400 text-sm font-medium">Analyst</span></span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'upload' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Upload size={16} />
              Upload & Preview
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'dashboard' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <LayoutDashboard size={16} />
              Exploratory Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'chat' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <MessageSquare size={16} />
              AI Chat Playground
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'forecast' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <LineChart size={16} />
              Trend Forecasting
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'reports' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <FileText size={16} />
              Report Center
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                activeTab === 'settings' ? 'bg-indigo-500/12 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
              }`}
            >
              <Settings size={16} />
              AI Settings
            </button>
            <Link
              href="/sign-in-demo"
              target="_blank"
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
            >
              <Shield size={16} className="text-purple-400 animate-pulse" />
              Interactive Auth Kit
            </Link>
          </nav>

          {/* Uploaded Datasets List */}
          <div className="space-y-2.5 flex-grow overflow-hidden flex flex-col">
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">Active Datasets</span>
            <div className="space-y-1 overflow-y-auto pr-1 flex-grow">
              {datasets.map((ds) => (
                <div 
                  key={ds.id}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-sm transition cursor-pointer ${
                    selectedDatasetId === ds.id 
                      ? 'bg-slate-800/60 border border-slate-700/60 text-white font-medium' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                  onClick={() => setSelectedDatasetId(ds.id)}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-grow">
                    <Database size={14} className={selectedDatasetId === ds.id ? 'text-indigo-400' : 'text-slate-500'} />
                    <span className="truncate">{ds.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDataset(ds.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Account Info Bottom */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-900 flex items-center justify-between">
          <div className="min-w-0 flex-1 pr-2">
            <p className="text-sm font-medium text-slate-200 truncate">{user?.email}</p>
            <span className="text-xs bg-indigo-500/12 border border-indigo-500/20 text-indigo-400 font-mono py-0.5 px-2 rounded-md uppercase font-semibold">
              {user?.role}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-slate-500 hover:text-red-400 p-2 hover:bg-red-500/8 rounded-xl transition"
            title="Log Out"
          >
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE CONTAINER */}
      <main className="flex-grow p-8 overflow-y-auto max-h-screen">
        {/* Workspace Tab Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-700/50 pb-6 mb-8">
          <div>
            <h1 className="section-heading text-2xl md:text-3xl text-white">
              {activeTab === 'upload' ? 'Datasets Library' : 
               activeTab === 'dashboard' ? 'Insight Dashboard' : 
               activeTab === 'chat' ? 'Conversational Chat' : 
               activeTab === 'forecast' ? 'Predictive Forecast' : 
               activeTab === 'settings' ? 'AI Model Settings' : 'Document Center'}
            </h1>
            <p className="section-subtext text-xs md:text-sm mt-1">
              {activeTab === 'upload' ? 'Upload files and preview row properties.' : 
               activeTab === 'dashboard' ? 'Overview of mathematical statistics and charts.' : 
               activeTab === 'chat' ? 'Retrieve data parameters via local AI code sandbox.' : 
               activeTab === 'forecast' ? 'Seasonal trend predictions and regression models.' : 
               activeTab === 'settings' ? 'Configure model routing, default provider, and custom API keys.' : 'Generate or download executive reports.'}
            </p>
          </div>

          {/* Quick upload input header */}
          <div className="flex items-center gap-3">
            {uploadProgress ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/50 border border-slate-700/50 px-4 py-2.5 rounded-xl">
                <Loader2 className="animate-spin text-indigo-400" size={14} />
                <span>Streaming file...</span>
              </div>
            ) : (
              <label className="btn-primary cursor-pointer text-xs select-none">
                <Upload size={14} />
                <span>Upload New Data</span>
                <input 
                  type="file" 
                  accept=".csv,.xlsx,.xls,.json" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        </header>

        {/* Global Loading Spinner */}
        {globalLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <p className="text-xs text-gray-400 font-medium animate-pulse">Assembling workspace views...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Show warning if analysis job is running */}
            {selectedDatasetId && analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running') && (
              <div className="bg-indigo-600/10 border border-indigo-500/15 p-5 rounded-xl text-center mb-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={24} />
                <h3 className="text-sm font-semibold text-white">Multi-Agent Profiling In Progress</h3>
                <p className="text-xs text-gray-400 max-w-md">
                  Data Understanding, Data Cleaning, and Visualization agents are currently scanning columns. Insights will automatically load when completed.
                </p>
              </div>
            )}

            {/* TAB SCREENS */}
            {activeTab === 'upload' && renderDatasetOverview()}
            {activeTab === 'dashboard' && renderDashboardWidgets()}
            {activeTab === 'chat' && renderChatPlayground()}
            {activeTab === 'forecast' && renderForecasting()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        )}
      </main>
    </div>
  );
}

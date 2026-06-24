'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard, 
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download
} from 'lucide-react';
import api from '@/lib/api';
import PreviewGrid from '@/components/preview-grid';
import ChartRenderer from '@/components/chart-renderer';

export default function Home() {
  // --- AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- WORKSPACE STATES ---
  const [activeTab, setActiveTab] = useState<'upload' | 'dashboard' | 'chat' | 'forecast' | 'reports'>('upload');
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
      } else {
        await api.post('/auth/register', { email, password });
        setAuthMode('login');
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

  const handleLogout = () => {
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
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiWidgets.map((kpi: any) => (
            <div key={kpi.id} className="glass-panel p-5 rounded-xl border border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs uppercase font-medium">{kpi.title}</p>
                <h3 className="text-2xl font-bold mt-1 text-white">{kpi.config.value}</h3>
                <span className="text-[11px] text-gray-500">{kpi.config.label}</span>
              </div>
              <div className="p-3 bg-indigo-500/10 rounded-lg text-indigo-400">
                {kpi.id.includes('quality') ? <Shield size={22} /> : <Database size={22} />}
              </div>
            </div>
          ))}
          {/* Business Domain & File Type cards */}
          <div className="glass-panel p-5 rounded-xl border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">Domain Vertical</p>
              <h3 className="text-lg font-semibold mt-1 text-white truncate max-w-[170px]">
                {selectedDataset?.business_domain || 'General'}
              </h3>
              <span className="text-[11px] text-teal-400 font-mono">AI Classified</span>
            </div>
            <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400">
              <Sparkles size={22} />
            </div>
          </div>
          <div className="glass-panel p-5 rounded-xl border border-white/[0.06] flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">File Format</p>
              <h3 className="text-xl font-bold mt-1 text-white uppercase">{selectedDataset?.file_type}</h3>
              <span className="text-[11px] text-gray-500">{(selectedDataset?.file_size / 1024).toFixed(1)} KB size</span>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400">
              <FileText size={22} />
            </div>
          </div>
        </div>

        {/* Actionable Recommendations Panel */}
        {analysisJob?.quality_report && (
          <div className="glass-panel p-6 rounded-xl border border-white/[0.06]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.06] pb-4 mb-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <AlertTriangle className="text-amber-500" size={20} />
                  Data Quality & Recommendation Engine
                </h3>
                <p className="text-gray-400 text-sm mt-0.5">
                  AI detected {analysisJob.quality_report.issues?.length || 0} issues. Customize settings and run clean.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.remove_duplicates} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, remove_duplicates: e.target.checked }))} 
                    className="accent-indigo-500 rounded"
                  />
                  Dedup Rows
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.impute_missing} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, impute_missing: e.target.checked }))} 
                    className="accent-indigo-500 rounded"
                  />
                  Impute Nulls
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={cleaningOptions.handle_outliers} 
                    onChange={e => setCleaningOptions(prev => ({ ...prev, handle_outliers: e.target.checked }))} 
                    className="accent-indigo-500 rounded"
                  />
                  Clip Outliers
                </label>
                <button
                  onClick={handleAutoClean}
                  disabled={cleaningLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-4 rounded-lg font-medium transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {cleaningLoading ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
                  Auto Clean Dataset
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Issues list */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                <p className="text-xs text-gray-500 font-medium">DETECTOR LOGS</p>
                {analysisJob.quality_report.issues?.length > 0 ? (
                  analysisJob.quality_report.issues.map((iss: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-2 text-xs bg-black/40 p-2 border border-white/[0.04] rounded">
                      <span className={`px-1 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${
                        iss.severity === 'high' ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 
                        (iss.severity === 'medium' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25' : 'bg-blue-500/15 text-blue-400 border border-blue-500/25')
                      }`}>
                        {iss.severity}
                      </span>
                      <span className="text-gray-300">{iss.message}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-teal-400 font-medium flex items-center gap-1">
                    <CheckCircle2 size={14} />✓ Zero issues flagged. Highly clean configuration.
                  </p>
                )}
              </div>
              {/* Action plan */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2">
                <p className="text-xs text-gray-500 font-medium font-mono">ACTIONABLE AI STEPS</p>
                {analysisJob.quality_report.actionable_plan?.map((step: string, idx: number) => (
                  <p key={idx} className="text-xs text-gray-300 flex items-start gap-1">
                    <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                    {step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {chartWidgets.map((widget: any) => (
            <div key={widget.id} className="glass-panel p-5 rounded-xl border border-white/[0.06] flex flex-col justify-between">
              <div className="mb-4">
                <h4 className="text-md font-semibold text-white">{widget.title}</h4>
                {/* Find the explanation description from the visualization agent result */}
                {analysisJob?.quality_report && (
                  <p className="text-xs text-gray-400 mt-1 italic">
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
      <div className="space-y-6">
        {/* Domain and Summary Header */}
        <div className="glass-panel p-6 rounded-xl border border-white/[0.06] bg-gradient-to-r from-black/60 to-indigo-950/15">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-500/20 text-indigo-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-indigo-500/30 uppercase tracking-wider">
              {selectedDataset.business_domain || 'General Analytics'}
            </span>
            <span className="text-gray-500 text-xs">AI Understanding Output</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{selectedDataset.name}</h2>
          <p className="text-gray-300 text-sm leading-relaxed max-w-4xl">
            {selectedDataset.summary || 'AI agent is writing the dataset summary...'}
          </p>
        </div>

        {/* Columns Definition List */}
        <div className="glass-panel p-6 rounded-xl border border-white/[0.06]">
          <h3 className="text-md font-semibold text-white mb-4 flex items-center gap-1.5">
            <Database size={18} className="text-indigo-400" />
            Column Schema & Business Dictionary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedDataset.columns_metadata && 
              Object.entries(selectedDataset.columns_metadata).map(([name, meta]: [string, any]) => (
                <div key={name} className="bg-black/40 p-4 border border-white/[0.06] rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5 mb-2">
                      <span className="font-mono text-xs font-semibold text-gray-200 truncate">{name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-white/[0.05] text-gray-400">
                        {meta.data_type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 leading-normal">
                      {meta.description || 'Purpose column description helper.'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500 font-mono">
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-md font-semibold text-white flex items-center gap-1.5">
                <FileText size={18} className="text-teal-400" />
                Raw Data Grid Preview <span className="text-xs text-gray-500 font-normal">({selectedDataset.row_count} rows total)</span>
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
        <div className="lg:col-span-1 glass-panel rounded-xl border border-white/[0.06] p-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h4 className="text-sm font-semibold text-white">Conversations</h4>
              <button 
                onClick={() => {
                  setActiveConversationId(null);
                  setChatMessages([]);
                }}
                className="text-xs bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded transition border border-indigo-500/20"
              >
                + New Chat
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[400px]">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs truncate transition flex items-center gap-2 ${
                      activeConversationId === conv.id 
                        ? 'bg-indigo-600 text-white font-medium shadow-lg' 
                        : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
                    }`}
                  >
                    <MessageSquare size={14} />
                    {conv.title}
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-gray-600 py-6">No past conversations</div>
              )}
            </div>
          </div>
          <div className="bg-black/40 p-3 rounded-lg border border-white/[0.04] text-xs text-gray-500 flex items-start gap-1.5">
            <HelpCircle className="text-indigo-400 shrink-0 mt-0.5" size={14} />
            <span>AI executes pandas scripts locally on your data. Data stays completely on-device.</span>
          </div>
        </div>

        {/* Right main conversation thread */}
        <div className="lg:col-span-3 glass-panel rounded-xl border border-white/[0.06] flex flex-col justify-between overflow-hidden">
          {/* Thread messages window */}
          <div className="flex-grow p-6 overflow-y-auto space-y-4 max-h-[calc(100vh-280px)]">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto pt-16">
                <div className="p-4 bg-indigo-500/15 text-indigo-400 rounded-full mb-4 animate-bounce">
                  <MessageSquare size={32} />
                </div>
                <h3 className="text-lg font-semibold text-white">Autonomous AI Data Chat</h3>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Ask conversational questions in plain English. The AI agent translates queries to Python data commands, executes them locally in a secure sandbox, and formats results.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-6 w-full">
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Show Sales distribution by Region")} 
                    className="p-2.5 bg-black/40 hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-lg text-left text-xs text-gray-300 transition"
                  >
                    "Show Sales by Region"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "What are the top 5 product categories?")} 
                    className="p-2.5 bg-black/40 hover:bg-white/[0.06] border border-white/[0.06] hover:border-white/[0.1] rounded-lg text-left text-xs text-gray-300 transition"
                  >
                    "What are the top 5 product categories?"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Identify outlier records in numerical columns")} 
                    className="p-2.5 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 rounded-lg text-left text-xs text-gray-300 transition"
                  >
                    "Identify outlier rows"
                  </button>
                  <button 
                    onClick={() => handleChatSubmit(undefined, "Is there a correlation between columns?")} 
                    className="p-2.5 bg-gray-900/60 hover:bg-gray-800/80 border border-gray-800 hover:border-gray-700 rounded-lg text-left text-xs text-gray-300 transition"
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
                      ? 'bg-indigo-600 text-white rounded-br-none' 
                      : 'bg-black/50 border border-white/[0.06] text-gray-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.chart && (
                    <div className="w-[320px] sm:w-[450px] md:w-[600px] glass-panel p-4 rounded-xl border border-white/[0.06] mt-2">
                      <ChartRenderer plotlyJson={msg.chart} />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 bg-black/40 py-2.5 px-4 rounded-xl border border-white/[0.04] w-max animate-pulse">
                <Loader2 className="animate-spin text-indigo-400" size={14} />
                <span>AI Agent is writing script and analyzing tables...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Bottom input form */}
          <form onSubmit={handleChatSubmit} className="p-4 bg-black/70 border-t border-white/[0.06] flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask A3 a dataset question (e.g., 'What is the sum of profit for each category?')"
              className="flex-grow bg-black/50 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-3 text-xs text-gray-200 focus:outline-none transition font-medium placeholder:text-gray-600"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 px-5 rounded-xl font-semibold transition shrink-0 flex items-center justify-center disabled:opacity-50"
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
      <div className="glass-panel p-6 rounded-xl border border-white/[0.06] space-y-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-1.5 text-white">
            <LineChart className="text-teal-400" size={20} />
            Auto Time-Series Trend Forecaster
          </h3>
          <p className="text-gray-400 text-sm mt-0.5">
            A3 scans columns, isolates date index, and fits predictive regression trends locally.
          </p>
        </div>

        {hasForecast ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 glass-panel p-4 rounded-xl border border-white/[0.06]">
              <ChartRenderer plotlyJson={analysisJob.insights.forecast_chart} />
            </div>
            <div className="xl:col-span-1 space-y-4 flex flex-col justify-center">
              <div className="bg-teal-500/10 border border-teal-500/20 p-4 rounded-xl">
                <h4 className="text-xs uppercase text-teal-400 font-semibold font-mono tracking-wider mb-2 flex items-center gap-1">
                  <TrendingUp size={14} /> Predictive Trend Commentary
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed italic">
                  "{analysisJob.insights.forecast_commentary || 'Trend is stable according to models.'}"
                </p>
              </div>
              <div className="bg-black/40 p-4 border border-white/[0.06] rounded-xl space-y-2 text-xs text-gray-400">
                <p className="text-white font-medium">Model Specifications:</p>
                <p>• Model Type: Polynomial Ridge Regression (2nd degree)</p>
                <p>• Seasonality: Autoregressive Month/Day periodicity</p>
                <p>• target: Automatically selected primary numerical scale</p>
                <p>• Cost: 100% Local ($0.0 API Cost)</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center max-w-md mx-auto">
            <div className="p-4 bg-teal-500/15 text-teal-400 rounded-full mb-3">
              <LineChart size={28} />
            </div>
            <h4 className="text-sm font-semibold text-white">No Forecast Available</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
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
      <div className="glass-panel p-6 rounded-xl border border-white/[0.06] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-1.5 text-white">
              <FileText className="text-purple-400" size={20} />
              Executive PDF Report Builder
            </h3>
            <p className="text-gray-400 text-sm mt-0.5">
              Compile full analytical scorecards, insights, and trend commentary into downloadable executive-ready PDFs.
            </p>
          </div>
          <button
            onClick={handleGenerateReport}
            disabled={reportGenerating || analysisJob?.status !== 'completed'}
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-5 rounded-lg text-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {reportGenerating ? <Loader2 className="animate-spin" size={14} /> : <FileText size={14} />}
            Generate New Report
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-500 font-medium">COMPILED REPORTS</p>
          {reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((rep) => (
                <div key={rep.id} className="bg-black/40 border border-white/[0.06] hover:border-indigo-500/30 p-4 rounded-xl transition flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-gray-200 truncate max-w-[200px] sm:max-w-[300px]">{rep.title}</h4>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(rep.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadReport(rep.id, rep.title)}
                    className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg transition border border-indigo-500/15"
                  >
                    <Download size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-black/20 rounded-xl border border-white/[0.04] border-dashed text-xs text-gray-600">
              No reports generated. Click 'Generate New Report' to build one.
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- MAIN AUTH SCREEN RENDERING ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center grid-bg p-6">
        <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-white/[0.06] shadow-2xl shadow-black/50 relative">
          {/* Accent glow lights */}
          <div className="absolute -top-14 -left-14 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full glow-pulse" />
          <div className="absolute -bottom-14 -right-14 w-32 h-32 bg-violet-500/8 blur-3xl rounded-full glow-pulse" />

          <div className="flex items-center gap-2 mb-6 justify-center">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Sparkles size={20} />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">A3 <span className="text-indigo-400 font-normal">Analytics</span></span>
          </div>

          <h3 className="text-lg font-semibold text-center text-white mb-1">
            {authMode === 'login' ? 'Welcome Back' : 'Create Sandbox Account'}
          </h3>
          <p className="text-xs text-gray-400 text-center mb-6 leading-relaxed">
            Autonomous local AI Data Analyst. Zero API costs, absolute data privacy on your machine.
          </p>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/15 text-red-400 text-xs p-3 rounded-lg mb-4 text-center">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full bg-black/60 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none transition placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5">Secret Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/60 border border-white/[0.08] focus:border-indigo-500/60 rounded-xl px-4 py-2.5 text-xs text-gray-200 focus:outline-none transition placeholder:text-gray-600"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg disabled:opacity-50"
            >
              {authLoading && <Loader2 className="animate-spin" size={14} />}
              {authMode === 'login' ? 'Sign In' : 'Register Account'}
            </button>
          </form>

          <div className="mt-6 border-t border-white/[0.06] pt-4 text-center">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              {authMode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHENTICATED APP SCREEN ---
  return (
    <div className="min-h-screen flex grid-bg">
      {/* SIDEBAR CONTAINER */}
      <aside className="w-64 border-r border-white/[0.06] bg-black/70 backdrop-blur-2xl flex flex-col justify-between shrink-0 h-screen sticky top-0">
        <div className="p-4 flex flex-col gap-6 overflow-hidden">
          {/* Logo */}
          <div className="flex items-center gap-2 px-2">
            <div className="p-1.5 bg-indigo-600 rounded-md text-white">
              <Sparkles size={16} />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">A3 <span className="text-indigo-400 text-xs font-normal">Analyst</span></span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === 'upload' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <Upload size={15} />
              Upload & Preview
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'dashboard' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <LayoutDashboard size={15} />
              Exploratory Dashboard
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'chat' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <MessageSquare size={15} />
              AI Chat Playground
            </button>
            <button
              onClick={() => setActiveTab('forecast')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'forecast' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <LineChart size={15} />
              Trend Forecasting
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              disabled={!selectedDatasetId || analysisJob?.status !== 'completed'}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed ${
                activeTab === 'reports' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-200'
              }`}
            >
              <FileText size={15} />
              Report Center
            </button>
          </nav>

          {/* Uploaded Datasets List */}
          <div className="space-y-2 flex-grow overflow-hidden flex flex-col">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-2">Active Datasets</span>
            <div className="space-y-1 overflow-y-auto pr-1 flex-grow">
              {datasets.map((ds) => (
                <div 
                  key={ds.id}
                  className={`group flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                    selectedDatasetId === ds.id 
                      ? 'bg-white/[0.04] border border-white/[0.08] text-white font-medium' 
                      : 'text-gray-500 hover:bg-white/[0.03] hover:text-gray-300'
                  }`}
                  onClick={() => setSelectedDatasetId(ds.id)}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-grow">
                    <Database size={13} className={selectedDatasetId === ds.id ? 'text-indigo-400' : 'text-gray-500'} />
                    <span className="truncate">{ds.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDataset(ds.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 rounded transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* User Account Info Bottom */}
        <div className="p-4 border-t border-white/[0.06] bg-black/60 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-200 truncate">{user?.email}</p>
            <span className="text-[9px] bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 font-mono py-0.5 px-1.5 rounded uppercase font-bold">
              {user?.role} Badge
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="text-gray-500 hover:text-red-400 p-1.5 hover:bg-red-500/5 rounded-lg transition"
            title="Log Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT WORKSPACE CONTAINER */}
      <main className="flex-grow p-8 overflow-y-auto max-h-screen">
        {/* Workspace Tab Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-5 mb-6">
          <div>
            <h1 className="text-xl font-bold text-white uppercase tracking-wide">
              {activeTab === 'upload' ? 'Datasets Library' : 
               activeTab === 'dashboard' ? 'Insight Dashboard' : 
               activeTab === 'chat' ? 'Conversational Chat' : 
               activeTab === 'forecast' ? 'Predictive Forecast' : 'Document Center'}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {activeTab === 'upload' ? 'Upload files and preview row properties.' : 
               activeTab === 'dashboard' ? 'Overview of mathematical statistics and charts.' : 
               activeTab === 'chat' ? 'Retrieve data parameters via local AI code sandbox.' : 
               activeTab === 'forecast' ? 'Seasonal trend predictions and regression models.' : 'Generate or download executive reports.'}
            </p>
          </div>

          {/* Quick upload input header */}
          <div className="flex items-center gap-3">
            {uploadProgress ? (
              <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-black/60 border border-white/[0.06] px-3 py-1.5 rounded-lg">
                <Loader2 className="animate-spin text-indigo-400" size={14} />
                <span>Streaming file...</span>
              </div>
            ) : (
              <label className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs cursor-pointer transition flex items-center gap-1.5 shadow-lg">
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
          </div>
        )}
      </main>
    </div>
  );
}

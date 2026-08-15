'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard, 
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download,
  Settings, Sliders, Bookmark, Users, Layers, Activity, ChevronRight, Play, Award,
  Search, Bell, ChevronDown, AlignLeft, Grid, Info, Clock, AlertCircle, Plus, Terminal, Cpu
} from 'lucide-react';
import api from '@/lib/api';
import PreviewGrid from '@/components/preview-grid';
import ChartRenderer from '@/components/chart-renderer';
import { Component as SignInCard } from '@/components/ui/sign-in-card-2';
import { SignUpCard } from '@/components/ui/sign-up-card';
import { ForgotPasswordCard } from '@/components/ui/forgot-password-card';
import { Toast } from '@/components/ui/toast';
import { CommandPalette } from '@/components/ui/command-palette';
import { LocalOnboardingWizard } from '@/components/ui/local-onboarding-wizard';

type ActiveTab = 'dashboard' | 'datasets' | 'chat' | 'forecast' | 'reports' | 'simulations' | 'memory' | 'workspace' | 'templates' | 'settings';

export default function Home() {
  // --- AUTHENTICATION & ONBOARDING STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [authMode, setAuthMode] = useState<'landing' | 'login' | 'register' | 'forgot-password'>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [user, setUser] = useState<any>(null);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // --- WORKSPACE STATES ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
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

  // --- MULTI-LLM PROVIDER KEYS (PHASE 2) ---
  const [llmProvider, setLlmProvider] = useState<string>('default');
  const [llmModel, setLlmModel] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmKeys, setLlmKeys] = useState<Record<string, string>>({
    gemini: '', openai: '', anthropic: '', deepseek: '', mistral: ''
  });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // --- WHAT-IF SIMULATIONS ---
  const [simPrice, setSimPrice] = useState<number>(0);
  const [simMarketing, setSimMarketing] = useState<number>(0);
  const [simHires, setSimHires] = useState<number>(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [simLoading, setSimLoading] = useState<boolean>(false);

  // --- AI MEMORY SNAPSHOTS ---
  const [memories, setMemories] = useState<any[]>([]);
  const [memoryLoading, setMemoryLoading] = useState<boolean>(false);

  // --- COLLABORATION WORKSPACES & COMMENTS (PHASE 2) ---
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // --- EXPLANATION TRANSLATION STYLES ---
  const [explanationMode, setExplanationMode] = useState<'CEO' | 'Manager' | 'Data Scientist' | 'Student'>('CEO');
  const [explanations, setExplanations] = useState<any>(null);

  // --- DEVELOPER HUD / SYSTEM OBSERVABILITY (PHASE 2) ---
  const [developerModeActive, setDeveloperModeActive] = useState<boolean>(false);

  // Presentation Slider index
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);

  // Quick NL search input
  const [quickSearchQuery, setQuickSearchQuery] = useState<string>('');

  // Drag-and-drop file upload states
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Collapsible sidebar state
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Command palette state
  const [commandPaletteOpen, setCommandPaletteOpen] = useState<boolean>(false);

  // Toast Notification state
  const [toast, setToast] = useState<{ type: 'success' | 'warning' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'warning' | 'error' | 'info', message: string) => {
    setToast({ type, message });
  };

  // Keyboard shortcut Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await api.put('/auth/llm-settings', {
        llm_provider: llmProvider,
        llm_model: llmModel || null,
        llm_api_key: llmApiKey || null,
        llm_keys: llmKeys
      });
      setUser(res.data);
      setLlmProvider(res.data.llm_provider || 'default');
      setLlmModel(res.data.llm_model || '');
      setLlmApiKey(res.data.llm_api_key || '');
      setLlmKeys(res.data.llm_keys || {});
      showToast('success', 'Enterprise AI Model configurations updated!');
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to update settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // --- POLLING TIMER ---
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [workflowRunId, setWorkflowRunId] = useState<string | null>(null);

  // --- INITIAL CHECK ---
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const res = await api.get('/onboarding/status');
        if (!res.data.setup_completed) {
          setShowOnboardingWizard(true);
        }
      } catch (err) {
        console.warn('Failed to check onboarding status:', err);
      }
    };
    checkOnboardingStatus();

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
      fetchWorkspaces();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedDatasetId) {
      fetchDatasetDetails(selectedDatasetId);
      fetchComments(selectedDatasetId);
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
      setComments([]);
    }
  }, [selectedDatasetId]);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchWorkspaceMembers(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (workflowRunId) {
      timer = setInterval(async () => {
        try {
          const res = await api.get(`/workflows/runs/${workflowRunId}`);
          const run = res.data;
          
          setAnalysisJob({
             status: run.status,
             agent_run_history: run.node_runs.map((nr: any, idx: number) => ({
                 agent: `Workflow Node ${idx + 1}`,
                 status: nr.status,
                 message: nr.error_message || `Executing step...`
             }))
          });
          
          if (run.status === 'completed' || run.status === 'failed') {
             if (timer) clearInterval(timer);
             setWorkflowRunId(null);
             showToast(run.status === 'completed' ? 'success' : 'error', `Workflow finished with status: ${run.status}`);
             if (run.status === 'completed') fetchDatasetDetails(selectedDatasetId!);
          }
        } catch (err) {
          console.error(err);
        }
      }, 2000);
    } else if (analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running')) {
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
      if (timer) clearInterval(timer);
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [workflowRunId, analysisJob?.status]);

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
        setLlmKeys(res.data.llm_keys || {});
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
        showToast('success', 'Logged in successfully!');
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
        showToast('success', 'Registration completed successfully!');
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.detail || 'Authentication failed.');
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
        throw new Error('Google OAuth script missing.');
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
              showToast('success', 'Logged in with Google.');
            } catch (err: any) {
              setAuthError(err.response?.data?.detail || 'Google auth failed.');
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
    showToast('info', 'Logged out.');
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
        showToast('success', 'Autonomous data profiling completed!');
      }
    } catch (err) {
      console.error('Error polling job status', err);
    }
  };

  const handleFileUpload = async (file: File) => {
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
      showToast('success', `File ${file.name} uploaded successfully!`);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to parse file.');
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
      showToast('info', 'Dataset deleted.');
    } catch (err) {
      showToast('error', 'Failed to delete dataset.');
    }
  };

  const handleAutoClean = async () => {
    if (!selectedDatasetId) return;
    setCleaningLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/clean`, cleaningOptions);
      showToast('success', 'Data cleaning completed! Cleaned copy registered.');
      await fetchDatasets();
      setSelectedDatasetId(res.data.id);
    } catch (err) {
      showToast('error', 'Failed to execute data cleaning.');
    } finally {
      setCleaningLoading(false);
    }
  };

  const handleTriggerCeoMode = async () => {
    if (!selectedDatasetId) return;
    setGlobalLoading(true);
    try {
      const res = await api.post(`/datasets/${selectedDatasetId}/ceo-mode`);
      setAnalysisJob(res.data);
      showToast('info', 'CEO Mode initialized. Orchestrating parallel agents in background.');
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to trigger CEO Mode.');
    } finally {
      setGlobalLoading(false);
    }
  };

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
      showToast('success', 'Simulation recalculation finished.');
    } catch (err) {
      showToast('error', 'Failed to run What-if simulation.');
    } finally {
      setSimLoading(false);
    }
  };

  const handleApplyTemplate = async (templateTitle: string) => {
    if (!selectedDatasetId) {
      showToast('warning', 'Please upload or select a dataset first.');
      return;
    }
    setGlobalLoading(true);
    try {
      const res = await api.post('/workflows/template', {
        template_title: templateTitle,
        dataset_id: selectedDatasetId
      });
      setWorkflowRunId(res.data.id);
      showToast('info', `Initializing ${templateTitle} workflow...`);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to start template workflow.');
    } finally {
      setGlobalLoading(false);
    }
  };

  const handleSaveMemory = async () => {
    if (!selectedDatasetId) return;
    setMemoryLoading(true);
    try {
      await api.post(`/datasets/${selectedDatasetId}/memory`);
      const res = await api.get(`/datasets/${selectedDatasetId}/memory`);
      setMemories(res.data);
      showToast('success', 'Current dashboard state archived in AI memory.');
    } catch (err) {
      showToast('error', 'Failed to archive memory.');
    } finally {
      setMemoryLoading(false);
    }
  };

  // --- COLLABORATION HANDLERS (PHASE 2) ---
  const fetchWorkspaces = async () => {
    try {
      const res = await api.get('/collaboration/workspaces');
      setWorkspaces(res.data);
      if (res.data.length > 0 && !activeWorkspaceId) {
        setActiveWorkspaceId(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const res = await api.post('/collaboration/workspaces', { name: newWorkspaceName });
      setWorkspaces(prev => [...prev, res.data]);
      setActiveWorkspaceId(res.data.id);
      setNewWorkspaceName('');
      showToast('success', `Workspace '${res.data.name}' created!`);
    } catch (err) {
      showToast('error', 'Failed to create workspace.');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !activeWorkspaceId) return;
    try {
      await api.post(`/collaboration/workspaces/${activeWorkspaceId}/invite`, {
        email: inviteEmail,
        role: inviteRole
      });
      showToast('success', `Invitation sent to ${inviteEmail}.`);
      setInviteEmail('');
      fetchWorkspaceMembers(activeWorkspaceId);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Invitation failed.');
    }
  };

  const fetchWorkspaceMembers = async (id: string) => {
    try {
      const res = await api.get(`/collaboration/workspaces/${id}/members`);
      setWorkspaceMembers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchComments = async (datasetId: string) => {
    try {
      const res = await api.get(`/collaboration/comments/${datasetId}`);
      setComments(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedDatasetId) return;
    try {
      const res = await api.post('/collaboration/comments', {
        dataset_id: selectedDatasetId,
        text: newCommentText
      });
      setComments(prev => [...prev, res.data]);
      setNewCommentText('');
      showToast('success', 'Comment posted.');
    } catch (err) {
      showToast('error', 'Failed to post comment.');
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
        { role: 'assistant', content: `Error: ${err.response?.data?.detail || 'Failed to resolve chat query.'}` }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGenerateReport = async (format: string = "pdf") => {
    if (!selectedDatasetId) return;
    setReportGenerating(true);
    try {
      await api.post(`/reports/generate?dataset_id=${selectedDatasetId}&format=${format}`);
      const res = await api.get(`/reports/list?dataset_id=${selectedDatasetId}`);
      setReports(res.data);
      showToast('success', `${format.toUpperCase()} executive briefing generated successfully.`);
    } catch (err: any) {
      showToast('error', err.response?.data?.detail || 'Failed to compile report.');
    } finally {
      setReportGenerating(false);
    }
  };

  const handleDownloadReport = async (reportId: string, title: string, format: string) => {
    try {
      const res = await api.get(`/reports/download/${reportId}`, { responseType: 'blob' });
      const mime = format === "pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "application/pdf";
      const blob = new Blob([res.data], { type: mime });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${title.replace(/\s+/g, '_')}.${format}`;
      link.click();
    } catch (err) {
      showToast('error', 'Download link failed.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // --- SKELETON LOADERS FOR DAMP EFFECT ---
  const renderDashboardSkeletons = () => {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel p-5 rounded-xl space-y-3 h-24">
              <div className="skeleton-line h-3 w-16" />
              <div className="skeleton-line h-6 w-28" />
            </div>
          ))}
        </div>
        <div className="glass-panel p-6 rounded-xl space-y-4">
          <div className="skeleton-line h-4 w-40" />
          <div className="grid grid-cols-3 gap-4">
            <div className="skeleton-line h-20 rounded-lg" />
            <div className="skeleton-line h-20 rounded-lg" />
            <div className="skeleton-line h-20 rounded-lg" />
          </div>
        </div>
      </div>
    );
  };

  // --- MAIN WIDGETS RENDERING ---
  const renderDashboardWidgets = () => {
    if (!dashboards || !dashboards.layout) return (
      <div className="glass-panel p-8 rounded-xl text-center py-16 flex flex-col items-center justify-center text-slate-500 border-dashed">
        <Database size={24} className="text-slate-600 mb-3" />
        <p className="text-xs">No overview generated. Upload a dataset to compile dashboards.</p>
      </div>
    );

    const kpiWidgets = dashboards.layout.filter((w: any) => w.type === 'kpi');
    const chartWidgets = dashboards.layout.filter((w: any) => w.type === 'chart');

    // Smart KPI suggestions from Phase 2
    const smartKpis = analysisJob?.business_report?.smart_kpis;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* KPIs Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiWidgets.map((kpi: any) => (
            <div key={kpi.id} className="glass-panel glow-border p-5 rounded-xl flex items-center justify-between transition-all hover:bg-white/5 cursor-default relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <div className="relative z-10">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">{kpi.title}</p>
                <h3 className="section-heading text-2xl mt-1 text-white font-mono">{kpi.config.value}</h3>
              </div>
              <div className="relative z-10 p-2.5 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/10 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                {kpi.id.includes('quality') ? <Shield size={16} /> : <Database size={16} />}
              </div>
            </div>
          ))}
          
          {smartKpis?.growth_multiplier && (
            <div className="glass-panel p-5 rounded-xl flex items-center justify-between bg-gradient-to-br from-indigo-950/20 to-slate-950">
              <div>
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Growth Potential</p>
                <h3 className="section-heading text-2xl mt-1 text-teal-400 font-mono">+{smartKpis.growth_multiplier}%</h3>
              </div>
              <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400 border border-teal-500/10">
                <TrendingUp size={16} />
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Smart KPI engine block */}
        {smartKpis && (
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <div>
              <h3 className="section-heading text-sm text-slate-200 flex items-center gap-2">
                <Layers size={15} className="text-teal-400" />
                Smart KPI Engine Diagnoses
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Auto-detected metric scorecards and recommended targets.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase block select-none">Detected Performance Targets</span>
                {Object.keys(smartKpis.detected_kpis).length > 0 ? (
                  Object.entries(smartKpis.detected_kpis).map(([kpiName, value]: [string, any]) => (
                    <div key={kpiName} className="bg-slate-900/40 p-2.5 rounded border border-slate-850 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 capitalize">{kpiName} ({value.mapped_column})</span>
                      <span className="font-mono text-teal-400 font-bold">${value.total.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-550 italic">No standard KPI headers detected directly from column labels.</p>
                )}
              </div>
              
              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase block select-none">KPI Recommendations & Logic formulas</span>
                {smartKpis.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="bg-slate-900/20 p-2.5 rounded border border-slate-850/60 text-xs text-slate-400 leading-normal flex items-start gap-2">
                    <span className="text-indigo-400 shrink-0 font-bold">•</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Plotly widgets */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {chartWidgets.map((widget: any) => (
            <div key={widget.id} className="glass-panel p-5 rounded-xl flex flex-col justify-between">
              <div className="mb-3">
                <h4 className="section-heading text-sm text-slate-200">{widget.title}</h4>
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

  // Datasets overview
  const renderDatasetsOverview = () => {
    if (!selectedDataset) return (
      <div className="glass-panel p-10 rounded-xl text-center py-20 flex flex-col items-center justify-center text-slate-500 border-dashed">
        <Database size={32} className="text-slate-700 mb-3" />
        <h4 className="section-heading text-sm text-white">Upload Area Empty</h4>
      </div>
    );

    return (
      <div className="space-y-6">
        <div className="glass-panel p-6 rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/5 relative">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-slate-800 pb-4 mb-4">
            <div>
              <span className="bg-indigo-500/10 text-indigo-400 text-[10px] px-2.5 py-0.5 rounded-full font-bold border border-indigo-500/20 uppercase tracking-wider select-none">
                {selectedDataset.business_domain || 'General Analytics'}
              </span>
              <h2 className="section-heading text-xl text-white mt-1.5">{selectedDataset.name}</h2>
            </div>
            {explanations && (
              <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-[10px]">
                {(['CEO', 'Manager', 'Data Scientist', 'Student'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setExplanationMode(mode)}
                    className={`px-3 py-1 rounded-md transition font-bold ${
                      explanationMode === mode ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-300 leading-relaxed font-sans min-h-[40px]">
            {explanations && explanations[explanationMode] ? (
              <p className="italic font-medium">"{explanations[explanationMode]}"</p>
            ) : (
              <p>{selectedDataset.summary || 'Summary is compiling...'}</p>
            )}
          </div>
        </div>

        {/* Discussions Comments thread for shared workspaces (PHASE 2) */}
        <div className="glass-panel p-5 rounded-xl space-y-4">
          <div>
            <h3 className="section-heading text-sm text-white flex items-center gap-2">
              <MessageSquare size={15} className="text-indigo-400" />
              Dataset Discussion & Collaboration Feed
            </h3>
            <p className="text-[10px] text-slate-500">Post remarks or coordinate data cleaning directives with team members.</p>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[180px] pr-1">
            {comments.length > 0 ? (
              comments.map((c) => (
                <div key={c.id} className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 text-xs">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 font-mono">
                    <span className="font-semibold text-slate-400">{c.user_email}</span>
                    <span>{new Date(c.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-300">{c.text}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-600 italic select-none">No feedback remarks posted. Start discussion below.</p>
            )}
          </div>
          <form onSubmit={handlePostComment} className="flex gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={e => setNewCommentText(e.target.value)}
              placeholder="Post team feedback note..."
              className="input-clean text-xs flex-grow py-1.5 focus:outline-none"
            />
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-md shrink-0">
              Comment
            </button>
          </form>
        </div>

        {/* Cleaning Scorecard */}
        {analysisJob?.quality_report && (
          <div className="glass-panel p-5 rounded-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="section-heading text-sm flex items-center gap-2 text-white">
                  <AlertTriangle className="text-amber-500" size={16} />
                  Cleaning Directives
                </h3>
              </div>
              <div className="flex items-center gap-3.5 text-[10px]">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                  <input type="checkbox" checked={cleaningOptions.remove_duplicates} onChange={e => setCleaningOptions(prev => ({ ...prev, remove_duplicates: e.target.checked }))} className="accent-indigo-500 rounded h-3.5 w-3.5 cursor-pointer"/>
                  Deduplicate
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-400 select-none">
                  <input type="checkbox" checked={cleaningOptions.impute_missing} onChange={e => setCleaningOptions(prev => ({ ...prev, impute_missing: e.target.checked }))} className="accent-indigo-500 rounded h-3.5 w-3.5 cursor-pointer"/>
                  Impute Nulls
                </label>
                <button onClick={handleAutoClean} disabled={cleaningLoading} className="bg-indigo-650 hover:bg-indigo-550 text-white font-bold py-1 px-3 rounded text-[10px] flex items-center gap-1">
                  {cleaningLoading ? <Loader2 className="animate-spin" size={10} /> : <RefreshCw size={10} />}
                  Clean Copy
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Identified Warnings</span>
                {analysisJob.quality_report.issues?.map((iss: any, idx: number) => (
                  <div key={idx} className="bg-slate-900/50 p-2 rounded border border-slate-850 flex items-start gap-2 leading-relaxed">
                    <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                    <span>{iss.message}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Tactical Recommendations</span>
                {analysisJob.quality_report.actionable_plan?.map((step: string, idx: number) => (
                  <div key={idx} className="bg-slate-900/20 p-2 rounded border border-slate-850/50 flex items-start gap-1.5 text-slate-400 leading-relaxed">
                    <span className="text-indigo-400 font-bold shrink-0">•</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Grid Preview */}
        {previewData && (
          <div className="space-y-2.5">
            <h3 className="section-heading text-sm text-slate-200 flex items-center gap-2 select-none">
              <FileText size={15} className="text-teal-400" />
              Raw Data Preview
              <span className="text-[10px] text-slate-500 font-normal">({selectedDataset.row_count} total observations)</span>
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

  // What-if simulator
  const renderScenarioSimulator = () => {
    return (
      <div className="glass-panel p-5 rounded-xl shadow-lg space-y-6 animate-fade-in">
        <div>
          <h3 className="section-heading text-sm flex items-center gap-2 text-white">
            <Sliders className="text-indigo-400" size={16} />
            What-if Scenario Engine
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Drag modifiers to gauge mathematical revenue/margin elasticity offsets.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4 bg-slate-950/60 p-4.5 rounded-lg border border-slate-900 text-xs">
            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">Price Modifier</span>
                <span className="text-indigo-400 font-mono font-bold">{simPrice >= 0 ? '+' : ''}{simPrice}%</span>
              </div>
              <input type="range" min="-20" max="20" value={simPrice} onChange={(e) => setSimPrice(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-indigo-600"/>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">Marketing Delta</span>
                <span className="text-teal-400 font-mono font-bold">{simMarketing >= 0 ? '+' : ''}{simMarketing}%</span>
              </div>
              <input type="range" min="-30" max="30" value={simMarketing} onChange={(e) => setSimMarketing(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-teal-600"/>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-300">New Resources Allocation</span>
                <span className="text-purple-400 font-mono font-bold">+{simHires} Hires</span>
              </div>
              <input type="range" min="0" max="10" value={simHires} onChange={(e) => setSimHires(parseInt(e.target.value))} className="w-full h-1 bg-slate-800 rounded-lg cursor-pointer accent-purple-600"/>
            </div>

            <button onClick={handleRunSimulation} disabled={simLoading} className="btn-primary w-full py-2 text-xs font-semibold justify-center shadow-lg">
              {simLoading ? <Loader2 className="animate-spin" size={12} /> : <Play size={12} />}
              Compute Modifiers
            </button>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-center">
            {simResult ? (
              <div className="bg-indigo-950/10 border border-indigo-500/10 p-5 rounded-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[10px]">
                  <span className="text-slate-400 uppercase font-bold">Simulated Projection</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded border ${
                    simResult.pct_change >= 0 ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'
                  }`}>{simResult.pct_change >= 0 ? '+' : ''}{simResult.pct_change}% shift</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-950">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Baseline Total</span>
                    <p className="text-xl font-mono font-bold text-slate-300 mt-1">${simResult.before.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-900/50 p-3.5 rounded-lg border border-slate-950">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">Projected Shift</span>
                    <p className="text-xl font-mono font-bold text-white mt-1">${simResult.after.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic font-sans">"{simResult.explanation}"</p>
              </div>
            ) : (
              <div className="bg-slate-900/30 p-6 rounded-lg border border-slate-900 text-center py-10 flex flex-col items-center justify-center text-slate-500">
                <Sliders size={24} className="text-slate-700 mb-2" />
                <p className="text-xs">Adjust sliders on the left and trigger run to display What-if metrics.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // AI Memory baseline Snapshots
  const renderAIMemory = () => {
    return (
      <div className="glass-panel p-5 rounded-xl shadow-lg space-y-5 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="section-heading text-sm flex items-center gap-2 text-white">
              <Bookmark className="text-purple-400" size={16} />
              AI Memory Snapshot Repository
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Audit KPI snapshot registries and verify timeline drift metrics.</p>
          </div>
          <button onClick={handleSaveMemory} disabled={memoryLoading || !selectedDatasetId} className="bg-purple-600 hover:bg-purple-550 text-white font-bold py-1 px-3 rounded text-[10px] flex items-center gap-1">
            {memoryLoading ? <Loader2 className="animate-spin" size={10} /> : <Bookmark size={10} />}
            Capture Snapshot
          </button>
        </div>

        <div className="space-y-3">
          {memories.length > 0 ? (
            <div className="overflow-x-auto text-[11px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase">
                    <th className="py-2.5 px-3">Date Archived</th>
                    <th className="py-2.5 px-3">Target Objective</th>
                    <th className="py-2.5 px-3">Completeness</th>
                    <th className="py-2.5 px-3">Dataset Dimensions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {memories.map((mem) => (
                    <tr key={mem.id} className="hover:bg-slate-900/30">
                      <td className="py-2.5 px-3 flex items-center gap-2">
                        <Calendar size={12} className="text-slate-500" />
                        {new Date(mem.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3">{mem.business_goals}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{mem.kpis?.quality_score}%</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{mem.kpis?.rows} rows × {mem.kpis?.columns} cols</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-900/40 rounded-lg border border-slate-900 text-xs text-slate-500 select-none">
              No snapshot histories registered. Click 'Capture Snapshot' to freeze current metrics.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Industry Templates
  const renderIndustryTemplates = () => {
    const templates = [
      { title: "Retail Margins Audit", domain: "Retail & E-commerce", description: "Performs sales register auditing, spots negative profitability margin outliers, and tracks conversions." },
      { title: "Financial Transactions Ledger", domain: "Banking & Finance", description: "Runs correlation checks on corporate indices, reviews cash flows, and checks portfolios." },
      { title: "Patient Log Wait Times", domain: "Healthcare & Medicine", description: "Inspects clinical wait boundaries, lists admission rates, and builds resource suggestions." },
      { title: "SaaS Subscriber Churn Model", domain: "SaaS Technology", description: "Groups consumer cohorts using K-Means, audits weekly usage rates, and details churn indicators." },
      { title: "HR Task Speed Scorecard", domain: "Human Resources", description: "Measures resource speed milestones, highlights workflow locks, and details hiring plans." }
    ];

    return (
      <div className="glass-panel p-5 rounded-xl shadow-lg space-y-5 animate-fade-in">
        <div>
          <h3 className="section-heading text-sm flex items-center gap-2 text-white">
            <Layers className="text-teal-400" size={16} />
            Industry Analysis Templates
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Initialize agent pipelines with industry-standard target headers.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((temp, idx) => (
            <div key={idx} onClick={() => handleApplyTemplate(temp.title)} className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 hover:border-slate-800 transition flex flex-col justify-between group cursor-pointer">
              <div>
                <span className="text-[9px] uppercase font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">{temp.domain}</span>
                <h4 className="section-heading text-xs text-slate-200 mt-3 group-hover:text-white transition">{temp.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{temp.description}</p>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-slate-500 font-bold mt-4 font-mono group-hover:text-teal-400 transition select-none">
                Apply Template <ChevronRight size={10} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Briefing slide viewer
  const renderPresentationSlides = () => {
    const slides = analysisJob?.presentation_deck || [];
    if (slides.length === 0) return null;
    const activeSlide = slides[activeSlideIdx];

    return (
      <div className="glass-panel p-5 rounded-xl shadow-xl space-y-5 animate-fade-in border-t-2 border-t-indigo-500/40">
        <div className="flex items-center justify-between border-b border-slate-850 pb-2">
          <div>
            <h3 className="section-heading text-sm flex items-center gap-2 text-white">
              <Award className="text-indigo-400" size={16} />
              Executive Slides Briefing
            </h3>
            <p className="text-[9px] text-slate-500">Autonomous board briefing deck.</p>
          </div>
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-900 text-[10px] font-mono">
            <button disabled={activeSlideIdx === 0} onClick={() => setActiveSlideIdx(p => p - 1)} className="px-2 text-slate-400 hover:text-white disabled:opacity-30">
              ◄ Prev
            </button>
            <span className="px-2.5 text-slate-300 font-bold">{activeSlideIdx + 1} / {slides.length}</span>
            <button disabled={activeSlideIdx === slides.length - 1} onClick={() => setActiveSlideIdx(p => p + 1)} className="px-2 text-slate-400 hover:text-white disabled:opacity-30">
              Next ►
            </button>
          </div>
        </div>

        <div className="bg-slate-950/60 p-6.5 rounded-xl border border-slate-900 min-h-[260px] flex flex-col justify-between shadow-inner relative">
          <div className="absolute top-0 right-0 p-2 text-[9px] uppercase font-bold text-slate-600 tracking-wider">
            {activeSlide.type}
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider font-mono block mb-1">{activeSlide.subtitle}</span>
            <h2 className="section-heading text-lg text-white border-b border-slate-900 pb-2">{activeSlide.title}</h2>
            
            {activeSlide.bullets && (
              <ul className="mt-4 space-y-2">
                {activeSlide.bullets.map((b: string, i: number) => (
                  <li key={i} className="text-xs text-slate-300 leading-relaxed flex items-start gap-2">
                    <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}

            {activeSlide.metrics && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                {activeSlide.metrics.map((m: any, i: number) => (
                  <div key={i} className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-850 text-center">
                    <span className="text-[9px] text-slate-500 font-bold uppercase block">{m.label}</span>
                    <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{m.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="mt-6 text-[9px] text-slate-600 flex justify-between border-t border-slate-900 pt-2 select-none">
            <span>A3 Slide briefing center</span>
            <span>Internal Confidential</span>
          </div>
        </div>
      </div>
    );
  };

  // Split-layout AI Analyst
  const renderChatPlayground = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 h-[calc(100vh-170px)] animate-fade-in">
        <div className="lg:col-span-1 glass-panel rounded-xl p-4.5 flex flex-col justify-between shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h4 className="section-heading text-[10px] uppercase font-bold text-slate-400">History Threads</h4>
              <button 
                onClick={() => {
                  setActiveConversationId(null);
                  setChatMessages([]);
                }}
                className="text-[9px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded border border-indigo-500/15 font-semibold"
              >
                + New Thread
              </button>
            </div>
            <div className="space-y-1 overflow-y-auto max-h-[320px] pr-1">
              {conversations.length > 0 ? (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => loadConversation(conv.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs truncate transition flex items-center gap-2 ${
                      activeConversationId === conv.id 
                        ? 'bg-indigo-650 text-white font-semibold' 
                        : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                    }`}
                  >
                    <MessageSquare size={12} />
                    {conv.title}
                  </button>
                ))
              ) : (
                <div className="text-center text-xs text-slate-600 py-6 select-none">No chat histories.</div>
              )}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-900 text-[10px] text-slate-500 flex items-start gap-2 leading-relaxed select-none">
            <Info className="text-indigo-400 shrink-0 mt-0.5" size={12} />
            <span>AI translates questions into sandboxed Python scripts locally. Data stays completely on-device.</span>
          </div>
        </div>

        <div className="lg:col-span-3 glass-panel rounded-xl flex flex-col justify-between overflow-hidden shadow-lg">
          <div className="flex-grow p-4.5 overflow-y-auto space-y-4 max-h-[calc(100vh-270px)] bg-slate-950/10">
            {chatMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto pt-4">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-full mb-3 border border-indigo-500/10">
                  <MessageSquare size={22} />
                </div>
                <h3 className="section-heading text-base text-white">AI Data Chat Playground</h3>
                <p className="text-xs text-slate-400 mt-1 leading-normal">
                  Ask conversational questions in plain English. The AI agent compiles code sandboxes to query and chart.
                </p>
                <div className="grid grid-cols-2 gap-2 mt-5 w-full text-left">
                  <button onClick={() => handleChatSubmit(undefined, "Show Sales distribution by Region")} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-lg text-[11px] text-slate-300 transition leading-normal">
                    "Show Sales by Region"
                  </button>
                  <button onClick={() => handleChatSubmit(undefined, "What are the top 5 product categories?")} className="p-2.5 bg-slate-950/60 hover:bg-slate-900 border border-slate-900 rounded-lg text-[11px] text-slate-300 transition leading-normal">
                    "What are the top categories?"
                  </button>
                </div>
              </div>
            ) : (
              chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                >
                  <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-650 text-white rounded-br-none' 
                      : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-bl-none'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.chart && (
                    <div className="w-[280px] sm:w-[380px] md:w-[480px] glass-panel p-3.5 rounded-xl mt-2">
                      <ChartRenderer plotlyJson={msg.chart} />
                    </div>
                  )}
                </div>
              ))
            )}
            {chatLoading && (
              <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 py-2 px-3 rounded-lg border border-slate-800 w-max animate-pulse">
                <Loader2 className="animate-spin text-indigo-400" size={12} />
                <span>Agent compiles pandas script...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-3 bg-slate-950 border-t border-slate-850 flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder="Ask a data question..."
              className="input-clean flex-grow py-2 px-3 text-xs focus:outline-none"
            />
            <button type="submit" disabled={chatLoading} className="btn-primary py-2 px-3.5 select-none shrink-0 flex items-center justify-center shadow-md disabled:opacity-50">
              <Send size={12} />
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
      <div className="glass-panel p-5 rounded-xl space-y-5 shadow-xl animate-fade-in">
        <div>
          <h3 className="section-heading text-sm flex items-center gap-2 text-white">
            <LineChart className="text-teal-400" size={16} />
            Auto Time-Series Forecaster
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Fits seasonal regression trendlines locally on date columns.</p>
        </div>

        {hasForecast ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2 glass-panel p-3 rounded-lg">
              <ChartRenderer plotlyJson={analysisJob.insights.forecast_chart} />
            </div>
            <div className="xl:col-span-1 space-y-3 flex flex-col justify-center">
              <div className="bg-teal-500/5 border border-teal-500/10 p-4 rounded-xl">
                <h4 className="text-[10px] uppercase text-teal-400 font-bold font-mono tracking-wider mb-2 flex items-center gap-1 select-none">
                  <TrendingUp size={12} /> Forecast Commentary
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed italic font-sans">
                  "{analysisJob.insights.forecast_commentary || 'Trend is stable.'}"
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center max-w-sm mx-auto">
            <div className="p-2.5 bg-teal-500/10 text-teal-400 rounded-full mb-3 border border-teal-500/10">
              <LineChart size={20} />
            </div>
            <h4 className="section-heading text-xs text-white">No Forecast Available</h4>
          </div>
        )}
      </div>
    );
  };

  // Reports Brief Exporter (PDF + PPTX exports)
  const renderReports = () => {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="glass-panel p-5 rounded-xl space-y-5 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-4">
            <div>
              <h3 className="section-heading text-sm flex items-center gap-2 text-white">
                <FileText className="text-purple-400" size={16} />
                Executive Brief compilation
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Bundle data health grids, correlation indexes, and recommendations into printable briefs.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleGenerateReport("pdf")}
                disabled={reportGenerating || analysisJob?.status !== 'completed'}
                className="bg-purple-600 hover:bg-purple-550 text-white font-bold py-1.5 px-3 rounded text-[10px] flex items-center gap-1 shadow-md disabled:opacity-50"
              >
                Compile PDF
              </button>
              <button
                onClick={() => handleGenerateReport("pptx")}
                disabled={reportGenerating || analysisJob?.status !== 'completed'}
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-1.5 px-3 rounded text-[10px] flex items-center gap-1 shadow-md disabled:opacity-50"
              >
                Compile PPTX Slides
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none">Compiled Briefs Archive</span>
            {reports.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((rep) => (
                  <div key={rep.id} className="bg-slate-950/60 border border-slate-900 p-3 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1 min-w-0">
                      <h4 className="section-heading text-[11px] text-slate-200 truncate max-w-[170px]">{rep.title}</h4>
                      <p className="text-[9px] text-slate-500 flex items-center gap-1 font-mono uppercase">
                        {rep.format} • {new Date(rep.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadReport(rep.id, rep.title, rep.format)}
                      className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-md border border-indigo-500/15"
                    >
                      <Download size={11} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-900/40 rounded-lg border border-slate-900 border-dashed text-xs text-slate-500 select-none">
                No printable briefs compiled. Trigger formats compile above.
              </div>
            )}
          </div>
        </div>

        {analysisJob?.presentation_deck && renderPresentationSlides()}
      </div>
    );
  };

  // Redesigned Settings with Multi-LLM provider fields (PHASE 2)
  const renderSettings = () => {
    return (
      <div className="glass-panel p-5 rounded-xl max-w-md mx-auto space-y-4 shadow-xl animate-fade-in">
        <div>
          <h3 className="section-heading text-sm flex items-center gap-2 text-white">
            <Settings className="text-indigo-400" size={16} />
            AI Model & Workspace Settings
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Route model settings or manage custom API keys.</p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Default LLM Provider</label>
            <select
              value={llmProvider}
              onChange={e => {
                const prov = e.target.value;
                setLlmProvider(prov);
                if (prov === 'default') setLlmModel('');
                else if (prov === 'gemini') setLlmModel('gemini-2.5-flash');
                else if (prov === 'openai') setLlmModel('gpt-4o-mini');
                else if (prov === 'ollama') setLlmModel('qwen2.5:latest');
                else if (prov === 'anthropic') setLlmModel('claude-3-5-sonnet-20240620');
                else if (prov === 'deepseek') setLlmModel('deepseek-chat');
                else if (prov === 'mistral') setLlmModel('mistral-tiny');
              }}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded p-2 text-xs text-white"
            >
              <option value="default">System Default (Gemini/Ollama/Mock)</option>
              <option value="gemini">Google Gemini API</option>
              <option value="openai">OpenAI API</option>
              <option value="anthropic">Anthropic Claude API</option>
              <option value="deepseek">DeepSeek AI API</option>
              <option value="mistral">Mistral AI API</option>
              <option value="ollama">Local Ollama</option>
              <option value="mock">Local Heuristic Mock</option>
            </select>
          </div>

          <div className="border-t border-slate-900 pt-3 space-y-3">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Custom Provider Keys</span>
            
            {/* Gemini Key */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase block">Gemini API Key</label>
              <input
                type="password"
                value={llmKeys.gemini || ''}
                onChange={e => setLlmKeys((prev: any) => ({ ...prev, gemini: e.target.value }))}
                placeholder="Google Gemini API Key"
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* OpenAI Key */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase block">OpenAI API Key</label>
              <input
                type="password"
                value={llmKeys.openai || ''}
                onChange={e => setLlmKeys((prev: any) => ({ ...prev, openai: e.target.value }))}
                placeholder="OpenAI GPT API Key"
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>

            {/* Claude Key */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase block">Anthropic Claude Key</label>
              <input
                type="password"
                value={llmKeys.anthropic || ''}
                onChange={e => setLlmKeys((prev: any) => ({ ...prev, anthropic: e.target.value }))}
                placeholder="Claude API Key"
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            
            {/* DeepSeek Key */}
            <div className="space-y-1">
              <label className="text-[8px] font-bold text-slate-400 uppercase block">DeepSeek Key</label>
              <input
                type="password"
                value={llmKeys.deepseek || ''}
                onChange={e => setLlmKeys((prev: any) => ({ ...prev, deepseek: e.target.value }))}
                placeholder="DeepSeek API Key"
                className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:outline-none rounded px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <button type="submit" disabled={settingsLoading} className="btn-primary w-full py-2 text-xs font-semibold justify-center shadow-lg">
            {settingsLoading ? <Loader2 className="animate-spin" size={12} /> : null}
            Save Settings
          </button>
        </form>
      </div>
    );
  };

  // Shared workspaces collaboration screen (PHASE 2)
  const renderWorkspace = () => {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">
        {/* Left creation panel */}
        <div className="lg:col-span-1 glass-panel p-5 rounded-xl space-y-5">
          <div>
            <h3 className="section-heading text-sm text-white">Create Teams Workspace</h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Partition datasets and coordinate multi-user roles.</p>
          </div>
          <form onSubmit={handleCreateWorkspace} className="space-y-3">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              placeholder="Enter workspace name..."
              className="input-clean text-xs py-2 focus:outline-none"
            />
            <button type="submit" className="btn-primary w-full justify-center py-2 text-xs font-semibold">
              <Plus size={13} /> Create Workspace
            </button>
          </form>

          {workspaces.length > 0 && (
            <div className="space-y-1.5 border-t border-slate-900 pt-3">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Your Workspaces</span>
              {workspaces.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setActiveWorkspaceId(w.id)}
                  className={`w-full text-left p-2 rounded-lg text-xs truncate transition ${
                    activeWorkspaceId === w.id ? 'bg-indigo-650 text-white font-semibold' : 'text-slate-400 hover:bg-slate-900'
                  }`}
                >
                  {w.name} ({w.user_role})
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right workspace invite & members panel */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-xl space-y-6">
          {activeWorkspaceId ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850 pb-3">
                <div>
                  <h3 className="section-heading text-sm text-white">Invite Teammate</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Grant write/view access credentials to team members.</p>
                </div>
              </div>
              <form onSubmit={handleInviteMember} className="flex gap-2 flex-wrap sm:flex-nowrap">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="Enter email address..."
                  className="input-clean text-xs py-1.5 focus:outline-none flex-grow"
                />
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-1.5 px-4 rounded-lg text-xs shadow-md shrink-0">
                  Invite
                </button>
              </form>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Workspace Members</span>
                <div className="overflow-x-auto text-[11px]">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase">
                        <th className="py-2 px-1">Teammate</th>
                        <th className="py-2 px-1">Role Permission</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-slate-300">
                      {workspaceMembers.map((m, i) => (
                        <tr key={i}>
                          <td className="py-2 px-1 font-semibold">{m.email}</td>
                          <td className="py-2 px-1 font-mono text-cyan-400 capitalize">{m.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500 text-xs select-none">
              No active workspace selected. Choose or create one on the left.
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- RENDERING RIGHT TIMELINE AGENT PANEL ---
  const renderRightAgentPanel = () => {
    const isRunning = analysisJob?.status === 'pending' || analysisJob?.status === 'running';
    const hasReport = analysisJob?.business_report !== undefined && analysisJob?.business_report !== null;
    
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
      <motion.aside
        animate={{ width: 320 }}
        className="w-80 border-l border-slate-800 bg-slate-950/80 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto p-4 space-y-5"
      >
        <div className="border-b border-slate-900 pb-3 flex items-center justify-between">
          <div>
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Agent Pipeline Status</span>
            <h4 className="section-heading text-[11px] text-slate-200 truncate mt-0.5">{isRunning ? activeAgent : (analysisJob?.status === 'completed' ? 'Pipeline Sleeping' : 'Pipeline Idle')}</h4>
          </div>
          <button 
            onClick={() => setDeveloperModeActive(!developerModeActive)}
            title="Toggle Developer HUD Telemetry" 
            className={`p-1.5 rounded transition ${developerModeActive ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-200'}`}
          >
            <Terminal size={13} />
          </button>
        </div>

        {/* --- HIDDEN DEVELOPER MODE OBSERVABILITY GRAPH (PHASE 2) --- */}
        {developerModeActive && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-slate-950 border border-slate-850 p-3.5 rounded-xl space-y-3 shadow-inner font-mono text-[9px] leading-relaxed">
            <span className="text-teal-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Cpu size={10} /> Observability Telemetry
            </span>
            <div className="space-y-1 text-slate-400">
              <p>• Queue Status: <span className="text-teal-400 font-bold">Idle</span></p>
              {analysisJob?.latency_logs && (
                <div className="border-t border-slate-900 pt-1.5 space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase block">Agent Latency Logs (Seconds)</span>
                  {Object.entries(analysisJob.latency_logs).map(([agent, seconds]: [string, any]) => (
                    <div key={agent} className="flex justify-between">
                      <span className="truncate max-w-[140px]">{agent}</span>
                      <span className="text-slate-350">{seconds}s</span>
                    </div>
                  ))}
                </div>
              )}
              {analysisJob?.token_usage && (
                <div className="border-t border-slate-900 pt-1.5 space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase block">Token Consumption</span>
                  <div className="flex justify-between">
                    <span>Input / Output:</span>
                    <span>{analysisJob.token_usage.input_tokens} / {analysisJob.token_usage.output_tokens}</span>
                  </div>
                  <div className="flex justify-between text-teal-400 font-bold">
                    <span>Total:</span>
                    <span>{analysisJob.token_usage.total_tokens}</span>
                  </div>
                </div>
              )}
              {analysisJob?.system_metrics && (
                <div className="border-t border-slate-900 pt-1.5 space-y-0.5">
                  <span className="text-[8px] text-slate-500 font-bold uppercase block">Process metrics</span>
                  <div className="flex justify-between">
                    <span>Memory Usage:</span>
                    <span>{analysisJob.system_metrics.memory_mb} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CPU Load:</span>
                    <span>{analysisJob.system_metrics.cpu_percent}%</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        <div className="space-y-3">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block font-mono">Execution Logs</span>
          <div className="space-y-0 bg-black/40 border border-white/5 rounded-lg overflow-y-auto max-h-[300px] p-3 font-mono text-[10px] custom-scrollbar shadow-inner">
            {analysisJob?.agent_run_history && analysisJob.agent_run_history.length > 0 ? (
              analysisJob.agent_run_history.map((log: any, idx: number) => (
                <div key={idx} className="flex gap-3 items-start py-1.5 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors -mx-3 px-3">
                  <div className={`shrink-0 text-[9px] mt-0.5 ${
                    log.status === 'completed' ? 'text-teal-400' : (log.status === 'failed' ? 'text-red-400' : 'text-indigo-400 animate-pulse')
                  }`}>
                    {log.status === 'completed' ? '[OK]' : (log.status === 'failed' ? '[ERR]' : '[RUN]')}
                  </div>
                  <div className="min-w-0 flex flex-col gap-0.5">
                    <span className="font-semibold text-slate-300 block">{log.agent}</span>
                    <span className="text-slate-500 block leading-tight">{log.message}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-slate-600 italic py-2">No logging history. Awaiting execution...</div>
            )}
          </div>
        </div>

        {/* Decision scorecard cards info */}
        {hasReport && analysisJob.business_report && (
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 space-y-4 shadow-md text-xs">
            <div className="flex items-center justify-between border-b border-slate-850 pb-2 text-[9px]">
              <span className="text-slate-400 font-bold uppercase">Decision Scorecard</span>
              <span className="font-bold px-1.5 py-0.2 rounded border bg-teal-500/10 text-teal-400 border-teal-500/20">{analysisJob.business_report.risk_level}</span>
            </div>
            
            {analysisJob.business_report.executive_summary && (
              <div className="space-y-1">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Executive Summary</span>
                <p className="text-[10px] text-slate-300 leading-relaxed italic">"{analysisJob.business_report.executive_summary}"</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 border-t border-slate-900 pt-2.5">
              <div className="bg-slate-950 p-2 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">ROI</span>
                <span className="font-mono text-[10px] font-bold text-slate-300 mt-0.5 block">{analysisJob.business_report.expected_roi}</span>
              </div>
              <div className="bg-slate-950 p-2 rounded-lg text-center">
                <span className="text-[8px] text-slate-500 font-bold uppercase block">Confidence</span>
                <span className="font-mono text-[10px] font-bold text-slate-300 mt-0.5 block">{analysisJob.business_report.confidence_score}%</span>
              </div>
            </div>

            {analysisJob.business_report.implementation_roadmap && (
              <div className="space-y-1.5 border-t border-slate-850 pt-2.5">
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider block">Implementation Roadmap</span>
                {analysisJob.business_report.implementation_roadmap.map((act: string, idx: number) => (
                  <div key={idx} className="flex gap-2 text-[10px] text-slate-400 leading-normal">
                    <span className="text-teal-400 font-bold shrink-0">✓</span>
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.aside>
    );
  };

  // --- PREMIUM SAAS LANDING PAGE REDESIGN ---
  const renderLandingPage = () => {
    return (
      <div className="min-h-screen w-screen bg-[#09090B] text-slate-200 overflow-y-auto selection:bg-indigo-500/30 grid-bg animate-mesh relative">
        {/* Sticky Header */}
        <header className="sticky top-0 bg-[#09090B]/80 backdrop-blur-md border-b border-slate-900 py-4 px-6 md:px-12 flex justify-between items-center z-55">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-lg text-white">
              <Sparkles size={16} />
            </div>
            <span className="section-heading text-base font-bold text-white tracking-tight">A3 Analyst</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setAuthMode('login')} className="text-xs text-slate-400 hover:text-white transition">Sign In</button>
            <button onClick={() => setAuthMode('register')} className="btn-primary py-1.5 px-4 text-xs shadow-lg">Start Free</button>
          </div>
        </header>

        {/* Hero Section */}
        <section className="text-center py-20 px-4 max-w-3xl mx-auto space-y-6">
          <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] px-3.5 py-1 rounded-full font-bold uppercase tracking-widest block w-max mx-auto select-none">
            Introducing A3 Enterprise
          </span>
          <h1 className="section-heading text-4xl sm:text-5xl text-white font-extrabold tracking-tight leading-tight">
            Autonomous Business Intelligence <br/>
            <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Driven by AI Agent Teams</span>
          </h1>
          <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Upload files, state goals, and let specialized agents profile, validate quality, fit ML models, and write slides.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <button onClick={() => setAuthMode('register')} className="btn-primary py-2.5 px-6 text-sm shadow-xl font-bold">
              Analyze in 1-Click
            </button>
            <a href="#features" className="btn-ghost py-2.5 px-6 text-sm hover:border-slate-800 transition">
              Show Details
            </a>
          </div>
        </section>

        {/* Pricing Matrix */}
        <section className="py-16 max-w-5xl mx-auto px-6 space-y-10 border-t border-slate-900/60" id="pricing">
          <div className="text-center space-y-2">
            <h2 className="section-heading text-2xl text-white">SaaS Subscriptions Plans</h2>
            <p className="text-xs text-slate-500">Scale metrics storage or add multi-user sharing.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free */}
            <div className="glass-panel p-6.5 rounded-2xl flex flex-col justify-between h-96 relative">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Personal Developer</span>
                <h3 className="section-heading text-lg text-white mt-2">Free Sandbox</h3>
                <p className="text-2xl font-mono text-white mt-4">$0 <span className="text-xs text-slate-500">/ forever</span></p>
                <ul className="text-xs text-slate-400 mt-6 space-y-2">
                  <li>• Max 2 uploads per day</li>
                  <li>• Local Ollama model fallback</li>
                  <li>• PDF report downloads</li>
                </ul>
              </div>
              <button onClick={() => setAuthMode('register')} className="btn-ghost w-full py-2 text-xs font-semibold justify-center">Get Sandbox</button>
            </div>

            {/* Pro */}
            <div className="glass-panel p-6.5 rounded-2xl flex flex-col justify-between h-96 border-indigo-500/25 relative bg-gradient-to-b from-indigo-950/5 to-slate-950">
              <span className="absolute top-3.5 right-3.5 text-[8px] uppercase bg-indigo-500 text-white px-2 py-0.5 rounded-full font-bold select-none">Recommended</span>
              <div>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Elite Analyst</span>
                <h3 className="section-heading text-lg text-white mt-2">Professional</h3>
                <p className="text-2xl font-mono text-white mt-4">$79 <span className="text-xs text-slate-500">/ month</span></p>
                <ul className="text-xs text-slate-350 mt-6 space-y-2">
                  <li>• Unlimited datasets profiling</li>
                  <li>• Gemini, OpenAI & Claude routers</li>
                  <li>• Scenario what-if engine runs</li>
                  <li>• PPTX slides slide briefings</li>
                </ul>
              </div>
              <button onClick={() => setAuthMode('register')} className="btn-primary w-full py-2 text-xs font-semibold justify-center shadow-lg">Start Free Trial</button>
            </div>

            {/* Enterprise */}
            <div className="glass-panel p-6.5 rounded-2xl flex flex-col justify-between h-96 relative">
              <div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Global Corporate</span>
                <h3 className="section-heading text-lg text-white mt-2">Enterprise</h3>
                <p className="text-xl font-mono text-white mt-4">Contact Sales</p>
                <ul className="text-xs text-slate-400 mt-6 space-y-2">
                  <li>• Dedicated parallel staging queues</li>
                  <li>• System observability telemetry</li>
                  <li>• Workspace role permissions</li>
                  <li>• Custom dedicated support</li>
                </ul>
              </div>
              <button onClick={() => setAuthMode('register')} className="btn-ghost w-full py-2 text-xs font-semibold justify-center">Schedule Demo</button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-slate-900/60 py-8 px-6 text-center text-[10px] text-slate-650 select-none">
          <p>© {new Date().getFullYear()} A3 Autonomous Data Analyst Corporation. All rights reserved.</p>
        </footer>
      </div>
    );
  };

  if (!isAuthenticated) {
    if (authMode === 'landing') return renderLandingPage();
    return (
      <div className="min-h-screen w-screen relative overflow-hidden flex items-center justify-center bg-[#09090B] grid-bg">
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

  // --- AUTHENTICATED SaaS FRAMEWORK SCREEN ---
  return (
    <div className="min-h-screen flex grid-bg animate-mesh">
      
      {/* COLLAPSIBLE SIDEBAR CONTAINER */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 64 : 260 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="glass-sidebar flex flex-col justify-between shrink-0 h-screen sticky top-0 overflow-y-auto z-50 animate-fade-in border-r border-white/5"
      >
        <div className="flex flex-col gap-6 overflow-hidden">
          <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
            {!sidebarCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center shadow-lg">
                  <Sparkles size={20} className="text-indigo-400 animate-pulse" />
                </div>
                <div className="flex flex-col">
                  <span className="font-sans font-semibold text-white tracking-tight text-base leading-tight">A3 Terminal</span>
                  <span className="font-mono text-cyan-400 text-[10px] flex items-center gap-1.5 opacity-80 mt-0.5 font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Network Active
                  </span>
                </div>
              </motion.div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-md text-slate-500 hover:text-white hover:bg-slate-900 transition mx-auto border border-transparent hover:border-slate-800">
              <AlignLeft size={16} />
            </button>
          </div>

          <nav className="space-y-1.5 px-3">
            {([
              { id: 'dashboard', label: 'Insight Dashboard', icon: <LayoutDashboard size={14} /> },
              { id: 'datasets', label: 'Datasets Library', icon: <Database size={14} /> },
              { id: 'chat', label: 'AI Analyst Chat', icon: <MessageSquare size={14} /> },
              { id: 'forecast', label: 'Trend Forecasting', icon: <LineChart size={14} /> },
              { id: 'reports', label: 'Document Reports', icon: <FileText size={14} /> },
              { id: 'simulations', label: 'Scenario Simulator', icon: <Sliders size={14} /> },
              { id: 'memory', label: 'AI Memory Snapshots', icon: <Bookmark size={14} /> },
              { id: 'workspace', label: 'Team Shared spaces', icon: <Users size={14} /> },
              { id: 'templates', label: 'Industry Templates', icon: <Layers size={14} /> },
              { id: 'settings', label: 'AI settings', icon: <Settings size={14} /> }
            ] as const).map((tab) => {
              const isActive = activeTab === tab.id;
              const disabled = (tab.id !== 'datasets' && tab.id !== 'settings' && tab.id !== 'templates' && tab.id !== 'workspace') && (!selectedDatasetId || analysisJob?.status !== 'completed');
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !disabled && setActiveTab(tab.id)}
                  disabled={disabled}
                  title={tab.label}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all relative disabled:opacity-20 disabled:cursor-not-allowed ${
                    isActive ? 'bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none pl-4' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  {!sidebarCollapsed && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">{tab.label}</motion.span>}
                  {isActive && !sidebarCollapsed && (
                    <motion.div layoutId="active_tab_dot" className="absolute right-3 w-1.5 h-1.5 bg-indigo-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {!sidebarCollapsed && datasets.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2 border-t border-slate-900 pt-4 flex-grow overflow-hidden flex flex-col">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Loaded Datasets</span>
              <div className="space-y-1 overflow-y-auto flex-grow pr-1">
                {datasets.map((ds) => (
                  <div key={ds.id} onClick={() => setSelectedDatasetId(ds.id)} className={`group flex items-center justify-between p-2 rounded-lg text-xs transition cursor-pointer ${
                    selectedDatasetId === ds.id ? 'bg-slate-900 border border-slate-800 text-white font-medium' : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
                  }`}>
                    <div className="flex items-center gap-2 min-w-0 flex-grow">
                      <Database size={12} className={selectedDatasetId === ds.id ? 'text-indigo-400' : 'text-slate-600'} />
                      <span className="truncate">{ds.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); deleteDataset(ds.id); }} className="opacity-0 group-hover:opacity-100 hover:text-red-400 transition p-0.5 rounded">
                      <Trash2 size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-3 border-t border-slate-900 bg-slate-950 flex items-center justify-between overflow-hidden">
          {!sidebarCollapsed ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1 pr-2">
              <p className="text-[10px] font-semibold text-slate-300 truncate">{user?.email}</p>
              <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono py-0.2 px-1 rounded uppercase font-bold tracking-wider mt-0.5 block w-max">
                {user?.role}
              </span>
            </motion.div>
          ) : (
            <div className="p-1 rounded-full bg-slate-900 text-indigo-400 border border-slate-850 mx-auto select-none font-bold text-xs uppercase w-7 h-7 flex items-center justify-center shrink-0">
              {user?.email?.[0]}
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 p-1.5 hover:bg-red-500/5 rounded-lg transition" title="Log Out">
              <LogOut size={13} />
            </button>
          )}
        </div>
      </motion.aside>

      {/* CENTER WORKSPACE & NAVBAR */}
      <div className="flex-grow flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="sticky top-0 z-40 glass-panel border-b-0 border-slate-800/50 px-6 py-4 flex items-center justify-between gap-4 shrink-0 rounded-b-2xl mx-2 shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-white select-none cursor-pointer hover:border-white/20 transition-all">
              <span className="font-semibold tracking-wide">Enterprise Shared Space</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            
            <button 
              onClick={() => setCommandPaletteOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-slate-950/50 border border-white/5 hover:border-indigo-500/50 rounded-xl px-4 py-2 text-xs text-slate-400 text-left w-72 transition-all group"
            >
              <Search size={14} className="group-hover:text-indigo-400 transition-colors" />
              <span className="flex-grow select-none">Quick Command Search...</span>
              <span className="text-[10px] bg-white/10 border border-white/10 px-1.5 py-0.5 rounded font-mono text-white">Ctrl+K</span>
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 bg-indigo-500/10 border border-indigo-500/20 px-3.5 py-1.5 rounded-full text-[11px] text-indigo-300 select-none font-mono font-semibold uppercase tracking-wider">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping shrink-0" />
              <span>A3 Engine Online</span>
            </div>

            <button className="p-2.5 text-slate-400 hover:text-white bg-white/5 border border-white/5 hover:border-white/10 rounded-xl transition-all relative group">
              <Bell size={16} className="group-hover:scale-110 transition-transform" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
            </button>

            {selectedDatasetId && (
              <button
                onClick={handleTriggerCeoMode}
                className="bg-gradient-to-r from-indigo-650 to-purple-650 hover:from-indigo-600 hover:to-purple-600 text-white font-bold py-1.5 px-3.5 rounded-xl text-xs flex items-center gap-1 shadow-lg"
              >
                <Sparkles size={12} className="animate-spin" />
                CEO Mode
              </button>
            )}
          </div>
        </header>

        <main className="flex-grow p-6 overflow-y-auto max-h-[calc(100vh-60px)]">
          {globalLoading ? renderDashboardSkeletons() : (
            <div>
              {selectedDatasetId && analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running') && (
                <div className="bg-indigo-600/10 border border-indigo-500/15 p-5 rounded-2xl text-center mb-6 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-indigo-400" size={20} />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Multi-Agent Parallel Pipeline In Progress</h3>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Asynchronous stages are scanning variables. Telemetry HUD and dashboard will update on-the-fly.
                  </p>
                </div>
              )}

              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-slate-950/50 via-slate-900/50 to-slate-950/50 relative overflow-hidden">
                    <div className="space-y-1.5 max-w-xl">
                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest font-mono select-none">Analyst Framework active</span>
                      <h1 className="section-heading text-2xl text-white">Welcome back, Data Architect</h1>
                      <p className="text-xs text-slate-400">
                        Describe business objectives, run seasonal forecasting models, or export presentation slide decks in one click.
                      </p>
                    </div>

                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`mt-6 border border-dashed rounded-xl p-6 text-center transition-all ${
                        dragActive ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-800 hover:border-slate-700/80 bg-slate-950/40'
                      }`}
                    >
                      {uploadProgress ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                          <Loader2 className="animate-spin text-indigo-500" size={24} />
                          <p className="text-xs text-slate-400 font-bold">Streaming uploaded file registers...</p>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center gap-2.5 cursor-pointer">
                          <Upload size={22} className="text-slate-500" />
                          <p className="text-xs text-slate-300 font-semibold leading-normal">
                            Drag & drop CSV/Excel here, or <span className="text-indigo-400 hover:underline">browse files</span>
                          </p>
                          <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} className="hidden" />
                        </label>
                      )}
                    </div>
                  </div>

                  {renderDashboardWidgets()}
                </div>
              )}

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
      </div>

      {renderRightAgentPanel()}

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        datasets={datasets}
        onSelectDataset={(id) => setSelectedDatasetId(id)}
        onNavigate={(tab) => setActiveTab(tab)}
        onRunCeoMode={handleTriggerCeoMode}
      />

      <AnimatePresence>
        {toast && (
          <Toast
            type={toast.type}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {showOnboardingWizard && (
        <LocalOnboardingWizard onComplete={() => setShowOnboardingWizard(false)} />
      )}

    </div>
  );
}

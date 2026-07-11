'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Database, Upload, MessageSquare, LineChart, FileText, LayoutDashboard, 
  Trash2, LogOut, Loader2, Sparkles, RefreshCw, Send, CheckCircle2, 
  AlertTriangle, Shield, Check, Calendar, TrendingUp, HelpCircle, Download,
  Settings
          <div>
            <h1 className="section-heading text-2xl md:text-3xl text-foreground">
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border/50 px-4 py-2.5 rounded-xl">
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
              <Loader2 className="animate-spin text-primary" size={32} />
              <p className="text-xs text-gray-400 font-medium animate-pulse">Assembling workspace views...</p>
            </div>
          </div>
        ) : (
          <div>
            {/* Show warning if analysis job is running */}
            {selectedDatasetId && analysisJob && (analysisJob.status === 'pending' || analysisJob.status === 'running') && (
              <div className="bg-primary/10 border border-primary/15 p-5 rounded-xl text-center mb-6 flex flex-col items-center justify-center gap-2">
                <Loader2 className="animate-spin text-indigo-400" size={24} />
                <h3 className="text-sm font-semibold text-foreground">Multi-Agent Profiling In Progress</h3>
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

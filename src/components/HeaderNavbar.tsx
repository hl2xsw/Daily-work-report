import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  FileSpreadsheet,
  LayoutDashboard,
  Table,
  Search,
  UploadCloud,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface HeaderNavbarProps {
  activeTab: 'dashboard' | 'table' | 'search' | 'upload';
  setActiveTab: (tab: 'dashboard' | 'table' | 'search' | 'upload') => void;
  onManualUpdate: () => void;
  isUpdating: boolean;
  lastSyncTime: string;
  totalReportCount: number;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (val: boolean) => void;
  nextSyncTimeStr: string;
}

export const HeaderNavbar: React.FC<HeaderNavbarProps> = ({
  activeTab,
  setActiveTab,
  onManualUpdate,
  isUpdating,
  lastSyncTime,
  totalReportCount,
  autoSyncEnabled,
  setAutoSyncEnabled,
  nextSyncTimeStr,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const dateStr = now.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      });
      setCurrentTime(`${dateStr} ${hours}:${minutes}:${seconds}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900 text-slate-100 shadow-lg border-b border-slate-800 sticky top-0 z-40">
      {/* Top Status Strip */}
      <div className="bg-slate-950 px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5 text-emerald-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentTime}</span>
          </span>
          <span className="hidden sm:inline border-l border-slate-800 pl-3">
            마지막 업데이트: <strong className="text-slate-200">{lastSyncTime}</strong>
          </span>
          <span className="hidden md:inline border-l border-slate-800 pl-3">
            통합 리포트 데이터: <strong className="text-emerald-400">{totalReportCount}건</strong>
          </span>
        </div>

        {/* 18:00 Auto Update Status */}
        <div className="flex items-center space-x-3 mt-1 sm:mt-0">
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-200 transition">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 w-3.5 h-3.5"
            />
            <span>매일 18:00 자동 업데이트</span>
          </label>
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1">
            <Bell className="w-3 h-3 text-emerald-400 animate-pulse" />
            {nextSyncTimeStr}
          </span>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-slate-800 rounded-xl shadow-md shadow-blue-900/30 text-white border border-blue-400/20">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                팀별 일일 업무 보고 통합 시스템
              </h1>
              <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                v2.6 Sleek Enterprise
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              팀별 엑셀 보고서 자동 통합 • 18시 스케줄링 • 휴가자 현황 • 실시간 대시보드
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 self-end md:self-auto">
          {/* Manual Update Button (요구사항 5) */}
          <button
            onClick={onManualUpdate}
            disabled={isUpdating}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-sm transition-all transform active:scale-95 ${
              isUpdating
                ? 'bg-blue-800 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? '폴더 감시 및 동기화 중...' : '업데이트 (신규 파일 수집)'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-900 border-t border-slate-800 px-4">
        <div className="max-w-7xl mx-auto flex space-x-1.5 overflow-x-auto py-1.5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>대시보드 (업무 현황 및 휴가)</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'table'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>업무 보고 한눈에 보기</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>검색 & 엑셀 내보내기</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
              activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            <span>엑셀 파일 관리 & 폴더 감시</span>
          </button>
        </div>
      </div>
    </header>
  );
};

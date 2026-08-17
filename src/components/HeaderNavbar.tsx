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
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Settings,
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
  autoSyncTime: string;
  setAutoSyncTime: (val: string) => void;
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
  autoSyncTime,
  setAutoSyncTime,
  nextSyncTimeStr,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [isTimePickerOpen, setIsTimePickerOpen] = useState<boolean>(false);
  const [tempHour, setTempHour] = useState<number>(17);
  const [tempMinute, setTempMinute] = useState<number>(30);
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  });

  useEffect(() => {
    const checkMobile = () => {
      const userAgentMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenMobile = window.innerWidth < 768;
      setIsMobile(userAgentMobile || screenMobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

  const handleOpenTimePicker = () => {
    const parts = (autoSyncTime || '17:30').split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    setTempHour(isNaN(h) ? 17 : h);
    setTempMinute(isNaN(m) ? 30 : m);
    setIsTimePickerOpen(true);
  };

  const handleHourUp = () => setTempHour((prev) => (prev + 1) % 24);
  const handleHourDown = () => setTempHour((prev) => (prev - 1 + 24) % 24);

  const handleMinuteUp = (step = 10) => setTempMinute((prev) => (prev + step) % 60);
  const handleMinuteDown = (step = 10) => setTempMinute((prev) => (prev - step + 60) % 60);

  const handleApplyTime = () => {
    const newH = String(tempHour).padStart(2, '0');
    const newM = String(tempMinute).padStart(2, '0');
    setAutoSyncTime(`${newH}:${newM}`);
    setIsTimePickerOpen(false);
  };

  return (
    <header className="bg-slate-900 text-slate-100 shadow-lg border-b border-slate-800 sticky top-0 z-40">
      {/* Top Status Strip */}
      <div className="bg-slate-950 px-3 sm:px-4 py-1.5 text-xs flex flex-wrap items-center justify-between border-b border-slate-800 text-slate-400 gap-y-1">
        <div className="flex items-center space-x-2 sm:space-x-4 flex-wrap">
          <span className="flex items-center space-x-1 text-emerald-400 font-medium">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>{currentTime}</span>
          </span>
          <span className="border-l border-slate-800 pl-2 sm:pl-3 text-slate-300">
            마지막 업데이트: <strong className="text-emerald-400 font-mono">{lastSyncTime || '-'}</strong>
          </span>
          <span className="border-l border-slate-800 pl-2 sm:pl-3 text-slate-400">
            통합 데이터: <strong className="text-emerald-400">{totalReportCount}건</strong>
          </span>
        </div>

        {/* Configurable Auto Update Status */}
        <div className="flex items-center space-x-2 mt-1 sm:mt-0 text-slate-300">
          <label className="flex items-center space-x-1.5 cursor-pointer hover:text-slate-100 transition">
            <input
              type="checkbox"
              checked={autoSyncEnabled}
              onChange={(e) => setAutoSyncEnabled(e.target.checked)}
              className="rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 bg-slate-800 w-3.5 h-3.5 cursor-pointer"
            />
            <span>매일</span>
          </label>
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5">
            <Clock className="w-3 h-3 text-emerald-400" />
            <input
              type="time"
              value={autoSyncTime}
              onChange={(e) => setAutoSyncTime(e.target.value || '17:30')}
              className="bg-transparent text-emerald-400 font-mono font-bold text-xs focus:outline-none cursor-pointer"
              title="시간 직접 입력"
            />
            <button
              type="button"
              onClick={handleOpenTimePicker}
              className="flex items-center space-x-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/60 hover:border-emerald-500 px-1.5 py-0.5 rounded text-[11px] font-bold transition shadow-xs cursor-pointer ml-1"
              title="버튼으로 시간 변경"
            >
              <Settings className="w-3 h-3 text-emerald-400" />
              <span>시간 변경</span>
            </button>
          </div>
          <span>자동 업데이트</span>
          <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1">
            <Bell className="w-3 h-3 text-emerald-400 animate-pulse" />
            {nextSyncTimeStr}
          </span>
        </div>
      </div>

      {/* Time Picker Modal */}
      {isTimePickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <Clock className="w-5 h-5" />
                <span>매일 자동 동기화 시간 변경</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hour & Minute adjustment controls */}
            <div className="flex items-center justify-center space-x-6 py-5 bg-slate-950/80 rounded-xl border border-slate-800/80 mb-6">
              {/* 1. Hour (시간) Column */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[11px] font-bold text-slate-400">시간 변경 (업/다운)</span>
                <button
                  type="button"
                  onClick={handleHourUp}
                  className="p-2.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg border border-slate-700 transition shadow-sm flex items-center justify-center cursor-pointer"
                  title="시간 Up (+1시간)"
                >
                  <ChevronUp className="w-5 h-5" />
                </button>
                <div className="w-16 h-14 bg-slate-900 border-2 border-emerald-500/60 rounded-xl flex items-center justify-center text-2xl font-mono font-bold text-emerald-400 shadow-inner">
                  {String(tempHour).padStart(2, '0')}시
                </div>
                <button
                  type="button"
                  onClick={handleHourDown}
                  className="p-2.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg border border-slate-700 transition shadow-sm flex items-center justify-center cursor-pointer"
                  title="시간 Down (-1시간)"
                >
                  <ChevronDown className="w-5 h-5" />
                </button>
              </div>

              <div className="text-3xl font-mono font-bold text-slate-500 self-center pb-2">:</div>

              {/* 2. Minute (분) Column */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-[11px] font-bold text-slate-400">분 변경 (업/다운)</span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleMinuteUp(10)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[11px] font-bold rounded-lg border border-slate-700 transition shadow-sm cursor-pointer"
                    title="+10분 Up"
                  >
                    +10분
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMinuteUp(1)}
                    className="p-2.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg border border-slate-700 transition shadow-sm flex items-center justify-center cursor-pointer"
                    title="분 Up (+1분)"
                  >
                    <ChevronUp className="w-5 h-5" />
                  </button>
                </div>

                <div className="w-16 h-14 bg-slate-900 border-2 border-emerald-500/60 rounded-xl flex items-center justify-center text-2xl font-mono font-bold text-emerald-400 shadow-inner">
                  {String(tempMinute).padStart(2, '0')}분
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => handleMinuteDown(10)}
                    className="px-2 py-1.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white text-[11px] font-bold rounded-lg border border-slate-700 transition shadow-sm cursor-pointer"
                    title="-10분 Down"
                  >
                    -10분
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMinuteDown(1)}
                    className="p-2.5 bg-slate-800 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-lg border border-slate-700 transition shadow-sm flex items-center justify-center cursor-pointer"
                    title="분 Down (-1분)"
                  >
                    <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Selected preview text */}
            <div className="text-center text-xs text-slate-400 mb-5 bg-slate-950/60 py-2.5 rounded-lg border border-slate-800">
              설정될 자동 동기화 시간: <span className="font-mono font-bold text-emerald-400 text-sm ml-1">{String(tempHour).padStart(2, '0')}:{String(tempMinute).padStart(2, '0')}</span>
            </div>

            {/* 3. Action buttons (적용 버튼) */}
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsTimePickerOpen(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApplyTime}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-900/40 transition flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>적용</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
              팀별 엑셀 보고서 자동 통합 • {autoSyncTime} 스케줄링 • 휴가자 현황 • 실시간 대시보드
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 self-end md:self-auto">
          {/* Server Sync / Fetch Button */}
          <button
            onClick={onManualUpdate}
            disabled={isUpdating}
            title="스마트폰 및 PC 어디서나 서버에 저장된 최신 업무보고 데이터를 즉시 불러옵니다."
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-emerald-800/80 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/30 transition-all cursor-pointer group"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            <span>{isUpdating ? '서버 통신 중...' : `🔄 서버 최신 일지 불러오기 (${totalReportCount}건)`}</span>
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

          {!isMobile && (
            <button
              onClick={() => setActiveTab('upload')}
              className={`hidden md:flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>엑셀 파일 관리 & 폴더 감시 (PC)</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

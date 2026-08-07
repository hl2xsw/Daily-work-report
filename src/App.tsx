import React, { useState, useMemo, useEffect } from 'react';
import { WorkReportItem } from './types';
import { HeaderNavbar } from './components/HeaderNavbar';
import { DashboardView } from './components/DashboardView';
import { ReportTableView } from './components/ReportTableView';
import { SearchView } from './components/SearchView';
import { FileUploadView } from './components/FileUploadView';
import { AutoUpdateTimer } from './components/AutoUpdateTimer';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [reports, setReports] = useState<WorkReportItem[]>(() => {
    const saved = localStorage.getItem('work_reports_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load saved reports', e);
      }
    }
    return []; // Start empty on first run
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'search' | 'upload'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('last_sync_time') || '-';
  });
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [nextSyncTimeStr, setNextSyncTimeStr] = useState<string>('18:00:00 남음');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [importedFilesHistory, setImportedFilesHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('imported_files_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load saved history', e);
      }
    }
    return []; // Start empty on first run
  });

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('work_reports_data', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    localStorage.setItem('imported_files_history', JSON.stringify(importedFilesHistory));
  }, [importedFilesHistory]);

  useEffect(() => {
    if (lastSyncTime !== '-') {
      localStorage.setItem('last_sync_time', lastSyncTime);
    }
  }, [lastSyncTime]);

  // Unique list of dates
  const availableDates = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.date))).sort().reverse();
  }, [reports]);

  // Sync selectedDate when new reports are imported
  useEffect(() => {
    if (availableDates.length > 0 && !selectedDate) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  // Manual & Auto Update Action from watched folder
  const handleTriggerUpdate = () => {
    const folderPath = localStorage.getItem('watched_folder_path') || 'D:\\Data_JAC\\_EV Innovation 부문\\업무일지\\8월';
    setIsUpdating(true);
    showToast(`🔄 감시 폴더(${folderPath}) 및 하위 폴더 전체 스캔을 위해 [업로드/동기화] 탭으로 이동합니다.`);

    setTimeout(() => {
      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setIsUpdating(false);
      setActiveTab('upload');
    }, 600);
  };

  // Clear all data manually if user wants a clean slate
  const handleClearAllData = () => {
    if (window.confirm('정말로 수집된 모든 업무일지 데이터와 이력을 초기화하시겠습니까?')) {
      setReports([]);
      setImportedFilesHistory([]);
      localStorage.removeItem('work_reports_data');
      localStorage.removeItem('imported_files_history');
      setSelectedDate('');
      showToast('🧹 모든 업무일지 데이터와 수집 이력이 초기화되었습니다.');
    }
  };

  // Import uploaded custom files
  const handleImportReports = (newReports: WorkReportItem[], fileNames?: string[]) => {
    if (newReports.length > 0) {
      setReports((prev) => {
        const existingIds = new Set(prev.map((r) => r.id));
        const uniqueNew = newReports.filter((r) => !existingIds.has(r.id));
        return [...uniqueNew, ...prev];
      });
    }

    const importedNames = fileNames && fileNames.length > 0 
      ? fileNames 
      : Array.from(new Set(newReports.map((r) => r.sourceFileName).filter((f): f is string => Boolean(f))));

    if (importedNames.length > 0) {
      setImportedFilesHistory((prev) => {
        const combined = new Set([...importedNames, ...prev]);
        return Array.from(combined);
      });
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);
    showToast(`✅ ${importedNames.length}개 파일 (${newReports.length}건) 업무일지가 성공적으로 동기화되었습니다!`);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans flex flex-col antialiased">
      {/* Navbar Header */}
      <HeaderNavbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onManualUpdate={handleTriggerUpdate}
        isUpdating={isUpdating}
        lastSyncTime={lastSyncTime}
        totalReportCount={reports.length}
        autoSyncEnabled={autoSyncEnabled}
        setAutoSyncEnabled={setAutoSyncEnabled}
        nextSyncTimeStr={nextSyncTimeStr}
      />

      {/* Main Body Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            reports={reports}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            availableDates={availableDates}
          />
        )}

        {activeTab === 'table' && <ReportTableView reports={reports} />}

        {activeTab === 'search' && <SearchView reports={reports} />}

        {activeTab === 'upload' && (
          <FileUploadView
            onImportReports={handleImportReports}
            onTriggerUpdate={handleTriggerUpdate}
            onClearAllData={handleClearAllData}
            isUpdating={isUpdating}
            importedFilesHistory={importedFilesHistory}
          />
        )}
      </main>

      {/* Requirement 8: Scheduled Daily 18:00 Auto Update Notification */}
      <AutoUpdateTimer
        enabled={autoSyncEnabled}
        onAutoTriggerUpdate={handleTriggerUpdate}
        setNextSyncTimeStr={setNextSyncTimeStr}
      />

      {/* Toast Alert Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-slate-100 border border-blue-500 shadow-xl shadow-blue-950/40 px-5 py-3 rounded-xl flex items-center space-x-3 text-xs font-bold animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>팀별 일일 업무 보고 통합 관리 시스템 • 260803 그리드팀 업무 공유.xlsx 규격 호환 • 매일 18시 자동 동기화</p>
      </footer>
    </div>
  );
}

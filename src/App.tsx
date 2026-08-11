import React, { useState, useMemo, useEffect } from 'react';
import { WorkReportItem } from './types';
import { HeaderNavbar } from './components/HeaderNavbar';
import { DashboardView } from './components/DashboardView';
import { ReportTableView } from './components/ReportTableView';
import { SearchView } from './components/SearchView';
import { FileUploadView } from './components/FileUploadView';
import { AutoUpdateTimer } from './components/AutoUpdateTimer';
import { performFolderScan } from './utils/folderScanner';
import { CheckCircle2 } from 'lucide-react';

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
  const [autoSyncTime, setAutoSyncTime] = useState<string>(() => {
    return localStorage.getItem('auto_sync_time') || '17:30';
  });
  const [nextSyncTimeStr, setNextSyncTimeStr] = useState<string>('남음');
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

  useEffect(() => {
    localStorage.setItem('auto_sync_time', autoSyncTime);
  }, [autoSyncTime]);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Import uploaded custom files with strict file & row deduplication
  const handleImportReports = React.useCallback((newReports: WorkReportItem[], fileNames?: string[]) => {
    const existingFileSet = new Set(importedFilesHistory);
    const existingIds = new Set(reports.map((r) => r.id));
    const existingCompositeKeys = new Set(
      reports.map((r) => `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim())
    );

    // Filter out reports that already exist by ID or composite key
    const filteredReports = newReports.filter((r) => {
      if (existingIds.has(r.id)) return false;
      const key = `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
      if (existingCompositeKeys.has(key)) return false;
      return true;
    });

    const candidateFileNames = fileNames && fileNames.length > 0 
      ? fileNames 
      : Array.from(new Set(newReports.map((r) => r.sourceFileName).filter((f): f is string => Boolean(f))));

    const newFileNames = candidateFileNames.filter((fn) => !existingFileSet.has(fn));

    if (filteredReports.length > 0) {
      setReports((prev) => {
        const prevIds = new Set(prev.map((r) => r.id));
        const prevKeys = new Set(prev.map((r) => `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim()));
        const trulyNew = filteredReports.filter((r) => {
          if (prevIds.has(r.id)) return false;
          const key = `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
          if (prevKeys.has(key)) return false;
          return true;
        });
        return [...trulyNew, ...prev];
      });
    }

    if (candidateFileNames.length > 0) {
      setImportedFilesHistory((prev) => {
        const combined = new Set([...candidateFileNames, ...prev]);
        return Array.from(combined);
      });
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);

    if (filteredReports.length > 0) {
      showToast(`✅ ${candidateFileNames.length}개 파일 중 ${newFileNames.length}개 신규 파일 (${filteredReports.length}건 업무일지) 수집 완료!`);
    } else {
      showToast(`ℹ️ 기존에 이미 읽어온 업무일지 파일입니다. (중복 데이터 제외)`);
    }

    return {
      addedReportsCount: filteredReports.length,
      newFilesCount: newFileNames.length,
    };
  }, [importedFilesHistory, reports]);

  // Manual & Auto Update Action from watched folder
  const handleTriggerUpdate = React.useCallback(async () => {
    setIsUpdating(true);
    const folderPath = localStorage.getItem('watched_folder_path') || 'D:\\Data_JAC\\_EV Innovation 부문\\업무일지\\8월';
    showToast(`🔄 감시 폴더(${folderPath}) 스캔 및 신규 파일 동기화 진행 중...`);

    try {
      const result = await performFolderScan();
      if (!result.needFolderPermission) {
        // Filter files that are already imported
        const existingFileSet = new Set(importedFilesHistory);
        const unimportedFiles = result.fileNames.filter((fn) => !existingFileSet.has(fn));
        const unimportedReports = result.reports.filter((r) => !r.sourceFileName || !existingFileSet.has(r.sourceFileName));

        if (unimportedReports.length > 0 || unimportedFiles.length > 0) {
          const importRes = handleImportReports(unimportedReports, unimportedFiles);
          if (importRes.addedReportsCount === 0) {
            showToast(`✅ [${result.scannedFolderName || '감시 폴더'}] 동기화 완료: 기존에 읽어온 업무일지 파일입니다. (신규 추가 건수 0건)`);
          }
        } else {
          showToast(`✅ [${result.scannedFolderName || '감시 폴더'}] 동기화 완료: 기존에 이미 읽어온 업무일지 파일입니다. (신규 파일 없음)`);
        }
      } else {
        showToast(`📁 [업로드/동기화] 탭에서 [감시 폴더 선택 & 승인]을 완료하시면 매일 ${autoSyncTime}에 자동으로 수집됩니다.`);
        setActiveTab('upload');
      }
    } catch (err: any) {
      console.error('Auto folder scan failed:', err);
      showToast(`📁 [업로드/동기화] 탭에서 감시 폴더를 선택하고 권한을 승인해 주세요.`);
      setActiveTab('upload');
    } finally {
      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setIsUpdating(false);
    }
  }, [importedFilesHistory, handleImportReports, autoSyncTime]);

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
        autoSyncTime={autoSyncTime}
        setAutoSyncTime={setAutoSyncTime}
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

      {/* Scheduled Daily Auto Update Notification */}
      <AutoUpdateTimer
        enabled={autoSyncEnabled}
        autoSyncTime={autoSyncTime}
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
        <p>팀별 일일 업무 보고 통합 관리 시스템 • 규격 호환 • 매일 {autoSyncTime} 자동 동기화</p>
      </footer>
    </div>
  );
}

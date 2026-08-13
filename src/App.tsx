import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { WorkReportItem } from './types';
import { HeaderNavbar } from './components/HeaderNavbar';
import { DashboardView } from './components/DashboardView';
import { ReportTableView } from './components/ReportTableView';
import { SearchView } from './components/SearchView';
import { FileUploadView } from './components/FileUploadView';
import { AutoUpdateTimer } from './components/AutoUpdateTimer';
import {
  performFolderScan,
  saveDirectoryHandle,
  scanDirectoryHandleRecursively,
  parseFileList,
} from './utils/folderScanner';
import { initialSampleReports } from './data/sampleReports';
import { CheckCircle2 } from 'lucide-react';

const isSampleReportItem = (r: any) => {
  if (!r || typeof r !== 'object') return true;
  if (r.isSample === true) return true;
  if (typeof r.id === 'string' && r.id.startsWith('sample-demo-')) return true;
  return false;
};

export default function App() {
  const [reports, setReports] = useState<WorkReportItem[]>(() => {
    const saved = localStorage.getItem('work_reports_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r) => r && typeof r.id === 'string' && !isSampleReportItem(r));
        }
      } catch (e) {
        console.error('Failed to load saved reports', e);
      }
    }
    return [];
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
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((h: any) => typeof h === 'string');
        }
      } catch (e) {
        console.error('Failed to load saved history', e);
      }
    }
    return [];
  });

  // Refs for current state to avoid stale closures in interval / callbacks
  const reportsRef = useRef(reports);
  const historyRef = useRef(importedFilesHistory);
  const lastSyncTimeRef = useRef(lastSyncTime);
  const isPostingRef = useRef(false);

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    historyRef.current = importedFilesHistory;
  }, [importedFilesHistory]);

  useEffect(() => {
    lastSyncTimeRef.current = lastSyncTime;
  }, [lastSyncTime]);

  // Sync to server API
  const pushReportsToServer = useCallback(async (
    updatedReports: WorkReportItem[],
    updatedHistory: string[],
    syncTime: string,
    forceClear = false
  ) => {
    isPostingRef.current = true;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reports: updatedReports,
          history: updatedHistory,
          lastSyncTime: syncTime,
          forceClear,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.reports)) {
          const clean = data.reports.filter((r: any) => r && typeof r.id === 'string' && !isSampleReportItem(r));
          reportsRef.current = clean;
          setReports(clean);
          if (Array.isArray(data.history)) {
            const cleanHist = data.history.filter((h: any) => typeof h === 'string');
            historyRef.current = cleanHist;
            setImportedFilesHistory(cleanHist);
          }
          if (data.lastSyncTime !== undefined) {
            setLastSyncTime(data.lastSyncTime);
          }
        }
      } else {
        console.error('Failed to push reports to server, status:', res.status);
      }
    } catch (e) {
      console.error('Failed to push reports to server:', e);
    } finally {
      isPostingRef.current = false;
    }
  }, []);

  // Fetch live reports from central server for smartphone/multi-device sync
  const fetchServerReports = useCallback(async () => {
    if (isPostingRef.current) return;
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.reports)) {
          const cleanServerReports = data.reports.filter((r: any) => r && typeof r.id === 'string' && !isSampleReportItem(r));
          const cleanHistory = Array.isArray(data.history)
            ? data.history.filter((h: any) => typeof h === 'string')
            : [];

          const current = reportsRef.current;
          const currentHist = historyRef.current;

          // Case 1: Server has reports, client has none (e.g. smartphone opened link for first time)
          if (cleanServerReports.length > 0 && current.length === 0) {
            reportsRef.current = cleanServerReports;
            setReports(cleanServerReports);
            historyRef.current = cleanHistory;
            setImportedFilesHistory(cleanHistory);
            if (data.lastSyncTime !== undefined && data.lastSyncTime !== '-') {
              setLastSyncTime(data.lastSyncTime);
            }
            return;
          }

          // Case 2: Client has reports, server has none (e.g. server restarted or not yet populated)
          if (current.length > 0 && cleanServerReports.length === 0) {
            pushReportsToServer(current, currentHist, lastSyncTimeRef.current);
            return;
          }

          // Case 3: Both have reports -> Smart Merge
          if (cleanServerReports.length > 0 && current.length > 0) {
            const mergedMap = new Map<string, WorkReportItem>();
            cleanServerReports.forEach((r) => {
              const key = r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
              mergedMap.set(key, r);
            });
            current.forEach((r) => {
              const key = r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
              if (!mergedMap.has(key)) {
                mergedMap.set(key, r);
              }
            });

            const mergedList = Array.from(mergedMap.values());
            const mergedHist = Array.from(new Set([...cleanHistory, ...currentHist]));

            // If server had new items that client didn't have
            if (cleanServerReports.length > current.length || mergedList.length > current.length) {
              reportsRef.current = mergedList;
              setReports(mergedList);
              historyRef.current = mergedHist;
              setImportedFilesHistory(mergedHist);
              if (data.lastSyncTime !== undefined && data.lastSyncTime !== '-') {
                setLastSyncTime(data.lastSyncTime);
              }
            }
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch from server API:', err);
    }
  }, [pushReportsToServer]);

  // Sync on initial mount: Load server reports + local storage combined
  useEffect(() => {
    let mounted = true;
    const initData = async () => {
      let serverReports: WorkReportItem[] = [];
      let serverHist: string[] = [];
      let serverSyncTime = '-';

      try {
        const res = await fetch('/api/reports');
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reports)) {
            serverReports = data.reports.filter((r: any) => r && typeof r.id === 'string' && !isSampleReportItem(r));
            serverHist = Array.isArray(data.history) ? data.history.filter((h: any) => typeof h === 'string') : [];
            if (data.lastSyncTime) serverSyncTime = data.lastSyncTime;
          }
        }
      } catch (e) {
        console.warn('Initial server fetch failed, checking local storage:', e);
      }

      // Read local storage
      const saved = localStorage.getItem('work_reports_data');
      const savedHistory = localStorage.getItem('imported_files_history');
      const savedSyncTime = localStorage.getItem('last_sync_time') || '-';

      let localReports: WorkReportItem[] = [];
      let localHist: string[] = [];

      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          localReports = Array.isArray(parsed) ? parsed.filter((r) => r && typeof r.id === 'string' && !isSampleReportItem(r)) : [];
        } catch (e) {}
      }
      if (savedHistory) {
        try {
          const parsedH = JSON.parse(savedHistory);
          localHist = Array.isArray(parsedH) ? parsedH.filter((h: any) => typeof h === 'string') : [];
        } catch (e) {}
      }

      // Deduplicated Merge
      const map = new Map<string, WorkReportItem>();
      serverReports.forEach((r) => map.set(r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim(), r));
      localReports.forEach((r) => {
        const key = r.id || `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
        if (!map.has(key)) map.set(key, r);
      });

      const combinedReports = Array.from(map.values());
      const combinedHist = Array.from(new Set([...serverHist, ...localHist]));
      const finalSyncTime = serverSyncTime !== '-' ? serverSyncTime : savedSyncTime;

      if (mounted) {
        reportsRef.current = combinedReports;
        setReports(combinedReports);
        historyRef.current = combinedHist;
        setImportedFilesHistory(combinedHist);
        if (finalSyncTime !== '-') setLastSyncTime(finalSyncTime);
      }

      // If local storage had items that were not on server yet, push to server
      if (combinedReports.length > serverReports.length) {
        await pushReportsToServer(combinedReports, combinedHist, finalSyncTime);
      }
    };

    initData();
    return () => {
      mounted = false;
    };
  }, [pushReportsToServer]);

  // Periodic polling for smartphones/secondary tabs
  useEffect(() => {
    const interval = setInterval(fetchServerReports, 3000);
    return () => clearInterval(interval);
  }, [fetchServerReports]);

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
    const currentReports = reportsRef.current;
    const currentHistory = historyRef.current;

    const existingFileSet = new Set(currentHistory);
    const existingIds = new Set(currentReports.map((r) => r.id));
    const existingCompositeKeys = new Set(
      currentReports.map((r) => `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim())
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

    let finalReports = currentReports;
    if (filteredReports.length > 0) {
      const prevIds = new Set(currentReports.map((r) => r.id));
      const prevKeys = new Set(currentReports.map((r) => `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim()));
      const trulyNew = filteredReports.filter((r) => {
        if (prevIds.has(r.id)) return false;
        const key = `${r.date}_${r.team}_${r.author}_${r.todayTask}`.trim();
        if (prevKeys.has(key)) return false;
        return true;
      });
      finalReports = [...trulyNew, ...currentReports];
      reportsRef.current = finalReports;
      setReports(finalReports);
    }

    let finalHistory = currentHistory;
    if (candidateFileNames.length > 0) {
      const combined = new Set([...candidateFileNames, ...currentHistory]);
      finalHistory = Array.from(combined);
      historyRef.current = finalHistory;
      setImportedFilesHistory(finalHistory);
    }

    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);

    // Push to server so smartphones see it instantly
    pushReportsToServer(finalReports, finalHistory, nowStr);

    if (filteredReports.length > 0) {
      showToast(`✅ ${candidateFileNames.length}개 파일 중 ${newFileNames.length}개 신규 파일 (${filteredReports.length}건 업무일지) 수집 완료!`);
    } else {
      showToast(`ℹ️ 기존에 이미 읽어온 업무일지 파일입니다. (중복 데이터 제외)`);
    }

    return {
      addedReportsCount: filteredReports.length,
      newFilesCount: newFileNames.length,
    };
  }, [pushReportsToServer]);

  // Manual & Auto Update Action from watched folder
  const handleTriggerUpdate = React.useCallback(async () => {
    setIsUpdating(true);
    const folderPath = localStorage.getItem('watched_folder_path') || 'D:\\Data_JAC\\_EV Innovation 부문\\업무일지\\8월';

    try {
      // 1. Try scanning using stored DirectoryHandle if permission is active
      const result = await performFolderScan();
      if (!result.needFolderPermission) {
        if (result.reports.length > 0 || result.fileNames.length > 0) {
          const importRes = handleImportReports(result.reports, result.fileNames);
          if (importRes.addedReportsCount === 0) {
            showToast(`✅ [${result.scannedFolderName || '감시 폴더'}] 동기화 완료: 기존 수집 데이터 유지 중 (${reports.length}건)`);
          }
        } else {
          showToast(`ℹ️ [${result.scannedFolderName || '감시 폴더'}] 폴더에 엑셀 업무일지 파일이 없습니다.`);
        }
        return;
      }

      // 2. If directory handle needs user gesture or is missing: Open folder picker directly on desktop
      if ('showDirectoryPicker' in window) {
        try {
          showToast(`📂 감시 폴더 [${folderPath}] 승인을 위해 폴더 선택 창을 엽니다...`);
          // @ts-ignore
          const handle = await window.showDirectoryPicker();
          if (handle) {
            await saveDirectoryHandle(handle);
            localStorage.setItem('watched_folder_path', handle.name);

            const entries = await scanDirectoryHandleRecursively(handle);
            const files = entries.map((e) => e.file);
            const { reports: scannedReports, fileNames } = await parseFileList(files);

            if (fileNames.length > 0) {
              handleImportReports(scannedReports, fileNames);
            } else {
              showToast(`ℹ️ 선택한 폴더 [${handle.name}]에 엑셀 업무일지 파일이 존재하지 않습니다.`);
            }
            return;
          }
        } catch (pickerErr: any) {
          if (pickerErr.name === 'AbortError') {
            showToast(`ℹ️ 폴더 선택이 취소되었습니다.`);
            return;
          }
        }
      }

      // 3. Fallback for mobile / older browsers: Trigger file input click
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'file';
      hiddenInput.multiple = true;
      hiddenInput.accept = '.xlsx, .xls, .csv';
      hiddenInput.onchange = async (e: any) => {
        const files = e.target.files;
        if (files && files.length > 0) {
          showToast(`📂 선택한 ${files.length}개 엑셀 파일 수집 중...`);
          const { reports: scannedReports, fileNames } = await parseFileList(files);
          handleImportReports(scannedReports, fileNames);
        }
      };
      hiddenInput.click();

    } catch (err: any) {
      console.error('Auto folder scan failed:', err);
      showToast(`📁 엑셀 파일 선택 후 즉시 동기화됩니다.`);
      setActiveTab('upload');
    } finally {
      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setIsUpdating(false);
      if (reportsRef.current.length > 0) {
        pushReportsToServer(reportsRef.current, historyRef.current, nowStr);
      }
    }
  }, [handleImportReports, pushReportsToServer]);

  // Clear all data manually if user wants a clean slate
  const handleClearAllData = async () => {
    if (window.confirm('정말로 수집된 모든 업무일지 데이터와 이력을 초기화하시겠습니까?')) {
      setReports([]);
      setImportedFilesHistory([]);
      localStorage.removeItem('work_reports_data');
      localStorage.removeItem('imported_files_history');
      localStorage.setItem('last_sync_time', '-');
      setSelectedDate('');
      setLastSyncTime('-');
      try {
        await pushReportsToServer([], [], '-', true);
        await fetch('/api/reports', { method: 'DELETE' });
      } catch (e) {
        console.error('Failed to clear server reports:', e);
      }
      showToast('🧹 모든 업무일지 데이터와 수집 이력이 초기화되었습니다.');
    }
  };

  // Load sample data on demand
  const handleLoadSampleData = async () => {
    const activeDemoReports = initialSampleReports.map((r) => ({
      ...r,
      isSample: false,
      id: r.id.replace('sample-demo-', 'demo-'),
    }));
    setReports(activeDemoReports);
    const sampleHistory = [
      "260812 그리드팀 업무 공유.xlsx",
      "260812 개발팀 업무 공유.xlsx",
      "260812 운영팀 업무 공유.xlsx",
      "260812 인프라팀 업무 공유.xlsx"
    ];
    setImportedFilesHistory(sampleHistory);
    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);
    await pushReportsToServer(activeDemoReports, sampleHistory, nowStr);
    showToast('💡 샘플 데모 데이터가 수집 및 서버 동기화되었습니다.');
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
            onLoadSampleData={handleLoadSampleData}
            onGoToUpload={() => setActiveTab('upload')}
          />
        )}

        {activeTab === 'table' && <ReportTableView reports={reports} />}

        {activeTab === 'search' && <SearchView reports={reports} />}

        {activeTab === 'upload' && (
          <FileUploadView
            onImportReports={handleImportReports}
            onTriggerUpdate={handleTriggerUpdate}
            onClearAllData={handleClearAllData}
            onLoadSampleData={handleLoadSampleData}
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

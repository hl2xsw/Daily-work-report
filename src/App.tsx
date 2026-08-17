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

const isValidReportItem = (r: any): r is WorkReportItem => {
  if (!r || typeof r !== 'object') return false;
  if (typeof r.id !== 'string' || !r.id) return false;
  return true;
};

export default function App() {
  const [reports, setReports] = useState<WorkReportItem[]>(() => {
    const saved = localStorage.getItem('work_reports_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(isValidReportItem);
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

  // Sync to server API with retry support
  const pushReportsToServer = useCallback(
    async (
      updatedReports: WorkReportItem[],
      updatedHistory: string[],
      syncTime: string,
      forceClear = false,
      overwrite = true
    ) => {
      isPostingRef.current = true;
      try {
        const res = await fetch(`/api/reports?_t=${Date.now()}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
          body: JSON.stringify({
            reports: updatedReports,
            history: updatedHistory,
            lastSyncTime: syncTime,
            forceClear,
            overwrite,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reports)) {
            const clean = data.reports.filter(isValidReportItem);
            reportsRef.current = clean;
            setReports(clean);
            if (Array.isArray(data.history)) {
              const cleanHist = data.history.filter((h: any) => typeof h === 'string');
              historyRef.current = cleanHist;
              setImportedFilesHistory(cleanHist);
            }
            if (data.lastSyncTime !== undefined && data.lastSyncTime !== '-') {
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
    },
    []
  );

  // Fetch live reports from central server for smartphone/multi-device sync (with cache-busting)
  const fetchServerReports = useCallback(
    async (isManualTrigger = false) => {
      if (isPostingRef.current) return;
      try {
        const cacheBuster = `_t=${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const res = await fetch(`/api/reports?${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        const d = new Date();
        const nowStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reports)) {
            const cleanServerReports = data.reports.filter(isValidReportItem);
            const cleanHistory = Array.isArray(data.history)
              ? data.history.filter((h: any) => typeof h === 'string')
              : [];

            reportsRef.current = cleanServerReports;
            setReports(cleanServerReports);
            historyRef.current = cleanHistory;
            setImportedFilesHistory(cleanHistory);
            
            // Set current real-time fetch time
            setLastSyncTime(nowStr);
            localStorage.setItem('last_sync_time', nowStr);

            if (cleanServerReports.length > 0) {
              if (isManualTrigger) {
                showToast(`✅ 서버에서 최신 업무보고 ${cleanServerReports.length}건을 성공적으로 불러왔습니다.`);
              }
              return cleanServerReports;
            } else {
              if (isManualTrigger) {
                showToast('ℹ️ 서버에 등록된 업무보고 데이터가 없습니다. (PC에서 엑셀 파일을 업로드해 주세요)');
              }
              return [];
            }
          }
        } else {
          console.warn('Server API error status:', res.status);
          if (isManualTrigger) {
            showToast(`⚠️ 서버 통신 실패 (상태코드: ${res.status}). 다시 시도해주세요.`);
          }
        }
      } catch (err) {
        console.warn('Could not fetch from server API:', err);
        if (isManualTrigger) {
          showToast('⚠️ 서버 연결 중 오류가 발생했습니다. 네트워크 상태를 확인해주세요.');
        }
      }
    },
    []
  );

  // Sync on initial mount: Load server reports with automatic retry fallback
  useEffect(() => {
    let mounted = true;
    let retryTimeout: any = null;

    const initDataWithRetry = async (attempt = 1) => {
      try {
        const cacheBuster = `_t=${Date.now()}_init${attempt}`;
        const res = await fetch(`/api/reports?${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            Pragma: 'no-cache',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.reports)) {
            const cleanReports = data.reports.filter(isValidReportItem);
            const cleanHist = Array.isArray(data.history)
              ? data.history.filter((h: any) => typeof h === 'string')
              : [];
            const syncTime = data.lastSyncTime || '-';

            if (mounted) {
              reportsRef.current = cleanReports;
              setReports(cleanReports);
              historyRef.current = cleanHist;
              setImportedFilesHistory(cleanHist);
              if (syncTime !== '-') setLastSyncTime(syncTime);
            }
            return;
          }
        }
      } catch (e) {
        console.warn(`Init data fetch attempt ${attempt} failed:`, e);
      }

      // If nothing loaded and attempts left, retry in 1.5s
      if (attempt < 3 && mounted) {
        retryTimeout = setTimeout(() => {
          if (mounted) initDataWithRetry(attempt + 1);
        }, 1500);
      }
    };

    initDataWithRetry(1);

    return () => {
      mounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  // Prevent mobile device from staying in upload tab
  useEffect(() => {
    const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobileDevice && activeTab === 'upload') {
      setActiveTab('dashboard');
    }
  }, [activeTab]);

  // Periodic lightweight background sync check (Every 4 seconds) to guarantee real-time updates across PC & Smartphone
  useEffect(() => {
    const checkServerStatus = async () => {
      if (isPostingRef.current) return;
      try {
        const cacheBuster = `_t=${Date.now()}`;
        const res = await fetch(`/api/reports/status?${cacheBuster}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache, no-store', Pragma: 'no-cache' },
        });
        if (res.ok) {
          const status = await res.json();
          const currentCount = reportsRef.current.length;
          const currentSync = lastSyncTimeRef.current;

          // If server count or lastSyncTime changed compared to client state, do full fetch
          if (
            (status.count !== undefined && status.count !== currentCount) ||
            (status.lastSyncTime && status.lastSyncTime !== '-' && status.lastSyncTime !== currentSync)
          ) {
            fetchServerReports();
          }
        }
      } catch (e) {
        // Silent catch for background ping
      }
    };

    const interval = setInterval(checkServerStatus, 4000);
    return () => clearInterval(interval);
  }, [fetchServerReports]);

  // Sync immediately on tab focus or visibility change (When smartphone user opens or returns to web page)
  useEffect(() => {
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchServerReports();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
    };
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
    return Array.from(new Set(reports.map((r) => r.date).filter(Boolean))).sort().reverse();
  }, [reports]);

  // Sync selectedDate when new reports are imported or loaded
  useEffect(() => {
    if (availableDates.length > 0) {
      if (!selectedDate || !availableDates.includes(selectedDate)) {
        setSelectedDate(availableDates[0]);
      }
    } else if (selectedDate) {
      setSelectedDate('');
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
    pushReportsToServer(finalReports, finalHistory, nowStr, false, true);

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

  // Manual & Auto Update Action: Strictly fetches live data from server for PC & Smartphone
  const handleTriggerUpdate = React.useCallback(async () => {
    setIsUpdating(true);
    try {
      // Fetch latest server reports directly from backend API
      await fetchServerReports(true);
    } catch (err: any) {
      console.error('Update action failed:', err);
      showToast(`⚠️ 서버 데이터 동기화 중 오류가 발생했습니다.`);
    } finally {
      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setIsUpdating(false);
    }
  }, [fetchServerReports]);

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
            onGoToUpload={() => setActiveTab('upload')}
            onTriggerUpdate={handleTriggerUpdate}
            isUpdating={isUpdating}
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

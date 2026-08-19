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
} from './utils/folderScanner';
import { CheckCircle2 } from 'lucide-react';

const isValidReportItem = (r: any): r is WorkReportItem => {
  if (!r || typeof r !== 'object') return false;
  if (typeof r.id !== 'string' || !r.id) return false;
  return Boolean(r.author || r.todayTask || r.team || r.date);
};

export default function App() {
  const [reports, setReports] = useState<WorkReportItem[]>(() => {
    try {
      const saved = localStorage.getItem('work_reports_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(isValidReportItem);
          if (clean.length !== parsed.length) {
            localStorage.setItem('work_reports_data', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch (e) {
      console.error('Failed to load saved reports', e);
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

  useEffect(() => {
    reportsRef.current = reports;
  }, [reports]);

  useEffect(() => {
    historyRef.current = importedFilesHistory;
  }, [importedFilesHistory]);

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

    if (filteredReports.length > 0) {
      showToast(`✅ ${candidateFileNames.length}개 파일 중 ${newFileNames.length}개 신규 파일 (${filteredReports.length}건 업무일지) 수집 완료!`);
    } else {
      showToast(`ℹ️ 기존에 이미 읽어온 업무일지 파일입니다. (중복 데이터 제외)`);
    }

    return {
      addedReportsCount: filteredReports.length,
      newFilesCount: newFileNames.length,
    };
  }, []);

  // Manual & Auto Update Action: Scans local folder handle if available, or refreshes local state
  const handleTriggerUpdate = React.useCallback(async () => {
    setIsUpdating(true);
    try {
      const scanResult = await performFolderScan();
      if (scanResult && scanResult.fileNames.length > 0) {
        handleImportReports(scanResult.reports, scanResult.fileNames);
      } else {
        const nowStr = new Date().toLocaleTimeString('ko-KR');
        setLastSyncTime(nowStr);
        showToast(`🔄 최신 데이터가 정상 갱신되었습니다. (총 ${reportsRef.current.length}건)`);
      }
    } catch (err: any) {
      console.error('Update action failed:', err);
      showToast(`⚠️ 데이터 갱신 중 오류가 발생했습니다: ${err.message || '다시 시도해 주세요.'}`);
    } finally {
      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setIsUpdating(false);
    }
  }, [handleImportReports]);

  // Load sample 3 teams data for quick demonstration
  const handleLoadSampleData = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const displayDateStr = `${yyyy}년 ${mm}월 ${dd}일`;

    const sampleItems: WorkReportItem[] = [
      {
        id: `sample-${dateStr}-grid-1`,
        date: dateStr,
        displayDate: displayDateStr,
        department: 'EV Innovation 부문',
        team: '그리드팀',
        author: '김그리드',
        todayTask: '전력 그리드 변전소 연계 통신 모듈 펌웨어 업데이트 및 현장 부하 시험',
        taskResult: '정상 완료 (통신 지연 12ms 이하 달성)',
        tomorrowTask: '신재생 연계 ESS 인버터 제어 알고리즘 검증',
        status: '완료',
        issues: '특이사항 없음',
        remarks: '정상 작동 확인',
        isVacationToday: false,
        isVacationTomorrow: false,
        sourceFileName: '260803 그리드팀 업무 공유.xlsx',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `sample-${dateStr}-grid-2`,
        date: dateStr,
        displayDate: displayDateStr,
        department: 'EV Innovation 부문',
        team: '그리드팀',
        author: '이전력',
        todayTask: '하계 전력 피크 대비 원격 차단기 자동 트립 시뮬레이션',
        taskResult: '진행중 (70% 완료)',
        tomorrowTask: '시뮬레이션 결과 리포트 작성 및 배포',
        status: '진행중',
        issues: '3구역 차단기 응답 지연 발생 (원인 분석 중)',
        remarks: '익일 오전 연차 예정',
        isVacationToday: false,
        isVacationTomorrow: true,
        vacationTypeTomorrow: '오전반차',
        sourceFileName: '260803 그리드팀 업무 공유.xlsx',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `sample-${dateStr}-dev-1`,
        date: dateStr,
        displayDate: displayDateStr,
        department: 'EV Innovation 부문',
        team: '개발팀',
        author: '박개발',
        todayTask: '실시간 업무보고 분석 대시보드 v2.6 릴리즈 및 UI 컴포넌트 배포',
        taskResult: '배포 완료 및 모니터링 중',
        tomorrowTask: '부문별 일일 업무 보고서 엑셀 내보내기 템플릿 정교화',
        status: '완료',
        issues: '없음',
        remarks: '금일 연차',
        isVacationToday: true,
        vacationTypeToday: '연차',
        isVacationTomorrow: false,
        sourceFileName: '260803 개발팀 업무 공유.xlsx',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `sample-${dateStr}-dev-2`,
        date: dateStr,
        displayDate: displayDateStr,
        department: 'EV Innovation 부문',
        team: '개발팀',
        author: '최코딩',
        todayTask: '엑셀 자동 파싱 모듈 컬럼 매핑 유연성 강화 (A~F열 자동 인식)',
        taskResult: '개발 완료 및 단위 테스트 통과',
        tomorrowTask: '로컬 폴더 감시 파일 변경 감지 로직 최적화',
        status: '완료',
        issues: '없음',
        remarks: '정상',
        isVacationToday: false,
        isVacationTomorrow: false,
        sourceFileName: '260803 개발팀 업무 공유.xlsx',
        updatedAt: new Date().toISOString(),
      },
      {
        id: `sample-${dateStr}-ops-1`,
        date: dateStr,
        displayDate: displayDateStr,
        department: 'EV Innovation 부문',
        team: '운영팀',
        author: '정운영',
        todayTask: '전국 충전소 인프라 24시간 가동률 점검 및 비상 발전기 루틴 테스트',
        taskResult: '가동률 99.8% 유지',
        tomorrowTask: '고객 센터 접수 장애 티켓 14건 심층 분석 및 조치',
        status: '진행중',
        issues: '강남구 2번 충전기 결제 통신 간헐적 단절 (현장 출동 점검 필요)',
        remarks: '이슈 확인 요망',
        isVacationToday: false,
        isVacationTomorrow: false,
        sourceFileName: '260803 운영팀 업무 공유.xlsx',
        updatedAt: new Date().toISOString(),
      },
    ];

    const sampleFiles = [
      '260803 그리드팀 업무 공유.xlsx',
      '260803 개발팀 업무 공유.xlsx',
      '260803 운영팀 업무 공유.xlsx',
    ];

    setReports(sampleItems);
    setImportedFilesHistory(sampleFiles);
    setSelectedDate(dateStr);
    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);

    showToast('🚀 샘플 3개팀 업무일지 5건이 생성되었습니다!');
  };

  // Clear all data manually if user wants a clean slate
  const handleClearAllData = () => {
    if (window.confirm('정말로 수집된 모든 업무일지 데이터와 이력을 초기화하시겠습니까?')) {
      setReports([]);
      setImportedFilesHistory([]);
      localStorage.removeItem('work_reports_data');
      localStorage.removeItem('imported_files_history');
      localStorage.setItem('last_sync_time', '-');
      setSelectedDate('');
      setLastSyncTime('-');
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
        <p>팀별 일일 업무 보고 통합 관리 시스템 • 규격 호환 • 매일 {autoSyncTime} 자동 갱신</p>
      </footer>
    </div>
  );
}

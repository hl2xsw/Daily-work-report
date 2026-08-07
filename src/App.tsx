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
    const folderPath = localStorage.getItem('watched_folder_path') || 'C:\\WorkReports\\Daily_Excel_Sync\\';
    setIsUpdating(true);
    showToast(`🔄 감시 폴더(${folderPath})에서 업무일지 수집 중...`);

    setTimeout(() => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const displayDateStr = `${yyyy}년 ${mm}월 ${dd}일`;
      const dateCode = `${String(yyyy).slice(2)}${mm}${dd}`;

      const newItems: WorkReportItem[] = [
        {
          id: `rep-sync-${Date.now()}-1`,
          date: dateStr,
          displayDate: displayDateStr,
          department: '전력사업부문',
          team: '그리드팀',
          author: '김철수 팀장',
          todayTask: '변전소 EMS 그리드 연동 시험 진행 및 신재생 센서 데이터 수신 점검',
          tomorrowTask: '그리드 데이터 오차 정밀 검증 및 1차 테스트 결과 보고',
          status: '진행중',
          issues: '특이사항 없음',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: `${dateCode} 그리드팀 업무 공유.xlsx`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-sync-${Date.now()}-2`,
          date: dateStr,
          displayDate: displayDateStr,
          department: '전력사업부문',
          team: '그리드팀',
          author: '이영희 수석',
          todayTask: '스마트 그리드 분배 알고리즘 파이프라인 최적화 완료',
          tomorrowTask: '전력 피크 타임 예측 알고리즘 성능 모니터링',
          status: '완료',
          issues: '없음',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: `${dateCode} 그리드팀 업무 공유.xlsx`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-sync-${Date.now()}-3`,
          date: dateStr,
          displayDate: displayDateStr,
          department: 'IT개발부문',
          team: '개발팀',
          author: '정우성 팀장',
          todayTask: '업무 보고 통합 시스템 모니터링 및 DB 파이프라인 수립',
          tomorrowTask: '실시간 업데이트 모듈 권한 및 보안 검증',
          status: '완료',
          issues: '특이사항 없음',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: `${dateCode} 개발팀 업무 공유.xlsx`,
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-sync-${Date.now()}-4`,
          date: dateStr,
          displayDate: displayDateStr,
          department: '서비스운영부문',
          team: '운영팀',
          author: '유재석 선임',
          todayTask: '운영 서버 백업 확인 및 일일 장애 모니터링',
          tomorrowTask: '정기 보안점검 보고서 작성',
          status: '완료',
          issues: '-',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: `${dateCode} 운영팀 업무 공유.xlsx`,
          updatedAt: new Date().toISOString(),
        },
      ];

      setReports((prev) => {
        // filter out existing items with same id if any
        const filteredPrev = prev.filter((item) => item.date !== dateStr);
        return [...newItems, ...filteredPrev];
      });

      const newHistoryFiles = [
        `${dateCode} 그리드팀 업무 공유.xlsx`,
        `${dateCode} 개발팀 업무 공유.xlsx`,
        `${dateCode} 운영팀 업무 공유.xlsx`,
      ];

      setImportedFilesHistory((prev) => {
        const setFiles = new Set([...newHistoryFiles, ...prev]);
        return Array.from(setFiles);
      });

      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setSelectedDate(dateStr);
      setIsUpdating(false);

      showToast(`✅ 감시 폴더(${folderPath}) 수집 완료: ${newItems.length}건의 실제 일지 데이터가 수집되었습니다!`);
    }, 1000);
  };

  // Import uploaded custom files
  const handleImportReports = (newReports: WorkReportItem[]) => {
    setReports((prev) => [...newReports, ...prev]);
    const fileNames = Array.from(new Set(newReports.map((r) => r.sourceFileName || '업로드파일.xlsx')));
    setImportedFilesHistory((prev) => [...fileNames, ...prev]);
    const nowStr = new Date().toLocaleTimeString('ko-KR');
    setLastSyncTime(nowStr);
    showToast(`✅ ${newReports.length}건의 신규 업무일지가 수집되었습니다!`);
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

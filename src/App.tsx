import React, { useState, useMemo } from 'react';
import { WorkReportItem } from './types';
import { getInitialMockReports } from './utils/excelParser';
import { HeaderNavbar } from './components/HeaderNavbar';
import { DashboardView } from './components/DashboardView';
import { ReportTableView } from './components/ReportTableView';
import { SearchView } from './components/SearchView';
import { FileUploadView } from './components/FileUploadView';
import { AutoUpdateTimer } from './components/AutoUpdateTimer';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [reports, setReports] = useState<WorkReportItem[]>(getInitialMockReports());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'search' | 'upload'>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>('2026-08-03');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('방금 전 (18:00:00)');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [nextSyncTimeStr, setNextSyncTimeStr] = useState<string>('18:00:00 남음');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [importedFilesHistory, setImportedFilesHistory] = useState<string[]>([
    '260803 그리드팀 업무 공유.xlsx',
    '260803 개발팀 업무 공유.xlsx',
    '260803 운영팀 업무 공유.xlsx',
    '260804 그리드팀 업무 공유.xlsx',
    '260804 개발팀 업무 공유.xlsx',
    '260804 운영팀 업무 공유.xlsx',
  ]);

  // Unique list of dates
  const availableDates = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.date))).sort().reverse();
  }, [reports]);

  // Requirement 5 & 8: Manual & Auto Update Action
  const handleTriggerUpdate = () => {
    setIsUpdating(true);
    showToast('🔄 각 팀별 업무보고 폴더(C:\\WorkReports\\Daily) 스캔 중...');

    setTimeout(() => {
      // Simulate discovering a new file e.g., 260805 그리드팀 업무 공유.xlsx
      const newDate = '2026-08-05';
      const newDisplayDate = '2026년 08월 05일';

      const simulatedNewItems: WorkReportItem[] = [
        {
          id: `rep-auto-${Date.now()}-1`,
          date: newDate,
          displayDate: newDisplayDate,
          department: '전력사업부문',
          team: '그리드팀',
          author: '김철수 팀장',
          todayTask: '스마트 그리드 2차 변전소 테스트 배포 및 실시간 데이터 수신 검증',
          tomorrowTask: '전체 변전소 그리드 네트워크 모니터링 및 2차 피드백 수집',
          status: '완료',
          issues: '특이사항 없음 (통신 오차 0.1% 미만 유지)',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: '260805 그리드팀 업무 공유.xlsx',
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-auto-${Date.now()}-2`,
          date: newDate,
          displayDate: newDisplayDate,
          department: '전력사업부문',
          team: '그리드팀',
          author: '이영희 수석',
          todayTask: '전력 피크 타임 예측 AI 모델 튜닝 완료',
          tomorrowTask: '실시간 피크 예측 경보 알림 연동 테스트',
          status: '진행중',
          issues: '없음',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: '260805 그리드팀 업무 공유.xlsx',
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-auto-${Date.now()}-3`,
          date: newDate,
          displayDate: newDisplayDate,
          department: 'IT개발부문',
          team: '개발팀',
          author: '정우성 팀장',
          todayTask: '18시 자동 동기화 엔진 및 엑셀 다운로드 최적화 패치',
          tomorrowTask: '부서별 보안 권한 파이프라인 수립',
          status: '완료',
          issues: '특이사항 없음',
          isVacationToday: false,
          isVacationTomorrow: false,
          sourceFileName: '260805 개발팀 업무 공유.xlsx',
          updatedAt: new Date().toISOString(),
        },
        {
          id: `rep-auto-${Date.now()}-4`,
          date: newDate,
          displayDate: newDisplayDate,
          department: '서비스운영부문',
          team: '운영팀',
          author: '유재석 선임',
          todayTask: '금일 연차 휴가',
          tomorrowTask: '운영 서버 정기 백업 확인',
          status: '완료',
          issues: '-',
          isVacationToday: true,
          vacationTypeToday: '연차',
          isVacationTomorrow: false,
          sourceFileName: '260805 운영팀 업무 공유.xlsx',
          updatedAt: new Date().toISOString(),
        },
      ];

      setReports((prev) => [...simulatedNewItems, ...prev]);
      setImportedFilesHistory((prev) => [
        '260805 그리드팀 업무 공유.xlsx',
        '260805 개발팀 업무 공유.xlsx',
        '260805 운영팀 업무 공유.xlsx',
        ...prev,
      ]);

      const nowStr = new Date().toLocaleTimeString('ko-KR');
      setLastSyncTime(nowStr);
      setSelectedDate(newDate);
      setIsUpdating(false);

      showToast(`✅ 260805 일자 신규 업무보고 4건이 자동 수집/업데이트 되었습니다!`);
    }, 1200);
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

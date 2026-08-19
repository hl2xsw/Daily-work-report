import React, { useMemo } from 'react';
import { WorkReportItem, TeamStats } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Users,
  Palmtree,
  Calendar,
  Building2,
  ShieldAlert,
  TrendingUp,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

interface DashboardViewProps {
  reports: WorkReportItem[];
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  availableDates: string[];
  onLoadSampleData?: () => void;
  onGoToUpload?: () => void;
  onTriggerUpdate?: () => void;
  isUpdating?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  selectedDate,
  setSelectedDate,
  availableDates,
  onLoadSampleData,
  onGoToUpload,
  onTriggerUpdate,
  isUpdating = false,
}) => {
  // Filter reports for selected date
  const dateReports = useMemo(() => {
    if (!selectedDate) return reports;
    const filtered = reports.filter((r) => r.date === selectedDate);
    if (filtered.length === 0 && reports.length > 0) {
      return reports;
    }
    return filtered;
  }, [reports, selectedDate]);

  // Overall statistics
  const overallStats = useMemo(() => {
    const total = dateReports.length;
    const completed = dateReports.filter((r) => r.status === '완료').length;
    const inProgress = dateReports.filter((r) => r.status === '진행중').length;
    const delayed = dateReports.filter((r) => r.status === '지연' || r.status === '대기').length;
    const issues = dateReports.filter(
      (r) => r.issues && r.issues !== '-' && r.issues !== '없음' && r.issues !== '특이사항 없음'
    ).length;

    const todayVacation = dateReports.filter((r) => r.isVacationToday).length;
    const tomorrowVacation = dateReports.filter((r) => r.isVacationTomorrow).length;

    return { total, completed, inProgress, delayed, issues, todayVacation, tomorrowVacation };
  }, [dateReports]);

  // Per Team statistics
  const teamStatsMap = useMemo(() => {
    const stats: Record<string, TeamStats> = {};

    dateReports.forEach((item) => {
      const team = item.team || '미지정팀';
      if (!stats[team]) {
        stats[team] = {
          team,
          totalTasks: 0,
          completedTasks: 0,
          inProgressTasks: 0,
          delayedTasks: 0,
          issueCount: 0,
          todayVacationers: 0,
          tomorrowVacationers: 0,
        };
      }

      stats[team].totalTasks += 1;
      if (item.status === '완료') stats[team].completedTasks += 1;
      else if (item.status === '진행중') stats[team].inProgressTasks += 1;
      else stats[team].delayedTasks += 1;

      if (item.issues && item.issues !== '-' && item.issues !== '없음' && item.issues !== '특이사항 없음') {
        stats[team].issueCount += 1;
      }
      if (item.isVacationToday) stats[team].todayVacationers += 1;
      if (item.isVacationTomorrow) stats[team].tomorrowVacationers += 1;
    });

    return Object.values(stats);
  }, [dateReports]);

  // Vacation Details grouped by Department & Team
  const todayVacationDetails = useMemo(() => {
    const grouped: Record<string, Record<string, Array<{ name: string; type: string }>>> = {};
    let totalCount = 0;

    dateReports.forEach((r) => {
      if (r.isVacationToday) {
        totalCount++;
        const dept = r.department || '사업부문';
        const team = r.team || '팀';
        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept][team]) grouped[dept][team] = [];
        grouped[dept][team].push({
          name: r.author,
          type: r.vacationTypeToday || '연차',
        });
      }
    });

    return { grouped, totalCount };
  }, [dateReports]);

  const tomorrowVacationDetails = useMemo(() => {
    const grouped: Record<string, Record<string, Array<{ name: string; type: string }>>> = {};
    let totalCount = 0;

    dateReports.forEach((r) => {
      if (r.isVacationTomorrow) {
        totalCount++;
        const dept = r.department || '사업부문';
        const team = r.team || '팀';
        if (!grouped[dept]) grouped[dept] = {};
        if (!grouped[dept][team]) grouped[dept][team] = [];
        grouped[dept][team].push({
          name: r.author,
          type: r.vacationTypeTomorrow || '연차',
        });
      }
    });

    return { grouped, totalCount };
  }, [dateReports]);

  // Data for Charts
  const chartData = useMemo(() => {
    if (!teamStatsMap || teamStatsMap.length === 0) {
      return [
        { team: '그리드팀', 완료: 0, 진행중: 0, 지연대기: 0, 이슈: 0 },
        { team: '개발팀', 완료: 0, 진행중: 0, 지연대기: 0, 이슈: 0 },
        { team: '운영팀', 완료: 0, 진행중: 0, 지연대기: 0, 이슈: 0 },
      ];
    }
    return teamStatsMap.map((s) => ({
      team: s.team,
      완료: s.completedTasks,
      진행중: s.inProgressTasks,
      지연대기: s.delayedTasks,
      이슈: s.issueCount,
    }));
  }, [teamStatsMap]);

  const pieData = useMemo(() => {
    const total = overallStats.completed + overallStats.inProgress + overallStats.delayed;
    if (total === 0) {
      return [{ name: '대기', value: 1, color: '#cbd5e1' }];
    }
    return [
      { name: '완료', value: overallStats.completed, color: '#10b981' },
      { name: '진행중', value: overallStats.inProgress, color: '#0284c7' },
      { name: '지연/대기', value: overallStats.delayed, color: '#f59e0b' },
    ].filter((item) => item.value > 0);
  }, [overallStats]);

  return (
    <div className="space-y-6 pb-12">
      {reports.length === 0 && (
        <div className="bg-slate-900 text-white border border-slate-700/80 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-blue-600/30 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>등록된 업무보고 데이터가 없습니다</span>
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                엑셀 파일(.xlsx)을 업로드하거나 감시 폴더를 설정하여 팀별 일일 업무 보고서를 수집하세요.<br className="hidden sm:inline" />
                또는 [📊 샘플 데이터 채우기]로 시스템을 즉시 테스트해볼 수 있습니다.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onLoadSampleData && (
              <button
                onClick={onLoadSampleData}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white text-xs font-semibold rounded-lg transition-all cursor-pointer"
              >
                📊 샘플 데이터 채우기
              </button>
            )}
            {onGoToUpload && (
              <button
                onClick={onGoToUpload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                📂 엑셀 파일 관리 및 폴더 지정
              </button>
            )}
          </div>
        </div>
      )}

      {/* Date Bar Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Calendar className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-800">대시보드 일자 선택</h2>
          <span className="text-xs text-slate-500 hidden md:inline">
            (선택된 날짜의 팀별 진행 건수, 이슈 및 휴가자 통합 표시)
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2">
            <label className="text-xs font-semibold text-slate-600">기준 일자:</label>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="">전체 일자 통합</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} 일지
                </option>
              ))}
            </select>
          </div>

          {onTriggerUpdate && (
            <button
              onClick={onTriggerUpdate}
              disabled={isUpdating}
              title="서버에서 최신 업무보고 데이터 불러오기"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">서버 데이터 새로고침</span>
              <span className="sm:hidden">새로고침</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Tasks */}
        <div className="bg-white rounded-r-xl rounded-l-md shadow-xs border border-slate-200/80 border-l-4 border-l-slate-700 p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">총 보고된 업무</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{overallStats.total}건</p>
            <p className="text-[11px] text-slate-400 mt-1">
              팀원 수집 완료 ({teamStatsMap.length}개 팀)
            </p>
          </div>
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
            <FileCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-r-xl rounded-l-md shadow-xs border border-slate-200/80 border-l-4 border-l-emerald-500 p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-emerald-700 uppercase">업무 처리 완료</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{overallStats.completed}건</p>
            <p className="text-[11px] text-emerald-700/70 mt-1">
              달성률 {overallStats.total ? Math.round((overallStats.completed / overallStats.total) * 100) : 0}%
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white rounded-r-xl rounded-l-md shadow-xs border border-slate-200/80 border-l-4 border-l-blue-500 p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-blue-700 uppercase">진행 중 업무</p>
            <p className="text-2xl font-black text-blue-600 mt-1">{overallStats.inProgress}건</p>
            <p className="text-[11px] text-blue-700/70 mt-1">실시간 모니터링</p>
          </div>
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white rounded-r-xl rounded-l-md shadow-xs border border-slate-200/80 border-l-4 border-l-amber-500 p-4 flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-amber-700 uppercase">이슈/지연 사항</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{overallStats.issues}건</p>
            <p className="text-[11px] text-amber-700/70 mt-1">조치 및 모니터링 필요</p>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Vacation Summary */}
        <div className="bg-white rounded-r-xl rounded-l-md shadow-xs border border-slate-200/80 border-l-4 border-l-purple-500 p-4 flex items-center justify-between sm:col-span-2 lg:col-span-1 hover:shadow-md transition-all">
          <div>
            <p className="text-[11px] font-bold tracking-wider text-purple-700 uppercase">금일/익일 휴가자</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-lg font-bold text-purple-700">금일 {overallStats.todayVacation}명</span>
              <span className="text-slate-300">/</span>
              <span className="text-sm font-semibold text-purple-600">익일 {overallStats.tomorrowVacation}명</span>
            </div>
            <p className="text-[11px] text-purple-700/70 mt-1">부문 및 팀별 파악 완료</p>
          </div>
          <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
            <Palmtree className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Requirement 7: Vacation Status (금일 및 익일 휴가자 부문/팀별 상세) */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-slate-100 rounded-xl shadow-md border border-slate-800 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <Palmtree className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">금일 및 익일 휴가자 현황</h3>
              <p className="text-xs text-slate-400">
                부문 및 팀별 휴가 일정 파악 (업무 공백 방지 및 대행 지정 지원)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="px-2.5 py-1 bg-purple-900/40 text-purple-300 border border-purple-700/50 rounded-full font-medium">
              금일 총 {todayVacationDetails.totalCount}명
            </span>
            <span className="px-2.5 py-1 bg-indigo-900/40 text-indigo-300 border border-indigo-700/50 rounded-full font-medium">
              익일 총 {tomorrowVacationDetails.totalCount}명
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Today's Vacationers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                <span className="text-sm font-bold text-purple-300">금일 휴가자 명단</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {selectedDate ? `${selectedDate}` : '최신 데이터'}
              </span>
            </div>

            {todayVacationDetails.totalCount === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                금일 휴가자가 없습니다. (모든 담당자 정상 근무)
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(todayVacationDetails.grouped).map(([dept, teams]) => (
                  <div key={dept} className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/60">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>[{dept}]</span>
                    </div>

                    <div className="space-y-2 pl-2">
                      {Object.entries(teams).map(([team, members]) => (
                        <div key={team} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                            {team}
                          </span>
                          {members.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1.5 bg-purple-950 border border-purple-800/60 px-2.5 py-1 rounded-md text-purple-200 font-medium"
                            >
                              <span>{m.name}</span>
                              <span className="text-[10px] text-purple-300 bg-purple-900/80 px-1 rounded">
                                {m.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tomorrow's Vacationers */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
                <span className="text-sm font-bold text-indigo-300">익일 휴가 예약자 명단</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">사전 업무 공유 대상</span>
            </div>

            {tomorrowVacationDetails.totalCount === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                익일 예정된 휴가자가 없습니다.
              </p>
            ) : (
              <div className="space-y-3">
                {Object.entries(tomorrowVacationDetails.grouped).map(([dept, teams]) => (
                  <div key={dept} className="bg-slate-950/60 rounded-lg p-3 border border-slate-800/60">
                    <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300 mb-2">
                      <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>[{dept}]</span>
                    </div>

                    <div className="space-y-2 pl-2">
                      {Object.entries(teams).map(([team, members]) => (
                        <div key={team} className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-medium text-slate-400 text-[11px] bg-slate-800 px-2 py-0.5 rounded">
                            {team}
                          </span>
                          {members.map((m, idx) => (
                            <span
                              key={idx}
                              className="inline-flex items-center space-x-1.5 bg-indigo-950 border border-indigo-800/60 px-2.5 py-1 rounded-md text-indigo-200 font-medium"
                            >
                              <span>{m.name}</span>
                              <span className="text-[10px] text-indigo-300 bg-indigo-900/80 px-1 rounded">
                                {m.type}
                              </span>
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Requirement 6: Dashboard Charts & Team Work Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Team Progress Status */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                팀별 업무 진행 및 결과 건수 차트
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                각 팀별 진행, 완료, 지연 및 이슈 발생 건수 비교
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="team" tick={{ fontSize: 12, fill: '#475569' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#475569' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#f8fafc',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="완료" fill="#10b981" radius={[4, 4, 0, 0]} name="완료" />
                <Bar dataKey="진행중" fill="#0284c7" radius={[4, 4, 0, 0]} name="진행중" />
                <Bar dataKey="지연대기" fill="#f59e0b" radius={[4, 4, 0, 0]} name="지연/대기" />
                <Bar dataKey="이슈" fill="#ef4444" radius={[4, 4, 0, 0]} name="이슈사항" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">전체 업무 처리 비율</h3>
            <p className="text-xs text-slate-500 mt-0.5">완료 / 진행 / 지연 비율 구조</p>
          </div>

          <div className="h-48 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="block text-emerald-700 font-medium">완료</span>
              <span className="font-bold text-emerald-800 text-sm">{overallStats.completed}건</span>
            </div>
            <div className="p-2 bg-sky-50 rounded-lg">
              <span className="block text-sky-700 font-medium">진행중</span>
              <span className="font-bold text-sky-800 text-sm">{overallStats.inProgress}건</span>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="block text-amber-700 font-medium">지연/대기</span>
              <span className="font-bold text-amber-800 text-sm">{overallStats.delayed}건</span>
            </div>
          </div>
        </div>
      </div>

      {/* Team Cards Breakdown Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-slate-600" />
          팀별 상세 업무 실적 및 이슈 요약
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {teamStatsMap.map((t) => (
            <div
              key={t.team}
              className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:border-emerald-500 transition shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                <span className="text-sm font-bold text-slate-900">{t.team}</span>
                <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-md">
                  총 {t.totalTasks}건 담당
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>완료된 업무:</span>
                  <span className="font-bold text-emerald-600">{t.completedTasks}건</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>진행 중인 업무:</span>
                  <span className="font-bold text-sky-600">{t.inProgressTasks}건</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>지연 및 대기:</span>
                  <span className="font-bold text-amber-600">{t.delayedTasks}건</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>특이 이슈사항:</span>
                  <span className={`font-bold ${t.issueCount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                    {t.issueCount}건
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-slate-600">
                  <span>금일 / 익일 휴가:</span>
                  <span className="font-semibold text-purple-600">
                    {t.todayVacationers}명 / {t.tomorrowVacationers}명
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

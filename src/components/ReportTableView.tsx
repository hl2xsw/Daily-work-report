import React, { useState, useMemo } from 'react';
import { WorkReportItem } from '../types';
import { exportReportsToExcel } from '../utils/excelParser';
import {
  Download,
  Calendar,
  Filter,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Palmtree,
  FileSpreadsheet,
  Building,
} from 'lucide-react';

interface ReportTableViewProps {
  reports: WorkReportItem[];
}

export const ReportTableView: React.FC<ReportTableViewProps> = ({ reports }) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [onlyVacation, setOnlyVacation] = useState<boolean>(false);

  // Available unique dates
  const availableDates = useMemo(() => {
    const dates = Array.from(new Set(reports.map((r) => r.date))).sort().reverse();
    return dates;
  }, [reports]);

  // Unique teams
  const availableTeams = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.team)));
  }, [reports]);

  // Filter logic
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (selectedDate && r.date !== selectedDate) return false;
      if (selectedTeam !== 'all' && r.team !== selectedTeam) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (onlyVacation && !r.isVacationToday && !r.isVacationTomorrow) return false;
      return true;
    });
  }, [reports, selectedDate, selectedTeam, selectedStatus, onlyVacation]);

  // Group by Date for clear structure
  const groupedByDate = useMemo(() => {
    const map: Record<string, WorkReportItem[]> = {};
    filteredReports.forEach((r) => {
      const key = r.date;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredReports]);

  // Handle Download for selected date or filter
  const handleDownloadDateRange = () => {
    if (filteredReports.length === 0) {
      alert('다운로드할 업무 보고 데이터가 없습니다.');
      return;
    }
    const label = selectedDate ? `${selectedDate}_업무보고` : '지정날짜_통합업무보고';
    exportReportsToExcel(filteredReports, label);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Filter & Download Bar (Requirement 9) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Selector */}
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-700">날짜 지정:</span>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">전체 날짜 전체보기</option>
              {availableDates.map((d) => (
                <option key={d} value={d}>
                  {d} (일지)
                </option>
              ))}
            </select>
          </div>

          {/* Team Selector */}
          <div className="flex items-center space-x-2">
            <Building className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">팀 구분:</span>
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">모든 팀</option>
              {availableTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">상태:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-slate-50 border border-slate-300 text-slate-800 text-xs font-semibold rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="완료">완료</option>
              <option value="진행중">진행중</option>
              <option value="지연">지연/대기</option>
            </select>
          </div>

          {/* Only Vacation Checkbox */}
          <label className="flex items-center space-x-1.5 text-xs text-purple-700 font-semibold bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 cursor-pointer">
            <input
              type="checkbox"
              checked={onlyVacation}
              onChange={(e) => setOnlyVacation(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span>휴가자만 표시</span>
          </label>
        </div>

        {/* Date Download Button (Requirement 9) */}
        <button
          onClick={handleDownloadDateRange}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-all"
        >
          <Download className="w-4 h-4" />
          <span>지정 날짜 업무보고 다운로드 (.xlsx)</span>
        </button>
      </div>

      {/* Summary count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <span>
          조회 조건 결과: <strong className="text-slate-900 font-bold">{filteredReports.length}건</strong>의 업무일지
        </span>
        {selectedDate && (
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
            선택된 일자: {selectedDate}
          </span>
        )}
      </div>

      {/* Grouped Reports List */}
      {groupedByDate.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <FileSpreadsheet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-semibold text-slate-700">조회된 업무 보고 데이터가 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">상단의 필터를 변경하거나 새로운 엑셀 파일을 업로드해 주세요.</p>
        </div>
      ) : (
        groupedByDate.map(([dateKey, items]) => (
          <div key={dateKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Group Header */}
            <div className="bg-slate-900 text-slate-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">{dateKey} 업무 일지 보고</h3>
                <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono">
                  총 {items.length}건
                </span>
              </div>

              <button
                onClick={() => exportReportsToExcel(items, `${dateKey}_팀별업무보고`)}
                className="flex items-center space-x-1.5 text-xs text-emerald-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded-md transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>이 날짜 엑셀 저장</span>
              </button>
            </div>

            {/* Table (Requirement 3: 날짜별, 담당자, 금일업무, 익일업무 한눈에 보기) */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold">
                    <th className="py-3 px-2.5 w-20">팀명</th>
                    <th className="py-3 px-2.5 w-20">담당자</th>
                    <th className="py-3 px-2.5 w-[21%]">금일 업무</th>
                    <th className="py-3 px-2.5 w-[21%]">업무 결과</th>
                    <th className="py-3 px-2.5 w-[21%]">익일 업무</th>
                    <th className="py-3 px-2.5 w-[21%]">이슈사항</th>
                    <th className="py-3 px-2.5 w-20">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      {/* Team */}
                      <td className="py-3 px-2.5 font-bold text-emerald-700 whitespace-nowrap">
                        {item.team}
                      </td>

                      {/* Author */}
                      <td className="py-3 px-2.5 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.author}</span>
                        </div>
                      </td>

                      {/* Today Task */}
                      <td className="py-3 px-2.5 text-slate-800 leading-relaxed font-normal">
                        <p className="whitespace-pre-line">{item.todayTask}</p>
                      </td>

                      {/* Task Result & Status */}
                      <td className="py-3 px-2.5 text-slate-800 leading-relaxed font-normal bg-sky-50/30">
                        <div className="mb-1">
                          {item.status === '완료' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>완료</span>
                            </span>
                          )}
                          {item.status === '진행중' && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-sky-100 text-sky-800 font-bold rounded-full text-[10px]">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>진행중</span>
                            </span>
                          )}
                          {(item.status === '지연' || item.status === '대기') && (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                              <AlertCircle className="w-3 h-3 text-amber-600" />
                              <span>지연/대기</span>
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-line text-xs font-medium text-slate-700">{item.taskResult || '-'}</p>
                      </td>

                      {/* Tomorrow Task */}
                      <td className="py-3 px-2.5 text-slate-700 leading-relaxed font-normal bg-slate-50/50">
                        <p className="whitespace-pre-line">{item.tomorrowTask}</p>
                      </td>

                      {/* Issues */}
                      <td className="py-3 px-2.5">
                        {item.issues && item.issues !== '-' && item.issues !== '없음' && item.issues !== '특이사항 없음' ? (
                          <div className="bg-red-50 text-red-700 border border-red-200 p-2 rounded-lg text-[11px] font-medium leading-tight whitespace-pre-line">
                            ⚠️ {item.issues}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Remarks & Vacation Tag */}
                      <td className="py-3 px-2.5">
                        {item.remarks && item.remarks !== '-' && (
                          <p className="text-xs text-slate-700 mb-1 whitespace-pre-line">{item.remarks}</p>
                        )}
                        {item.isVacationToday && (
                          <span className="inline-block mb-1 mr-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-semibold text-[10px]">
                            금일: {item.vacationTypeToday || '연차'}
                          </span>
                        )}
                        {item.isVacationTomorrow && (
                          <span className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded font-semibold text-[10px]">
                            익일: {item.vacationTypeTomorrow || '연차'}
                          </span>
                        )}
                        {!item.isVacationToday && !item.isVacationTomorrow && (!item.remarks || item.remarks === '-') && (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

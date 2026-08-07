import React, { useState, useMemo } from 'react';
import { WorkReportItem, FilterState } from '../types';
import { exportReportsToExcel } from '../utils/excelParser';
import {
  Search,
  Download,
  Filter,
  X,
  FileSpreadsheet,
  User,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface SearchViewProps {
  reports: WorkReportItem[];
}

export const SearchView: React.FC<SearchViewProps> = ({ reports }) => {
  const [filter, setFilter] = useState<FilterState>({
    searchQuery: '',
    selectedTeam: 'all',
    selectedStatus: 'all',
    startDate: '',
    endDate: '',
    onlyVacation: false,
    onlyIssues: false,
  });

  const availableTeams = useMemo(() => {
    return Array.from(new Set(reports.map((r) => r.team)));
  }, [reports]);

  // Execute Search & Filters
  const searchResults = useMemo(() => {
    const q = filter.searchQuery.trim().toLowerCase();

    return reports.filter((r) => {
      // Date Range Filter
      if (filter.startDate && r.date < filter.startDate) return false;
      if (filter.endDate && r.date > filter.endDate) return false;

      // Team Filter
      if (filter.selectedTeam !== 'all' && r.team !== filter.selectedTeam) return false;

      // Status Filter
      if (filter.selectedStatus !== 'all' && r.status !== filter.selectedStatus) return false;

      // Vacation Filter
      if (filter.onlyVacation && !r.isVacationToday && !r.isVacationTomorrow) return false;

      // Issues Filter
      if (
        filter.onlyIssues &&
        (!r.issues || r.issues === '-' || r.issues === '없음' || r.issues === '특이사항 없음')
      )
        return false;

      // Text Query Match
      if (q) {
        const textToSearch = `${r.author} ${r.team} ${r.department} ${r.todayTask} ${r.taskResult || ''} ${r.tomorrowTask} ${r.issues} ${r.remarks || ''} ${r.date}`.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [reports, filter]);

  const handleExportSearch = () => {
    if (searchResults.length === 0) {
      alert('엑셀로 내보낼 검색 결과가 없습니다.');
      return;
    }
    const suffix = filter.searchQuery ? `검색_${filter.searchQuery}` : '검색결과통합';
    exportReportsToExcel(searchResults, `일일업무보고_${suffix}`);
  };

  const handleResetFilters = () => {
    setFilter({
      searchQuery: '',
      selectedTeam: 'all',
      selectedStatus: 'all',
      startDate: '',
      endDate: '',
      onlyVacation: false,
      onlyIssues: false,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Search Controls Bar (Requirement 10) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900">업무 보고 상세 검색 및 엑셀 내보내기</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
            >
              필터 초기화
            </button>
            {/* Requirement 10: 검색 결과 엑셀 내보내기 */}
            <button
              onClick={handleExportSearch}
              disabled={searchResults.length === 0}
              className={`flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-lg text-white shadow-xs transition-all ${
                searchResults.length === 0
                  ? 'bg-slate-300 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700 shadow-blue-500/20'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>검색 결과 엑셀 다운로드 ({searchResults.length}건)</span>
            </button>
          </div>
        </div>

        {/* Search Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Text Query */}
          <div className="lg:col-span-2 relative">
            <label className="block text-xs font-bold text-slate-600 mb-1">통합 키워드 검색</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="담당자, 팀명, 금일/익일 업무내용, 이슈사항 검색..."
                value={filter.searchQuery}
                onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
                className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              {filter.searchQuery && (
                <button
                  onClick={() => setFilter({ ...filter, searchQuery: '' })}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Team Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">팀 선택</label>
            <select
              value={filter.selectedTeam}
              onChange={(e) => setFilter({ ...filter, selectedTeam: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">전체 팀 보기</option>
              {availableTeams.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">진행 상태</label>
            <select
              value={filter.selectedStatus}
              onChange={(e) => setFilter({ ...filter, selectedStatus: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">전체 상태</option>
              <option value="완료">완료</option>
              <option value="진행중">진행중</option>
              <option value="지연">지연 / 대기</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">시작 일자</label>
            <input
              type="date"
              value={filter.startDate}
              onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">종료 일자</label>
            <input
              type="date"
              value={filter.endDate}
              onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center space-x-4 pt-4 sm:col-span-2">
            <label className="flex items-center space-x-1.5 text-xs text-amber-800 font-semibold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.onlyIssues}
                onChange={(e) => setFilter({ ...filter, onlyIssues: e.target.checked })}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              <span>⚠️ 이슈 발생 항목만 필터</span>
            </label>

            <label className="flex items-center space-x-1.5 text-xs text-purple-800 font-semibold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 cursor-pointer">
              <input
                type="checkbox"
                checked={filter.onlyVacation}
                onChange={(e) => setFilter({ ...filter, onlyVacation: e.target.checked })}
                className="rounded text-purple-600 focus:ring-purple-500"
              />
              <span>🌴 휴가 관련 건만 필터</span>
            </label>
          </div>
        </div>
      </div>

      {/* Search Results Summary */}
      <div className="flex items-center justify-between text-xs text-slate-600 px-1">
        <div>
          검색 매칭 결과: <strong className="text-emerald-700 font-bold">{searchResults.length}건</strong> / 전체 {reports.length}건
        </div>
        {filter.searchQuery && (
          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-300">
            키워드: "{filter.searchQuery}"
          </span>
        )}
      </div>

      {/* Results Table */}
      {searchResults.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
          <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
          <p className="text-sm font-semibold text-slate-700">검색 조건에 일치하는 업무보고가 없습니다.</p>
          <p className="text-xs text-slate-400 mt-1">검색어나 날짜 범위를 조정해 보세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-slate-200 font-semibold">
                  <th className="py-3 px-2.5 w-20">날짜</th>
                  <th className="py-3 px-2.5 w-20">팀명</th>
                  <th className="py-3 px-2.5 w-20">담당자</th>
                  <th className="py-3 px-2.5 w-[20%]">금일 업무</th>
                  <th className="py-3 px-2.5 w-[20%]">업무 결과</th>
                  <th className="py-3 px-2.5 w-[20%]">익일 업무</th>
                  <th className="py-3 px-2.5 w-[20%]">이슈사항</th>
                  <th className="py-3 px-2.5 w-20">비고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {searchResults.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-2.5 font-mono font-medium text-slate-600 text-[11px] whitespace-nowrap">
                      {item.date}
                    </td>
                    <td className="py-3 px-2.5 font-bold text-emerald-700 whitespace-nowrap">
                      {item.team}
                    </td>
                    <td className="py-3 px-2.5 font-semibold text-slate-800 whitespace-nowrap">{item.author}</td>
                    <td className="py-3 px-2.5 leading-relaxed">{item.todayTask}</td>
                    <td className="py-3 px-2.5 leading-relaxed bg-sky-50/20">
                      <span className="block font-semibold text-sky-800 text-[10px] mb-0.5">상태: {item.status}</span>
                      {item.taskResult || '-'}
                    </td>
                    <td className="py-3 px-2.5 leading-relaxed bg-slate-50/50">{item.tomorrowTask}</td>
                    <td className="py-3 px-2.5 text-[11px]">
                      {item.issues && item.issues !== '-' && item.issues !== '없음' && item.issues !== '특이사항 없음' ? (
                        <span className="text-red-600 font-medium">⚠️ {item.issues}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-2.5 text-[11px] text-slate-600">
                      {item.remarks || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

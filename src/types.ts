export type WorkStatus = '완료' | '진행중' | '지연' | '대기';

export interface WorkReportItem {
  id: string;
  date: string; // YYYY-MM-DD format (e.g. 2026-08-03)
  displayDate: string; // e.g. 2026년 08월 03일
  department: string; // 부문 (e.g. 전력사업부문, IT개발부문, 서비스운영부문)
  team: string; // 팀명 (e.g. 그리드팀, 개발팀, 운영팀)
  author: string; // 담당자 (e.g. 김철수)
  todayTask: string; // 금일 업무
  tomorrowTask: string; // 익일 업무
  status: WorkStatus; // 업무 상태
  issues: string; // 이슈사항 및 조치계획
  isVacationToday?: boolean; // 금일 휴가 여부
  isVacationTomorrow?: boolean; // 익일 휴가 여부
  vacationTypeToday?: string; // 연차, 반차, 병가 등
  vacationTypeTomorrow?: string; // 연차, 반차, 병가 등
  sourceFileName?: string; // e.g. 260803 그리드팀 업무 공유.xlsx
  updatedAt: string; // ISO string
}

export interface VacationInfo {
  department: string;
  team: string;
  name: string;
  type: string; // 연차, 반차, 병가 등
  date: string;
  isToday: boolean;
}

export interface TeamStats {
  team: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  delayedTasks: number;
  issueCount: number;
  todayVacationers: number;
  tomorrowVacationers: number;
}

export interface FilterState {
  searchQuery: string;
  selectedTeam: string;
  selectedStatus: string;
  startDate: string;
  endDate: string;
  onlyVacation: boolean;
  onlyIssues: boolean;
}

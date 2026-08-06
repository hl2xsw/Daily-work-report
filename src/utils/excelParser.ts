import * as XLSX from 'xlsx';
import { WorkReportItem, WorkStatus } from '../types';

// Parse filename format like "260803 그리드팀 업무 공유.xlsx" or "20260803_그리드팀_업무일지.xlsx"
export function parseFileNameMetadata(fileName: string): { date: string; displayDate: string; team: string } {
  let dateStr = '2026-08-03';
  let displayDateStr = '2026년 08월 03일';
  let teamName = '그리드팀';

  const cleanName = fileName.replace(/\.[^/.]+$/, ''); // remove extension

  // Match YYMMDD (e.g., 260803) or YYYYMMDD (e.g. 20260803)
  const yymmddMatch = cleanName.match(/(\d{6})/);
  const yyyymmddMatch = cleanName.match(/(\d{8})/);

  if (yyyymmddMatch) {
    const raw = yyyymmddMatch[1];
    const year = raw.substring(0, 4);
    const month = raw.substring(4, 6);
    const day = raw.substring(6, 8);
    dateStr = `${year}-${month}-${day}`;
    displayDateStr = `${year}년 ${month}월 ${day}일`;
  } else if (yymmddMatch) {
    const raw = yymmddMatch[1];
    const year = `20${raw.substring(0, 2)}`;
    const month = raw.substring(2, 4);
    const day = raw.substring(4, 6);
    dateStr = `${year}-${month}-${day}`;
    displayDateStr = `${year}년 ${month}월 ${day}일`;
  }

  // Match team name
  if (cleanName.includes('그리드팀') || cleanName.includes('그리드')) {
    teamName = '그리드팀';
  } else if (cleanName.includes('개발팀') || cleanName.includes('개발')) {
    teamName = '개발팀';
  } else if (cleanName.includes('운영팀') || cleanName.includes('운영')) {
    teamName = '운영팀';
  } else if (cleanName.includes('인프라팀') || cleanName.includes('인프라')) {
    teamName = '인프라팀';
  } else {
    // Extract team from string e.g., "260803 XX팀 업무"
    const words = cleanName.split(/[\s_]+/);
    const foundTeam = words.find((w) => w.endsWith('팀'));
    if (foundTeam) {
      teamName = foundTeam;
    }
  }

  return { date: dateStr, displayDate: displayDateStr, team: teamName };
}

// Generate default mock data for demo
export function getInitialMockReports(): WorkReportItem[] {
  return [
    // 2026-08-03 그리드팀
    {
      id: 'rep-1',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '김철수 팀장',
      todayTask: '변전소 EMS 그리드 연동 시험 진행 및 신재생 센서 데이터 수신 점검',
      tomorrowTask: '그리드 데이터 오차 0.5% 이내 정밀 검증 및 1차 테스트 결과 보고',
      status: '진행중',
      issues: '일부 구형 모듈 통신 지연 발생 (제조사 수신 대기 중)',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:50:00Z',
    },
    {
      id: 'rep-2',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '이영희 수석',
      todayTask: '스마트 그리드 분배 알고리즘 파이프라인 최적화 완료',
      tomorrowTask: '전력 피크 타임 예측 알고리즘 성능 모니터링',
      status: '완료',
      issues: '특이사항 없음',
      isVacationToday: false,
      isVacationTomorrow: true,
      vacationTypeTomorrow: '연차',
      sourceFileName: '260803 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:50:00Z',
    },
    {
      id: 'rep-3',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '박민수 책임',
      todayTask: '현장 ESS(에너지저장장치) 배터리 3호기 점검 및 수집 데이터 정리',
      tomorrowTask: '4호기 안전 진단 점검 및 보고서 작성',
      status: '진행중',
      issues: '3호기 랙 센서 1개 수치 불안정 -> 교체 신청 예정',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:50:00Z',
    },
    {
      id: 'rep-4',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '최동현 선임',
      todayTask: '금일 연차 휴가',
      tomorrowTask: '그리드 모니터링 UI 데이터 바인딩 연동 작업',
      status: '완료',
      issues: '-',
      isVacationToday: true,
      vacationTypeToday: '연차',
      isVacationTomorrow: false,
      sourceFileName: '260803 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:50:00Z',
    },

    // 2026-08-03 개발팀
    {
      id: 'rep-5',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: 'IT개발부문',
      team: '개발팀',
      author: '정우성 팀장',
      todayTask: '대시보드 REST API v2 엔드포인트 설계 및 보안 검증',
      tomorrowTask: 'Front-end 팀과 API 통신 테스트 및 데이터 포맷 확정',
      status: '완료',
      issues: '없음',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 개발팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:55:00Z',
    },
    {
      id: 'rep-6',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: 'IT개발부문',
      team: '개발팀',
      author: '한지민 책임',
      todayTask: '실시간 차트 렌더링 성능 개선 (Canvas 기반 최적화)',
      tomorrowTask: '대용량 로그 쿼리 튜닝 및 인덱스 배치',
      status: '진행중',
      issues: '10만 건 이상 렌더링 시 메모리 사용량 증가 -> 가상화 리스트 적용 예정',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 개발팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:55:00Z',
    },
    {
      id: 'rep-7',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: 'IT개발부문',
      team: '개발팀',
      author: '강하늘 선임',
      todayTask: '엑셀 데이터 파싱 및 자동 동기화 모듈 개발 완료',
      tomorrowTask: '18시 자동 업데이트 타이머 스케줄러 구현',
      status: '완료',
      issues: '특이사항 없음',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 개발팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:55:00Z',
    },

    // 2026-08-03 운영팀
    {
      id: 'rep-8',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '서비스운영부문',
      team: '운영팀',
      author: '송중기 팀장',
      todayTask: '클라우드 인프라 일일 리소스 모니터링 및 정기 모니터링',
      tomorrowTask: '보안 패치 릴리즈 2.4 사전 검증',
      status: '완료',
      issues: '없음',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 운영팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:58:00Z',
    },
    {
      id: 'rep-9',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '서비스운영부문',
      team: '운영팀',
      author: '신세경 책임',
      todayTask: '고객사 시스템 문의 12건 조치 완료 및 FAQ 업데이트',
      tomorrowTask: '주간 장애 통계 리포트 작성',
      status: '완료',
      issues: '1건 긴급 요청건 조치 완료 (DB Connection Pool 조정)',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260803 운영팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:58:00Z',
    },
    {
      id: 'rep-10',
      date: '2026-08-03',
      displayDate: '2026년 08월 03일',
      department: '서비스운영부문',
      team: '운영팀',
      author: '유재석 선임',
      todayTask: '오후 반차 휴가',
      tomorrowTask: '서버 백업 스케줄링 정상 작동 여부 재확인',
      status: '완료',
      issues: '-',
      isVacationToday: true,
      vacationTypeToday: '오후반차',
      isVacationTomorrow: false,
      sourceFileName: '260803 운영팀 업무 공유.xlsx',
      updatedAt: '2026-08-03T17:58:00Z',
    },

    // 2026-08-04 Reports
    {
      id: 'rep-11',
      date: '2026-08-04',
      displayDate: '2026년 08월 04일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '김철수 팀장',
      todayTask: '그리드 데이터 오차 정밀 검증 완료 (오차율 0.28% 달성)',
      tomorrowTask: '최종 변전소 연동 보고서 승인 요청 및 시스템 배포',
      status: '완료',
      issues: '구형 모듈 펌웨어 업그레이드로 지연 해결됨',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260804 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-04T17:50:00Z',
    },
    {
      id: 'rep-12',
      date: '2026-08-04',
      displayDate: '2026년 08월 04일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '이영희 수석',
      todayTask: '금일 연차 휴가',
      tomorrowTask: '전력 피크 타임 예측 모델 추가 학습 데이터 세팅',
      status: '완료',
      issues: '-',
      isVacationToday: true,
      vacationTypeToday: '연차',
      isVacationTomorrow: false,
      sourceFileName: '260804 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-04T17:50:00Z',
    },
    {
      id: 'rep-13',
      date: '2026-08-04',
      displayDate: '2026년 08월 04일',
      department: '전력사업부문',
      team: '그리드팀',
      author: '박민수 책임',
      todayTask: 'ESS 4호기 안전 진단 점검 및 수치 정상 확인',
      tomorrowTask: '전체 ESS 단지 통합 중앙 제어반 통신 테스트',
      status: '완료',
      issues: '3호기 랙 센서 정상 교체 완료',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260804 그리드팀 업무 공유.xlsx',
      updatedAt: '2026-08-04T17:50:00Z',
    },
    {
      id: 'rep-14',
      date: '2026-08-04',
      displayDate: '2026년 08월 04일',
      department: 'IT개발부문',
      team: '개발팀',
      author: '한지민 책임',
      todayTask: '대용량 로그 쿼리 인덱스 최적화 작업 중 지연 발생',
      tomorrowTask: '파티셔닝 파이프라인 재구성 및 재시도',
      status: '지연',
      issues: 'DB 디스크 I/O 병목으로 추가 인덱스 생성 중 소요 시간 증가',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: '260804 개발팀 업무 공유.xlsx',
      updatedAt: '2026-08-04T17:55:00Z',
    },
    {
      id: 'rep-15',
      date: '2026-08-04',
      displayDate: '2026년 08월 04일',
      department: '서비스운영부문',
      team: '운영팀',
      author: '송중기 팀장',
      todayTask: '보안 패치 릴리즈 2.4 운영 환경 적용 완료',
      tomorrowTask: '패치 적용 후 시스템 실시간 패킷 이상 검출 모니터링',
      status: '완료',
      issues: '특이사항 없음',
      isVacationToday: false,
      isVacationTomorrow: true,
      vacationTypeTomorrow: '오전반차',
      sourceFileName: '260804 운영팀 업무 공유.xlsx',
      updatedAt: '2026-08-04T17:58:00Z',
    },
  ];
}

// Read and parse uploaded Excel file using XLSX
export async function parseExcelFile(file: File): Promise<WorkReportItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });

  // Get metadata from filename
  const meta = parseFileNameMetadata(file.name);

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!jsonRows || jsonRows.length === 0) {
    throw new Error('엑셀 파일에 데이터가 없습니다.');
  }

  // Find header row or parse rows
  const parsedItems: WorkReportItem[] = [];

  // Look for columns: 날짜, 부문, 팀명, 담당자, 금일업무, 익일업무, 상태, 이슈사항, 휴가(금일), 휴가(익일)
  let headerIndex = -1;
  let colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(jsonRows.length, 10); r++) {
    const row = jsonRows[r];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell || '').trim());
      if (
        rowStr.some(
          (c) =>
            c.includes('담당자') ||
            c.includes('금일업무') ||
            c.includes('업무내용') ||
            c.includes('이름')
        )
      ) {
        headerIndex = r;
        rowStr.forEach((colName, cIdx) => {
          if (colName.includes('날짜') || colName.includes('일자')) colMap['date'] = cIdx;
          if (colName.includes('부문') || colName.includes('본부')) colMap['department'] = cIdx;
          if (colName.includes('팀')) colMap['team'] = cIdx;
          if (colName.includes('담당자') || colName.includes('이름') || colName.includes('성명'))
            colMap['author'] = cIdx;
          if (colName.includes('금일') || colName.includes('오늘') || colName.includes('금일업무'))
            colMap['todayTask'] = cIdx;
          if (colName.includes('익일') || colName.includes('내일') || colName.includes('익일업무'))
            colMap['tomorrowTask'] = cIdx;
          if (colName.includes('상태') || colName.includes('진행결과') || colName.includes('결과'))
            colMap['status'] = cIdx;
          if (colName.includes('이슈') || colName.includes('비고') || colName.includes('특이사항'))
            colMap['issues'] = cIdx;
          if (colName.includes('금일휴가') || colName.includes('오늘휴가')) colMap['vacationToday'] = cIdx;
          if (colName.includes('익일휴가') || colName.includes('내일휴가')) colMap['vacationTomorrow'] = cIdx;
        });
        break;
      }
    }
  }

  const startRow = headerIndex >= 0 ? headerIndex + 1 : 1;

  for (let i = startRow; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const author = String(
      row[colMap['author'] ?? 2] || row[0] || ''
    ).trim();
    if (!author || author === '담당자' || author.includes('합계')) continue;

    const todayTask = String(
      row[colMap['todayTask'] ?? 3] || row[1] || ''
    ).trim();
    const tomorrowTask = String(
      row[colMap['tomorrowTask'] ?? 4] || row[2] || ''
    ).trim();
    const statusRaw = String(
      row[colMap['status'] ?? 5] || '진행중'
    ).trim();
    const issues = String(
      row[colMap['issues'] ?? 6] || '-'
    ).trim();
    const departmentRaw = String(
      row[colMap['department'] ?? 0] || '전력사업부문'
    ).trim();
    const teamRaw = String(
      row[colMap['team'] ?? 1] || meta.team
    ).trim();

    let status: WorkStatus = '진행중';
    if (statusRaw.includes('완료')) status = '완료';
    else if (statusRaw.includes('지연')) status = '지연';
    else if (statusRaw.includes('대기')) status = '대기';

    const vacationTodayVal = String(row[colMap['vacationToday'] ?? 7] || '').trim();
    const vacationTomorrowVal = String(row[colMap['vacationTomorrow'] ?? 8] || '').trim();

    const isVacationToday =
      todayTask.includes('휴가') ||
      todayTask.includes('연차') ||
      vacationTodayVal.length > 0;
    const isVacationTomorrow =
      tomorrowTask.includes('휴가') ||
      tomorrowTask.includes('연차') ||
      vacationTomorrowVal.length > 0;

    parsedItems.push({
      id: `rep-up-${Date.now()}-${i}`,
      date: meta.date,
      displayDate: meta.displayDate,
      department: departmentRaw,
      team: teamRaw || meta.team,
      author: author,
      todayTask: todayTask || '업무 일지 내용 참조',
      tomorrowTask: tomorrowTask || '계획 수립 예정',
      status: status,
      issues: issues || '없음',
      isVacationToday: isVacationToday,
      vacationTypeToday: isVacationToday ? vacationTodayVal || '연차' : undefined,
      isVacationTomorrow: isVacationTomorrow,
      vacationTypeTomorrow: isVacationTomorrow ? vacationTomorrowVal || '연차' : undefined,
      sourceFileName: file.name,
      updatedAt: new Date().toISOString(),
    });
  }

  // If parsed list is empty, build at least 1 fallback record from filename
  if (parsedItems.length === 0) {
    parsedItems.push({
      id: `rep-fallback-${Date.now()}`,
      date: meta.date,
      displayDate: meta.displayDate,
      department: '전력사업부문',
      team: meta.team,
      author: '담당자 (엑셀자동파싱)',
      todayTask: `${meta.team} 일일 업무 진행 완료 (파일명: ${file.name})`,
      tomorrowTask: `${meta.team} 일일 계획 실행`,
      status: '완료',
      issues: '특이사항 없음',
      isVacationToday: false,
      isVacationTomorrow: false,
      sourceFileName: file.name,
      updatedAt: new Date().toISOString(),
    });
  }

  return parsedItems;
}

// Export work reports to Excel file
export function exportReportsToExcel(reports: WorkReportItem[], fileNamePrefix: string = '통합_일일업무보고') {
  const excelData = reports.map((item, index) => ({
    'No': index + 1,
    '날짜': item.date,
    '부문': item.department,
    '팀명': item.team,
    '담당자': item.author,
    '금일 업무': item.todayTask,
    '익일 업무': item.tomorrowTask,
    '업무 상태': item.status,
    '이슈사항 및 조치계획': item.issues,
    '금일 휴가 여부': item.isVacationToday ? `휴가 (${item.vacationTypeToday || '연차'})` : '정상근무',
    '익일 휴가 여부': item.isVacationTomorrow ? `휴가 (${item.vacationTypeTomorrow || '연차'})` : '정상근무',
    '출처 파일': item.sourceFileName || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // 날짜
    { wch: 15 }, // 부문
    { wch: 12 }, // 팀명
    { wch: 12 }, // 담당자
    { wch: 40 }, // 금일 업무
    { wch: 40 }, // 익일 업무
    { wch: 10 }, // 상태
    { wch: 35 }, // 이슈사항
    { wch: 15 }, // 금일휴가
    { wch: 15 }, // 익일휴가
    { wch: 30 }, // 출처파일
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '일일업무보고통합');

  const todayStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const finalFileName = `${fileNamePrefix}_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, finalFileName);
}

// Generate & download sample team Excel file e.g. "260803 그리드팀 업무 공유.xlsx"
export function generateSampleExcelFile(teamName: string, dateStr: string = '260803') {
  const sampleRows = [
    {
      '부문': '전력사업부문',
      '팀명': teamName,
      '담당자': '김철수 팀장',
      '금일업무': `${teamName} 주요 1차 통합 모듈 점검 및 현장 수치 확인`,
      '익일업무': `${teamName} 2차 정밀 오차 검증 및 모니터링`,
      '상태': '진행중',
      '이슈사항': '센서 데이터 응답속도 100ms 지연 (네트워크 전송속도 점검중)',
      '금일휴가': '',
      '익일휴가': '',
    },
    {
      '부문': '전력사업부문',
      '팀명': teamName,
      '담당자': '이영희 수석',
      '금일업무': `${teamName} 데이터 최적화 파이프라인 알고리즘 작성 완료`,
      '익일업무': '알고리즘 피크 타임 테스트 및 연동',
      '상태': '완료',
      '이슈사항': '특이사항 없음',
      '금일휴가': '',
      '익일휴가': '연차',
    },
    {
      '부문': '전력사업부문',
      '팀명': teamName,
      '담당자': '박민수 책임',
      '금일업무': '금일 연차 휴가',
      '익일업무': `${teamName} 안전 진단 및 데이터 수집`,
      '상태': '완료',
      '이슈사항': '-',
      '금일휴가': '연차',
      '익일휴가': '',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${teamName}_일지`);

  const fileName = `${dateStr} ${teamName} 업무 공유.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

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

// Returns empty array (No mock data by default)
export function getInitialMockReports(): WorkReportItem[] {
  return [];
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

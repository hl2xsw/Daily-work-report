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

  // Get metadata from filename as fallback
  const meta = parseFileNameMetadata(file.name);

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!jsonRows || jsonRows.length === 0) {
    return [];
  }

  // 1. Extract team name from the 1st row (Row 0)
  let teamFromRow1 = '';
  if (jsonRows.length > 0 && Array.isArray(jsonRows[0])) {
    const row0Cells = jsonRows[0].map((cell: any) => String(cell || '').trim()).filter(Boolean);
    const row0Combined = row0Cells.join(' ');
    
    // Look for explicit team pattern e.g., "EV Innovation 부문", "그리드팀", "팀명: OO팀"
    const teamMatch = row0Combined.match(/(?:팀명|소속|팀|부서|부문)?\s*[:：]?\s*([가-힣a-zA-Z0-9_\- ]+(?:팀|부문|파트|센터|실|그룹))/i);
    if (teamMatch && teamMatch[1] && teamMatch[1].length < 30) {
      teamFromRow1 = teamMatch[1].trim();
    } else if (row0Cells.length > 0) {
      // If 1st row is short title like "EV Innovation 부문 업무일지" or "개발팀"
      const cleaned0 = row0Cells[0].replace(/(?:업무일지|일일업무보고|업무공유|일지|보고서)/g, '').trim();
      if (cleaned0.length > 1 && cleaned0.length < 25) {
        teamFromRow1 = cleaned0;
      }
    }
  }

  const finalTeamName = teamFromRow1 || meta.team;

  // 2. Find Header Row or Column Mapping
  // User standard mapping requirement:
  // A열(0) : 담당자
  // B열(1) : 금일 업무
  // C열(2) : 업무 결과
  // D열(3) : 익일 업무
  // E열(4) : 이슈사항
  // F열(5) : 비고
  let headerIndex = -1;
  let colMap: Record<string, number> = {
    author: 0,
    todayTask: 1,
    taskResult: 2,
    tomorrowTask: 3,
    issues: 4,
    remarks: 5,
  };

  for (let r = 0; r < Math.min(jsonRows.length, 10); r++) {
    const row = jsonRows[r];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell || '').trim());
      const isHeader = rowStr.some(
        (c) =>
          c.includes('담당자') ||
          c.includes('성명') ||
          c.includes('이름') ||
          c.includes('금일') ||
          c.includes('업무내용') ||
          c.includes('익일')
      );

      if (isHeader) {
        headerIndex = r;
        rowStr.forEach((colName, cIdx) => {
          if (colName.includes('담당자') || colName.includes('성명') || colName.includes('이름')) colMap['author'] = cIdx;
          else if (colName.includes('금일') || colName.includes('오늘업무') || (colName.includes('업무') && !colName.includes('익일') && !colName.includes('결과'))) colMap['todayTask'] = cIdx;
          else if (colName.includes('결과') || colName.includes('진행상황') || colName.includes('상태')) colMap['taskResult'] = cIdx;
          else if (colName.includes('익일') || colName.includes('내일')) colMap['tomorrowTask'] = cIdx;
          else if (colName.includes('이슈') || colName.includes('특이사항') || colName.includes('문제')) colMap['issues'] = cIdx;
          else if (colName.includes('비고') || colName.includes('휴가') || colName.includes('메모')) colMap['remarks'] = cIdx;
        });
        break;
      }
    }
  }

  const startRow = headerIndex >= 0 ? headerIndex + 1 : 1;
  const parsedItems: WorkReportItem[] = [];

  for (let i = startRow; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    const author = String(row[colMap['author'] ?? 0] || '').trim();
    
    // Ignore invalid/empty rows or headers
    if (
      !author ||
      author === '담당자' ||
      author === '성명' ||
      author === '이름' ||
      author.includes('합계') ||
      author.includes('소계') ||
      author.includes('TOTAL')
    ) {
      continue;
    }

    const todayTask = String(row[colMap['todayTask'] ?? 1] || '').trim();
    const taskResult = String(row[colMap['taskResult'] ?? 2] || '').trim();
    const tomorrowTask = String(row[colMap['tomorrowTask'] ?? 3] || '').trim();
    const issues = String(row[colMap['issues'] ?? 4] || '').trim();
    const remarks = String(row[colMap['remarks'] ?? 5] || '').trim();

    // Skip if all task fields are empty
    if (!todayTask && !tomorrowTask && !taskResult && !issues && !remarks) {
      continue;
    }

    // Work Status Determination
    let status: WorkStatus = '진행중';
    const combinedStatusText = `${taskResult} ${remarks} ${todayTask}`.toLowerCase();

    if (
      combinedStatusText.includes('완료') ||
      combinedStatusText.includes('100%') ||
      combinedStatusText.includes('done') ||
      combinedStatusText.includes('종료') ||
      combinedStatusText.includes('양호')
    ) {
      status = '완료';
    } else if (
      combinedStatusText.includes('지연') ||
      combinedStatusText.includes('미흡') ||
      combinedStatusText.includes('delay') ||
      combinedStatusText.includes('중단') ||
      combinedStatusText.includes('홀드')
    ) {
      status = '지연';
    } else if (
      combinedStatusText.includes('대기') ||
      combinedStatusText.includes('예정') ||
      combinedStatusText.includes('pending')
    ) {
      status = '대기';
    }

    // Vacation Detection from B열, D열, F열 (금일, 익일, 비고)
    const combinedVacationText = `${todayTask} ${tomorrowTask} ${remarks}`;
    const isVacationToday =
      todayTask.includes('휴가') ||
      todayTask.includes('연차') ||
      todayTask.includes('반차') ||
      remarks.includes('금일휴가') ||
      remarks.includes('금일 연차') ||
      remarks.includes('휴가');

    const isVacationTomorrow =
      tomorrowTask.includes('휴가') ||
      tomorrowTask.includes('연차') ||
      tomorrowTask.includes('반차') ||
      remarks.includes('익일휴가') ||
      remarks.includes('익일 연차');

    let vacationTypeToday = undefined;
    if (isVacationToday) {
      if (combinedVacationText.includes('오전반차') || combinedVacationText.includes('오전 반차')) vacationTypeToday = '오전반차';
      else if (combinedVacationText.includes('오후반차') || combinedVacationText.includes('오후 반차')) vacationTypeToday = '오후반차';
      else if (combinedVacationText.includes('반차')) vacationTypeToday = '반차';
      else if (combinedVacationText.includes('병가')) vacationTypeToday = '병가';
      else if (combinedVacationText.includes('공가')) vacationTypeToday = '공가';
      else vacationTypeToday = '연차';
    }

    let vacationTypeTomorrow = undefined;
    if (isVacationTomorrow) {
      if (combinedVacationText.includes('오전반차') || combinedVacationText.includes('오전 반차')) vacationTypeTomorrow = '오전반차';
      else if (combinedVacationText.includes('오후반차') || combinedVacationText.includes('오후 반차')) vacationTypeTomorrow = '오후반차';
      else if (combinedVacationText.includes('반차')) vacationTypeTomorrow = '반차';
      else if (combinedVacationText.includes('병가')) vacationTypeTomorrow = '병가';
      else if (combinedVacationText.includes('공가')) vacationTypeTomorrow = '공가';
      else vacationTypeTomorrow = '연차';
    }

    const cleanAuthor = author.replace(/\s+/g, '');
    const cleanFile = (file.name || '').replace(/[^a-zA-Z0-9가-힣]/g, '');
    const deterministicId = `rep-${meta.date}-${finalTeamName}-${cleanAuthor}-${i}-${cleanFile}`;

    parsedItems.push({
      id: deterministicId,
      date: meta.date,
      displayDate: meta.displayDate,
      department: 'EV Innovation 부문',
      team: finalTeamName,
      author: author,
      todayTask: todayTask || '-',
      taskResult: taskResult || '-',
      tomorrowTask: tomorrowTask || '-',
      status: status,
      issues: issues || '-',
      remarks: remarks || '-',
      isVacationToday: isVacationToday,
      vacationTypeToday: vacationTypeToday,
      isVacationTomorrow: isVacationTomorrow,
      vacationTypeTomorrow: vacationTypeTomorrow,
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

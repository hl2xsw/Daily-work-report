import * as XLSX from 'xlsx';
import { WorkReportItem, WorkStatus } from '../types';
import { cleanTeamName } from './cleanTeamName';

// Parse filename format like "260803 그리드팀 업무 공유.xlsx" or "20261102_AIO TF 일일업무보고서.xlsx"
export function parseFileNameMetadata(fileName: string): { date: string; displayDate: string; team: string } {
  let dateStr = '2026-11-02';
  let displayDateStr = '2026년 11월 02일';
  let teamName = 'AIO TF';

  const cleanName = fileName.replace(/\.[^/.]+$/, ''); // remove extension

  // Match YYMMDD (e.g., 261102) or YYYYMMDD (e.g. 20261102) or YYYY-MM-DD
  const yyyymmddHyphen = cleanName.match(/(\d{4})-(\d{2})-(\d{2})/);
  const yyyymmddMatch = cleanName.match(/(20\d{6})/);
  const yymmddMatch = cleanName.match(/(\d{6})/);

  if (yyyymmddHyphen) {
    const year = yyyymmddHyphen[1];
    const month = yyyymmddHyphen[2];
    const day = yyyymmddHyphen[3];
    dateStr = `${year}-${month}-${day}`;
    displayDateStr = `${year}년 ${month}월 ${day}일`;
  } else if (yyyymmddMatch) {
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

  // Extract team from cleanName
  let extracted = cleanName;
  // Remove date parts
  extracted = extracted.replace(/\d{4}[-_.]?\d{2}[-_.]?\d{2}/g, '');
  extracted = extracted.replace(/\d{6,8}/g, '');
  const sanitizedTeam = cleanTeamName(extracted);
  if (sanitizedTeam && sanitizedTeam !== '미지정팀') {
    teamName = sanitizedTeam;
  }

  return { date: dateStr, displayDate: displayDateStr, team: teamName };
}

// Returns empty array (No mock data by default)
export function getInitialMockReports(): WorkReportItem[] {
  return [];
}

/**
 * Check if a row represents a table header or sub-table row embedded inside the report
 */
function isSubTableHeader(cells: string[]): boolean {
  const text = cells.join(' ').toLowerCase();
  return (
    (text.includes('no') || text.includes('번호') || text.includes('순번')) &&
    (text.includes('모델') || text.includes('항목') || text.includes('ver') || text.includes('진행') || text.includes('상태') || text.includes('구분') || text.includes('기타'))
  );
}

/**
 * Format an array of cell values into a markdown table row: | cell1 | cell2 | ... |
 */
function formatMarkdownTableRow(cells: string[]): string {
  // Clean newlines inside cells to <br/> so the table format stays intact
  const safeCells = cells.map((c) => {
    const trimmed = String(c || '').trim();
    return trimmed.replace(/\r?\n/g, '<br/>').replace(/\|/g, '&#124;');
  });
  return `| ${safeCells.join(' | ')} |`;
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

  // 1. Extract team name from the 1st row (Row 0) or title banner
  let teamFromRow1 = '';
  for (let r = 0; r < Math.min(jsonRows.length, 3); r++) {
    const row = jsonRows[r];
    if (Array.isArray(row)) {
      const row0Cells = row.map((cell: any) => String(cell || '').trim()).filter(Boolean);
      const row0Combined = row0Cells.join(' ');
      if (!row0Combined) continue;

      // Extract and sanitize team name
      const cleaned = cleanTeamName(row0Combined);
      if (cleaned && cleaned !== '미지정팀' && cleaned.length >= 2 && cleaned.length <= 25) {
        teamFromRow1 = cleaned;
        break;
      }
    }
  }

  const finalTeamName = cleanTeamName(teamFromRow1 || meta.team);

  // 2. Find Header Row or Column Mapping
  // User standard mapping:
  // A열(0) : 담당자
  // B열(1) : 금일 업무
  // C열(2) : 업무 결과
  // D열(3) : 익일 업무
  // E열(4) : 이슈사항
  // F열(5) : 비고
  let headerIndex = -1;
  let colMap: Record<string, number> = {
    author: -1,
    todayTask: -1,
    taskResult: -1,
    tomorrowTask: -1,
    issues: -1,
    remarks: -1,
  };

  // Search first 15 rows for header keywords
  for (let r = 0; r < Math.min(jsonRows.length, 15); r++) {
    const row = jsonRows[r];
    if (Array.isArray(row)) {
      const rowStr = row.map((cell) => String(cell || '').trim());
      const isHeader = rowStr.some(
        (c) =>
          c.includes('담당') ||
          c.includes('성명') ||
          c.includes('이름') ||
          c.includes('작성자') ||
          c.includes('금일') ||
          c.includes('오늘') ||
          c.includes('업무내용') ||
          c.includes('주요업무') ||
          c.includes('익일') ||
          c.includes('내일')
      );

      if (isHeader) {
        headerIndex = r;
        rowStr.forEach((colName, cIdx) => {
          const cClean = colName.replace(/\s+/g, '');
          if (cClean.includes('담당') || cClean.includes('성명') || cClean.includes('이름') || cClean.includes('작성자') || cClean.includes('사원')) {
            colMap['author'] = cIdx;
          } else if (cClean.includes('금일') || cClean.includes('오늘') || cClean.includes('주요업무') || (cClean.includes('업무') && !cClean.includes('익일') && !cClean.includes('결과'))) {
            colMap['todayTask'] = cIdx;
          } else if (cClean.includes('결과') || cClean.includes('진행상황') || cClean.includes('진행률') || cClean.includes('달성률') || cClean.includes('상태')) {
            colMap['taskResult'] = cIdx;
          } else if (cClean.includes('익일') || cClean.includes('내일') || cClean.includes('향후계획')) {
            colMap['tomorrowTask'] = cIdx;
          } else if (cClean.includes('이슈') || cClean.includes('특이사항') || cClean.includes('문제')) {
            colMap['issues'] = cIdx;
          } else if (cClean.includes('비고') || cClean.includes('휴가') || cClean.includes('메모') || cClean.includes('참고')) {
            colMap['remarks'] = cIdx;
          }
        });
        break;
      }
    }
  }

  // Fallback default column mapping if header was not found or partially mapped
  if (colMap['author'] === -1) colMap['author'] = 0;
  if (colMap['todayTask'] === -1) colMap['todayTask'] = 1;
  if (colMap['taskResult'] === -1) colMap['taskResult'] = 2;
  if (colMap['tomorrowTask'] === -1) colMap['tomorrowTask'] = 3;
  if (colMap['issues'] === -1) colMap['issues'] = 4;
  if (colMap['remarks'] === -1) colMap['remarks'] = 5;

  const startRow = headerIndex >= 0 ? headerIndex + 1 : 1;
  const parsedItems: WorkReportItem[] = [];

  // Track the most recent report item to attach sub-tables or continuation rows
  let currentReport: WorkReportItem | null = null;
  let inSubTable = false;
  let subTableColCount = 0;

  for (let i = startRow; i < jsonRows.length; i++) {
    const row = jsonRows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;

    let authorRaw = String(row[colMap['author']] || '').trim();

    // Check if this row is an explicit header repetition or total/summary row
    if (
      authorRaw === '담당자' ||
      authorRaw === '성명' ||
      authorRaw === '이름' ||
      authorRaw === '작성자' ||
      authorRaw.includes('합계') ||
      authorRaw.includes('소계') ||
      authorRaw.includes('TOTAL')
    ) {
      continue;
    }

    const todayTaskRaw = String(row[colMap['todayTask']] || '').trim();
    const taskResultRaw = String(row[colMap['taskResult']] || '').trim();
    const tomorrowTaskRaw = String(row[colMap['tomorrowTask']] || '').trim();
    const issuesRaw = String(row[colMap['issues']] || '').trim();
    const remarksRaw = String(row[colMap['remarks']] || '').trim();

    // Filter out completely blank rows
    const nonBlankCells = row.map((c) => String(c || '').trim()).filter(Boolean);
    if (nonBlankCells.length === 0) {
      inSubTable = false;
      continue;
    }

    // -------------------------------------------------------------
    // SUB-TABLE DETECTION (Requirement 2: Embedded Tables in Work Result)
    // -------------------------------------------------------------
    // Find if this row is a sub-table header or table data row belonging to the previous person
    const isNewAuthor =
      authorRaw &&
      !/^\d+$/.test(authorRaw) &&
      !authorRaw.toLowerCase().includes('no') &&
      !authorRaw.includes('모델') &&
      !authorRaw.includes('jc-') &&
      authorRaw.length <= 15;

    // Check if this row is a sub-table header
    const rowCellsString = row.map((c) => String(c || '').trim());
    const startsSubTable = isSubTableHeader(rowCellsString);

    if (currentReport && (!authorRaw || !isNewAuthor || startsSubTable || inSubTable)) {
      if (startsSubTable) {
        inSubTable = true;
        // Extract table columns from row (starting from first non-empty cell)
        const firstNonEmpty = rowCellsString.findIndex((c) => c !== '');
        const tableHeaderCells = rowCellsString.slice(firstNonEmpty).filter((c, idx, arr) => {
          // Keep cells up to last non-empty
          return idx <= arr.map((x, i) => (x !== '' ? i : -1)).reduce((max, curr) => Math.max(max, curr), 0);
        });

        subTableColCount = tableHeaderCells.length;
        const mdHeader = formatMarkdownTableRow(tableHeaderCells);
        const mdSeparator = `| ${tableHeaderCells.map(() => '---').join(' | ')} |`;

        // Append markdown table to previous report's taskResult
        currentReport.taskResult = currentReport.taskResult && currentReport.taskResult !== '-'
          ? `${currentReport.taskResult}\n\n${mdHeader}\n${mdSeparator}`
          : `${mdHeader}\n${mdSeparator}`;

        continue;
      } else if (inSubTable) {
        // Table data row
        const firstNonEmpty = rowCellsString.findIndex((c) => c !== '');
        if (firstNonEmpty >= 0) {
          const firstVal = rowCellsString[firstNonEmpty];
          // If first val is numeric (e.g. 1, 2, 3) or model name, it's definitely a table row
          const isTableRow = /^\d+$/.test(firstVal) || firstVal.includes('JC-') || nonBlankCells.length >= 2;

          if (isTableRow) {
            // Slice cells matching table column count
            const tableDataCells = rowCellsString.slice(firstNonEmpty, firstNonEmpty + subTableColCount);
            // Pad if shorter
            while (tableDataCells.length < subTableColCount) {
              tableDataCells.push('-');
            }

            const mdRow = formatMarkdownTableRow(tableDataCells);
            currentReport.taskResult = `${currentReport.taskResult}\n${mdRow}`;
            continue;
          } else {
            inSubTable = false;
          }
        } else {
          inSubTable = false;
          continue;
        }
      }
    }

    // If author is empty or looks like a table row / number, and no major tasks, skip or treat as sub-row
    if (!authorRaw || /^\d+$/.test(authorRaw) || authorRaw.toLowerCase().startsWith('no')) {
      if (currentReport && (taskResultRaw || todayTaskRaw || tomorrowTaskRaw)) {
        // Append continuation text to previous report
        if (taskResultRaw) currentReport.taskResult += `\n${taskResultRaw}`;
        if (todayTaskRaw) currentReport.todayTask += `\n${todayTaskRaw}`;
        if (tomorrowTaskRaw) currentReport.tomorrowTask += `\n${tomorrowTaskRaw}`;
        if (issuesRaw) currentReport.issues += `\n${issuesRaw}`;
        continue;
      }
      continue;
    }

    // Skip if all task fields are empty
    if (!todayTaskRaw && !tomorrowTaskRaw && !taskResultRaw && !issuesRaw && !remarksRaw) {
      continue;
    }

    inSubTable = false;
    const author = authorRaw;

    // Work Status Determination
    let status: WorkStatus = '진행중';
    const combinedStatusText = `${taskResultRaw} ${remarksRaw} ${todayTaskRaw}`.toLowerCase();

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
    const combinedVacationText = `${todayTaskRaw} ${tomorrowTaskRaw} ${remarksRaw}`;
    const isVacationToday =
      todayTaskRaw.includes('휴가') ||
      todayTaskRaw.includes('연차') ||
      todayTaskRaw.includes('반차') ||
      remarksRaw.includes('금일휴가') ||
      remarksRaw.includes('금일 연차') ||
      remarksRaw.includes('휴가');

    const isVacationTomorrow =
      tomorrowTaskRaw.includes('휴가') ||
      tomorrowTaskRaw.includes('연차') ||
      tomorrowTaskRaw.includes('반차') ||
      remarksRaw.includes('익일휴가') ||
      remarksRaw.includes('익일 연차');

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

    const newReportItem: WorkReportItem = {
      id: deterministicId,
      date: meta.date,
      displayDate: meta.displayDate,
      department: 'EV Innovation 부문',
      team: finalTeamName,
      author: author,
      todayTask: todayTaskRaw || '-',
      taskResult: taskResultRaw || '-',
      tomorrowTask: tomorrowTaskRaw || '-',
      status: status,
      issues: issuesRaw || '-',
      remarks: remarksRaw || '-',
      isVacationToday: isVacationToday,
      vacationTypeToday: vacationTypeToday,
      isVacationTomorrow: isVacationTomorrow,
      vacationTypeTomorrow: vacationTypeTomorrow,
      sourceFileName: file.name,
      updatedAt: new Date().toISOString(),
    };

    parsedItems.push(newReportItem);
    currentReport = newReportItem;
  }

  return parsedItems;
}

// Export work reports to Excel file
export function exportReportsToExcel(reports: WorkReportItem[], fileNamePrefix: string = '통합_일일업무보고') {
  const excelData = reports.map((item, index) => {
    // When exporting, convert markdown table to readable text format
    const cleanTaskResult = (item.taskResult || '-')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\| --- (?:\| --- )*\|/g, '');

    return {
      'No': index + 1,
      '날짜': item.date,
      '부문': item.department,
      '팀명': cleanTeamName(item.team),
      '담당자': item.author,
      '금일 업무': item.todayTask,
      '업무 결과': cleanTaskResult,
      '익일 업무': item.tomorrowTask,
      '업무 상태': item.status,
      '이슈사항 및 조치계획': item.issues,
      '금일 휴가 여부': item.isVacationToday ? `휴가 (${item.vacationTypeToday || '연차'})` : '정상근무',
      '익일 휴가 여부': item.isVacationTomorrow ? `휴가 (${item.vacationTypeTomorrow || '연차'})` : '정상근무',
      '출처 파일': item.sourceFileName || '-',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 12 }, // 날짜
    { wch: 15 }, // 부문
    { wch: 14 }, // 팀명
    { wch: 12 }, // 담당자
    { wch: 35 }, // 금일 업무
    { wch: 45 }, // 업무 결과 (넉넉하게 설정)
    { wch: 35 }, // 익일 업무
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

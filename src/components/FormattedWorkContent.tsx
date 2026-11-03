import React from 'react';

interface FormattedWorkContentProps {
  text?: string;
  className?: string;
}

interface ParsedTable {
  headers: string[];
  rows: string[][];
}

type ContentBlock =
  | { type: 'text'; content: string }
  | { type: 'table'; table: ParsedTable };

/**
 * Checks if a block of lines looks like a markdown or tab-separated table
 */
function parseTableBlock(lines: string[]): ParsedTable | null {
  if (lines.length < 2) return null;

  // Filter out empty lines
  const cleanLines = lines.map((l) => l.trim()).filter(Boolean);
  if (cleanLines.length < 2) return null;

  // Check if first line has pipe separators or tab separators
  const isPipeTable = cleanLines[0].includes('|');
  const isTabTable = cleanLines[0].includes('\t');

  if (!isPipeTable && !isTabTable) return null;

  let headers: string[] = [];
  let dataRows: string[][] = [];

  if (isPipeTable) {
    // Parse pipe separated e.g., | No. | 모델 | 현재 F/W Ver. | ... |
    const splitPipeRow = (line: string): string[] => {
      let trimmed = line.trim();
      if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
      if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
      return trimmed.split('|').map((c) => c.trim());
    };

    headers = splitPipeRow(cleanLines[0]);
    if (headers.length === 0) return null;

    let startIndex = 1;
    // Check if line 1 is separator row like | --- | --- |
    if (cleanLines.length > 1 && /^\|?(\s*:?-+:?\s*\|)+\s*:?-+:?\s*\|?$/.test(cleanLines[1])) {
      startIndex = 2;
    }

    for (let i = startIndex; i < cleanLines.length; i++) {
      const row = splitPipeRow(cleanLines[i]);
      if (row.length > 0 && row.some((c) => c !== '')) {
        dataRows.push(row);
      }
    }
  } else if (isTabTable) {
    // Parse tab separated
    headers = cleanLines[0].split('\t').map((c) => c.trim());
    for (let i = 1; i < cleanLines.length; i++) {
      const row = cleanLines[i].split('\t').map((c) => c.trim());
      if (row.length > 0 && row.some((c) => c !== '')) {
        dataRows.push(row);
      }
    }
  }

  if (headers.length === 0 || dataRows.length === 0) return null;

  return { headers, rows: dataRows };
}

/**
 * Splits arbitrary text into alternating text blocks and structured table blocks
 */
function parseContentBlocks(text: string): ContentBlock[] {
  if (!text) return [];

  // Check for explicit [TABLE] ... [/TABLE] markers first
  if (text.includes('[TABLE]') && text.includes('[/TABLE]')) {
    const blocks: ContentBlock[] = [];
    const parts = text.split(/\[TABLE\]([\s\S]*?)\[\/TABLE\]/g);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;
      if (i % 2 === 1) {
        // Table content inside [TABLE]
        const lines = part.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const parsed = parseTableBlock(lines);
        if (parsed) {
          blocks.push({ type: 'table', table: parsed });
        } else {
          blocks.push({ type: 'text', content: part });
        }
      } else {
        const trimmed = part.trim();
        if (trimmed) {
          blocks.push({ type: 'text', content: part });
        }
      }
    }
    return blocks;
  }

  // Check if text has markdown or tab table lines
  const lines = text.split(/\r?\n/);
  const blocks: ContentBlock[] = [];

  let currentTextLines: string[] = [];
  let currentTableLines: string[] = [];
  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isPipeLine = line.trim().startsWith('|') && line.includes('|', line.indexOf('|') + 1);
    const isTabLine = line.includes('\t') && (line.includes('No') || line.includes('모델') || /^\d+\t/.test(line.trim()));

    if (isPipeLine || isTabLine) {
      if (!inTable) {
        if (currentTextLines.length > 0) {
          blocks.push({ type: 'text', content: currentTextLines.join('\n') });
          currentTextLines = [];
        }
        inTable = true;
      }
      currentTableLines.push(line);
    } else {
      if (inTable) {
        // Table ended
        const table = parseTableBlock(currentTableLines);
        if (table) {
          blocks.push({ type: 'table', table });
        } else {
          // Fallback to text
          currentTextLines.push(...currentTableLines);
        }
        currentTableLines = [];
        inTable = false;
      }
      currentTextLines.push(line);
    }
  }

  if (inTable && currentTableLines.length > 0) {
    const table = parseTableBlock(currentTableLines);
    if (table) {
      blocks.push({ type: 'table', table });
    } else {
      currentTextLines.push(...currentTableLines);
    }
  }

  if (currentTextLines.length > 0) {
    const joined = currentTextLines.join('\n');
    if (joined.trim()) {
      blocks.push({ type: 'text', content: joined });
    }
  }

  return blocks;
}

export const FormattedWorkContent: React.FC<FormattedWorkContentProps> = ({ text, className = '' }) => {
  if (!text || text.trim() === '' || text.trim() === '-') {
    return <span className="text-slate-400 text-xs">-</span>;
  }

  const blocks = parseContentBlocks(text);

  if (blocks.length === 0) {
    return <p className={`whitespace-pre-line ${className}`}>{text}</p>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'text') {
          return (
            <p key={index} className="whitespace-pre-line leading-relaxed text-slate-800 break-keep">
              {block.content}
            </p>
          );
        }

        // Render Table Block (Excel Style)
        const { headers, rows } = block.table;
        return (
          <div
            key={index}
            className="my-2.5 overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-xs max-w-full"
          >
            <table className="w-full text-left text-[11px] border-collapse min-w-[420px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 font-semibold">
                  {headers.map((h, hIdx) => (
                    <th
                      key={hIdx}
                      className="py-1.5 px-2.5 border-r border-slate-300 last:border-r-0 text-center font-bold text-slate-800 whitespace-nowrap bg-slate-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {rows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                    {headers.map((_, cIdx) => {
                      const cellRaw = row[cIdx] || '';
                      // Render cell with <br/> support if needed
                      const cellLines = cellRaw.split(/<br\s*\/?>|\n/gi);

                      // Check for status badges
                      const isCompleted = cellRaw.includes('완료') && !cellRaw.includes('미완료');
                      const isIncomplete = cellRaw.includes('미완료');
                      const isNo = cIdx === 0 && (/^\d+$/.test(cellRaw) || cellRaw === '-');

                      return (
                        <td
                          key={cIdx}
                          className={`py-1.5 px-2.5 border-r border-slate-200 last:border-r-0 align-top ${
                            isNo ? 'text-center font-mono font-medium text-slate-600 w-10' : ''
                          }`}
                        >
                          {isIncomplete ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px] mb-0.5">
                              미완료
                            </span>
                          ) : isCompleted ? (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] mb-0.5">
                              완료
                            </span>
                          ) : null}

                          <div className={isIncomplete || isCompleted ? 'mt-0.5 text-slate-700' : 'text-slate-800'}>
                            {cellLines.map((line, lIdx) => (
                              <React.Fragment key={lIdx}>
                                {line}
                                {lIdx < cellLines.length - 1 && <br />}
                              </React.Fragment>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
};

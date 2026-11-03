/**
 * Clean and normalize team names extracted from Excel files, sheet names, or titles.
 * Fixes issues where suffix words like "서" (from "일일업무보고서") or "보고" remain attached.
 * Example: "AIO TF 서" -> "AIO TF", "R&D 기획 서" -> "R&D 기획", "그리드팀 일일업무보고서" -> "그리드팀"
 */
export function cleanTeamName(rawTeam: string | undefined | null): string {
  if (!rawTeam) return '미지정팀';

  let cleaned = String(rawTeam).trim();

  // 1. Remove prefixes like "팀명:", "소속:", "부서:", "부문:"
  cleaned = cleaned.replace(/^(?:팀명|소속|부서|부문|팀)\s*[:：]\s*/i, '');

  // 2. Remove full report title phrases (longer first to prevent leaving fragments)
  const reportSuffixes = [
    /일일\s*업무\s*보고서/gi,
    /일일\s*업무\s*보고/gi,
    /일일\s*업무일지/gi,
    /일일\s*보고서/gi,
    /일일\s*보고/gi,
    /일일\s*일지/gi,
    /주간\s*업무\s*보고서/gi,
    /주간\s*업무\s*보고/gi,
    /주간\s*보고서/gi,
    /주간\s*보고/gi,
    /업무\s*보고서/gi,
    /업무\s*보고/gi,
    /업무\s*일지/gi,
    /업무\s*공유/gi,
    /보고서/gi,
    /일지/gi,
  ];

  for (const regex of reportSuffixes) {
    cleaned = cleaned.replace(regex, ' ');
  }

  // 3. Remove lingering trailing letters like " 서" or "_서" left from partial matches
  // e.g., "AIO TF 서" -> "AIO TF", "R&D 기획 서" -> "R&D 기획", "그리드팀 서" -> "그리드팀"
  cleaned = cleaned.replace(/[\s_]+서\s*$/i, '');
  cleaned = cleaned.replace(/[\s_]+보고\s*$/i, '');
  cleaned = cleaned.replace(/[\s_]+일지\s*$/i, '');

  // 4. Remove surrounding brackets or quotes
  cleaned = cleaned.replace(/^[\[{(<【'"]+|[\]})>】'"]+$/g, '');

  // 5. Collapse extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If cleaning stripped everything (unlikely), fallback
  if (!cleaned) {
    return '미지정팀';
  }

  return cleaned;
}

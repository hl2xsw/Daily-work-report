import React, { useState } from 'react';
import { WorkReportItem } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import {
  saveDirectoryHandle,
  scanDirectoryHandleRecursively,
  parseFileList,
} from '../utils/folderScanner';
import {
  UploadCloud,
  FileSpreadsheet,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Save,
  Trash2,
  FolderPlus,
} from 'lucide-react';

interface FileUploadViewProps {
  onImportReports: (newReports: WorkReportItem[], fileNames?: string[]) => void;
  onTriggerUpdate: () => void;
  onClearAllData?: () => void;
  onLoadSampleData?: () => void;
  onOpenServerConfig?: () => void;
  isStaticMode?: boolean;
  isUpdating: boolean;
  importedFilesHistory: string[];
}

export const FileUploadView: React.FC<FileUploadViewProps> = ({
  onImportReports,
  onTriggerUpdate,
  onClearAllData,
  onLoadSampleData,
  onOpenServerConfig,
  isStaticMode = false,
  isUpdating,
  importedFilesHistory,
}) => {
  const [folderPath, setFolderPath] = useState<string>(() => {
    return localStorage.getItem('watched_folder_path') || 'D:\\Data_JAC\\_EV Innovation 부문\\업무일지\\8월';
  });
  const [folderSaved, setFolderSaved] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSaveFolderPath = () => {
    localStorage.setItem('watched_folder_path', folderPath);
    setFolderSaved(true);
    setTimeout(() => {
      setFolderSaved(false);
    }, 3000);
  };

  // Modern Directory Picker for persistent folder watching & auto sync
  const handleSelectFolderWithPicker = async () => {
    setErrorMsg('');
    setUploadStatus('감시 폴더 선택 및 권한 확인 중...');

    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('현재 브라우저에서 폴더 선택 API를 지원하지 않습니다. 하단의 [폴더 전체 선택] 버튼을 이용해 주세요.');
      }

      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      if (!handle) return;

      await saveDirectoryHandle(handle);
      setFolderPath(handle.name);
      localStorage.setItem('watched_folder_path', handle.name);

      setUploadStatus(`[${handle.name}] 폴더 및 하위 폴더 스캔 중...`);

      const entries = await scanDirectoryHandleRecursively(handle);
      const files = entries.map((e) => e.file);
      const { reports, fileNames } = await parseFileList(files);

      if (fileNames.length === 0) {
        setErrorMsg(`폴더 [${handle.name}] 및 하위 폴더에 올바른 엑셀 파일(.xlsx, .xls)이 존재하지 않습니다.`);
        setUploadStatus('');
        return;
      }

      onImportReports(reports, fileNames);
      setUploadStatus(`✅ 성공: 감시 폴더 [${handle.name}] 승인 완료! 하위 폴더 포함 총 ${fileNames.length}개 파일 (${reports.length}건) 수집되었습니다.`);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Directory picker error:', err);
        setErrorMsg(err.message || '폴더 선택 중 오류가 발생했습니다.');
      }
      setUploadStatus('');
    }
  };

  // Handle File Input Selection (webkitdirectory / file upload)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus('엑셀 파일 / 폴더 파싱 중...');
    setErrorMsg('');

    try {
      const { reports, fileNames } = await parseFileList(files);

      if (fileNames.length === 0) {
        setErrorMsg('선택한 폴더 또는 목록에 올바른 엑셀 파일(.xlsx, .xls)이 존재하지 않습니다.');
        setUploadStatus('');
        return;
      }

      onImportReports(reports, fileNames);
      setUploadStatus(`성공: 총 ${fileNames.length}개 파일 (${reports.length}건) 업데이트 완료!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`오류 발생: ${err.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.'}`);
      setUploadStatus('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Mobile & PC Sync Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-2xl p-5 border border-indigo-800/60 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex items-center gap-2 font-bold text-xs text-indigo-300">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>📱 스마트폰 전용 초경량 데이터 실시간 연동 시스템</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              PC 브라우저에서 폴더나 엑셀 파일을 선택하면, <strong>대용량 엑셀 파일 원본은 서버에 올리지 않고</strong> 스마트폰에서 1초 만에 열리는 <strong>스마트폰 최적화 경량 데이터(JSON)로 자동 변환</strong>되어 서버에 안전하게 연동 저장됩니다.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                ✓ 엑셀 원본 파일 업로드 없음 (초경량 데이터만 전송)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/30">
                ✓ 스마트폰 접속 시 초고속 0.1초 즉시 동기화
              </span>
            </div>
          </div>

          <div className="flex sm:flex-col items-center gap-2 w-full md:w-auto">
            {onOpenServerConfig && (
              <button
                onClick={onOpenServerConfig}
                className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 text-xs font-bold rounded-xl text-indigo-100 bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-700/80 shadow-xs transition cursor-pointer whitespace-nowrap"
              >
                <span>🌐 서버 연동 설정</span>
              </button>
            )}
            <button
              onClick={onTriggerUpdate}
              disabled={isUpdating}
              className={`w-full sm:w-auto flex items-center justify-center space-x-2 px-4 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all transform active:scale-95 whitespace-nowrap cursor-pointer ${
                isUpdating ? 'bg-indigo-800' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? '서버 동기화 중...' : '🔄 최신 동기화'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            각 팀별 업무보고(엑셀) 폴더 감시 및 자동 동기화
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            지정된 폴더 및 하위 폴더에서 팀별 일지(`260803 그리드팀 업무 공유.xlsx` 등)를 자동 수집합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onLoadSampleData && (
            <button
              onClick={onLoadSampleData}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition cursor-pointer"
            >
              <span>📊 샘플 3개팀 일지 채우기 (동기화 테스트)</span>
            </button>
          )}

          <button
            onClick={onTriggerUpdate}
            disabled={isUpdating}
            className={`flex items-center space-x-2 px-5 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-all transform active:scale-95 cursor-pointer ${
              isUpdating ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
            <span>{isUpdating ? '폴더 수집 중...' : '신규 파일 수집 (업데이트 버튼)'}</span>
          </button>
        </div>
      </div>

      {/* Requirement 1 & 4: Specified Folder Path & Excel File Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Specific Folder Path Settings & Persistent Permission */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm mb-2">
              <FolderSync className="w-4 h-4" />
              <span>특정 폴더 및 하위 폴더 자동 감시 설정</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              아래 버튼으로 감시 폴더를 지정해 주시면 설정된 시간 및 [업데이트] 버튼 클릭 시 <strong>하위 폴더 전체</strong>를 자동 수집합니다.
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleSelectFolderWithPicker}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-emerald-900/30"
              >
                <FolderPlus className="w-4 h-4" />
                <span>📁 감시 폴더 선택 & 자동 동기화 권한 승인</span>
              </button>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  지정된 감시 폴더 경로 (하위 폴더 포함 스캔):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={folderPath}
                    onChange={(e) => {
                      setFolderPath(e.target.value);
                      setFolderSaved(false);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs font-mono px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveFolderPath}
                    className="flex items-center space-x-1 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all whitespace-nowrap shadow-xs"
                    title="감시 폴더 경로 저장"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </button>
                </div>
                {folderSaved && (
                  <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>감시 폴더 경로가 저장되었습니다!</span>
                  </p>
                )}
              </div>

              <div className="bg-slate-950/80 rounded-lg p-3 text-xs text-slate-400 border border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">규칙적 파일명 및 하위 구조 예시:</div>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-blue-300/90 font-mono">
                  <li>8월\GridTeam\260803 그리드팀 업무 공유.xlsx</li>
                  <li>8월\DevTeam\260803 개발팀 업무 공유.xlsx</li>
                  <li>8월\OpsTeam\260803 운영팀 업무 공유.xlsx</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>하위 폴더 내 모든 .xlsx 실시간 감시</span>
            <span className="text-emerald-400 font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              감시 상태: ACTIVE
            </span>
          </div>
        </div>

        {/* Box 2: Drag & Drop Real File Upload */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>엑셀 파일 / 폴더 수동 수집 (하위 폴더 전체)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              팀별 업무 일지 파일 또는 폴더 전체(하위 폴더 포함)를 선택하여 즉시 파싱합니다.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all group">
              <FileSpreadsheet className="w-9 h-9 mx-auto text-slate-400 group-hover:text-blue-600 transition mb-2" />
              <span className="text-xs font-bold text-slate-700 block">
                클릭하여 엑셀 파일/폴더 선택
              </span>
              <span className="text-[11px] text-slate-400 block mt-1 mb-3">
                (개별 파일 선택 및 하위 폴더 전체 선택 지원)
              </span>

              <div className="flex justify-center items-center gap-2">
                <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs">
                  <span>파일 선택 (.xlsx)</span>
                  <input
                    type="file"
                    multiple
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer transition shadow-xs">
                  <span>폴더 전체 선택 (하위 포함)</span>
                  <input
                    type="file"
                    // @ts-ignore
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {uploadStatus && (
            <div className="mt-3 p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{uploadStatus}</span>
            </div>
          )}

          {errorMsg && (
            <div className="mt-3 p-3 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* History log of imported files */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-500" />
            최근 동기화 수집 파일 이력 ({importedFilesHistory.length}건)
          </h3>

          <div className="flex items-center space-x-2">
            {onClearAllData && (
              <button
                onClick={onClearAllData}
                className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>데이터 전체 초기화</span>
              </button>
            )}
          </div>
        </div>

        {importedFilesHistory.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-lg border border-slate-200/80">
            동기화 수집된 엑셀 파일 이력이 없습니다. 상단 [📁 감시 폴더 선택 & 자동 동기화 권한 승인] 또는 [파일/폴더 선택]으로 일지(.xlsx)를 읽어와주세요.
          </div>
        ) : (
          <div className="space-y-2">
            {importedFilesHistory.map((fname, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-lg border border-slate-200"
              >
                <span className="font-mono text-slate-700 font-semibold">{fname}</span>
                <span className="text-[11px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded">
                  수집 완료
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { WorkReportItem } from '../types';
import { parseExcelFile } from '../utils/excelParser';
import {
  UploadCloud,
  FileSpreadsheet,
  FolderSync,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Save,
} from 'lucide-react';

interface FileUploadViewProps {
  onImportReports: (newReports: WorkReportItem[]) => void;
  onTriggerUpdate: () => void;
  isUpdating: boolean;
  importedFilesHistory: string[];
}

export const FileUploadView: React.FC<FileUploadViewProps> = ({
  onImportReports,
  onTriggerUpdate,
  isUpdating,
  importedFilesHistory,
}) => {
  const [folderPath, setFolderPath] = useState<string>(() => {
    return localStorage.getItem('watched_folder_path') || 'C:\\WorkReports\\Daily_Excel_Sync\\';
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

  // Handle Drag & Drop / File Input
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus('엑셀 파일 파싱 중...');
    setErrorMsg('');

    try {
      const allNewReports: WorkReportItem[] = [];
      const fileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        fileNames.push(file.name);
        const parsed = await parseExcelFile(file);
        allNewReports.push(...parsed);
      }

      onImportReports(allNewReports);
      setUploadStatus(`성공: 총 ${files.length}개 파일 (${allNewReports.length}건) 업데이트 완료!`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`오류 발생: ${err.message || '엑셀 파일을 읽는 중 오류가 발생했습니다.'}`);
      setUploadStatus('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Info */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-600" />
            각 팀별 업무보고(엑셀) 폴더 감시 및 동기화
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            지정된 폴더에서 팀별 일지(`260803 그리드팀 업무 공유.xlsx` 형식)를 수집하여 통합 데이터베이스로 업데이트합니다.
          </p>
        </div>

        <button
          onClick={onTriggerUpdate}
          disabled={isUpdating}
          className={`flex items-center space-x-2 px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition-all transform active:scale-95 ${
            isUpdating ? 'bg-blue-800' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>{isUpdating ? '폴더 수집 중...' : '신규 파일 수집 (업데이트 버튼)'}</span>
        </button>
      </div>

      {/* Requirement 1 & 4: Specified Folder Path & Excel File Upload */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Specific Folder Path Settings (Requirement 4) */}
        <div className="bg-slate-900 text-slate-100 rounded-xl p-5 border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-sm mb-2">
              <FolderSync className="w-4 h-4" />
              <span>특정 폴더 업무보고 자동 감시 경로</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              서버 및 로컬 네트워크 공유 폴더에 저장되는 팀별 업무일지를 지속적으로 감시하여 매 18:00 또는 업데이트 버튼 클릭 시 자동으로 읽어옵니다.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  감시 폴더 Absolute Path:
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
                    <span>감시 폴더 경로가 성공적으로 저장되었습니다.</span>
                  </p>
                )}
              </div>

              <div className="bg-slate-950/80 rounded-lg p-3 text-xs text-slate-400 border border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">규칙적 파일명 예시:</div>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-blue-300/90 font-mono">
                  <li>260803 그리드팀 업무 공유.xlsx</li>
                  <li>260803 개발팀 업무 공유.xlsx</li>
                  <li>260803 운영팀 업무 공유.xlsx</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>폴더 내 새 파일 발견 시 자동 파싱 적용</span>
            <span className="text-blue-400 font-mono">상태: 정상 (ACTIVE)</span>
          </div>
        </div>

        {/* Box 2: Drag & Drop Real File Upload */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>직접 엑셀 파일 수동 업로드 (Drag & Drop)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              팀장이 작성한 `.xlsx` 일지 파일을 드래그하거나 선택하여 즉시 시스템에 반영합니다.
            </p>

            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-6 text-center block cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all group">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-400 group-hover:text-blue-600 transition mb-2" />
              <span className="text-xs font-bold text-slate-700 block">
                클릭하여 엑셀 파일 선택 또는 여기에 드롭
              </span>
              <span className="text-[11px] text-slate-400 block mt-1">
                (다중 선택 가능: `260803 그리드팀 업무 공유.xlsx` 등)
              </span>
              <input
                type="file"
                multiple
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
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
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          최근 동기화 수집 파일 이력 ({importedFilesHistory.length}건)
        </h3>

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
      </div>
    </div>
  );
};

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
  Trash2,
  Info,
} from 'lucide-react';

interface FileUploadViewProps {
  onImportReports: (newReports: WorkReportItem[], fileNames?: string[]) => void;
  onTriggerUpdate: () => void;
  onClearAllData?: () => void;
  isUpdating: boolean;
  importedFilesHistory: string[];
}

export const FileUploadView: React.FC<FileUploadViewProps> = ({
  onImportReports,
  onTriggerUpdate,
  onClearAllData,
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

  // Handle File Input Selection
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus('엑셀 파일 파싱 중...');
    setErrorMsg('');

    try {
      const allNewReports: WorkReportItem[] = [];
      const validFileNames: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
          validFileNames.push(file.name);
          const parsed = await parseExcelFile(file);
          allNewReports.push(...parsed);
        }
      }

      if (validFileNames.length === 0) {
        setErrorMsg('선택한 목록에 올바른 엑셀 파일(.xlsx, .xls)이 존재하지 않습니다.');
        setUploadStatus('');
        return;
      }

      onImportReports(allNewReports, validFileNames);
      setUploadStatus(`성공: 총 ${validFileNames.length}개 파일 (${allNewReports.length}건) 업데이트 완료!`);
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
              <span>특정 폴더 및 하위 폴더 자동 감시 경로</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              지정된 감시 폴더 및 <strong>하위 폴더(Subdirectories) 전체</strong>를 스캔하여 설정된 정기 시간(기본 17:30) 또는 수동 업데이트 시 동기화합니다.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  감시 폴더 Absolute Path (하위 폴더 포함 스캔):
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
                    <span>감시 폴더 경로가 저장되었습니다! (다음 접속 시에도 유지)</span>
                  </p>
                )}
              </div>

              <div className="bg-slate-950/80 rounded-lg p-3 text-xs text-slate-400 border border-slate-800 space-y-1">
                <div className="text-[11px] font-semibold text-slate-300">규칙적 파일명 예시 (하위 폴더 구조 지원):</div>
                <ul className="list-disc pl-4 text-[11px] space-y-0.5 text-blue-300/90 font-mono">
                  <li>Daily_Excel_Sync\GridTeam\260803 그리드팀 업무 공유.xlsx</li>
                  <li>Daily_Excel_Sync\DevTeam\260803 개발팀 업무 공유.xlsx</li>
                  <li>Daily_Excel_Sync\OpsTeam\260803 운영팀 업무 공유.xlsx</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex justify-between items-center">
            <span>하위 폴더 내 모든 신규 .xlsx 파싱</span>
            <span className="text-blue-400 font-mono">상태: 정상 (ACTIVE)</span>
          </div>
        </div>

        {/* Box 2: Drag & Drop Real File Upload */}
        <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-2">
              <UploadCloud className="w-4 h-4 text-blue-600" />
              <span>엑셀 파일 / 폴더 수동 업로드 (하위 폴더 포함)</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              팀별 업무 일지 파일 또는 폴더 전체(하위 폴더 포함)를 드래그하거나 선택하여 즉시 파싱합니다.
            </p>

            <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-blue-50/30 transition-all group">
              <FileSpreadsheet className="w-9 h-9 mx-auto text-slate-400 group-hover:text-blue-600 transition mb-2" />
              <span className="text-xs font-bold text-slate-700 block">
                클릭하여 엑셀 파일/폴더 선택 또는 여기에 드롭
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

          {onClearAllData && importedFilesHistory.length > 0 && (
            <button
              onClick={onClearAllData}
              className="flex items-center space-x-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>데이터 전체 초기화</span>
            </button>
          )}
        </div>

        {importedFilesHistory.length === 0 ? (
          <div className="text-xs text-slate-400 py-6 text-center italic bg-slate-50 rounded-lg border border-slate-200/80">
            동기화 수집된 엑셀 파일 이력이 없습니다. 상단 [폴더 전체 선택] 또는 [파일 선택]으로 일지(.xlsx)를 읽어와주세요.
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

import React, { useState, useEffect } from 'react';
import { Server, Globe, Check, X, RefreshCw, Smartphone, Laptop, AlertCircle, Sparkles } from 'lucide-react';
import { getCustomServerUrl, setCustomServerUrl, getDefaultServerUrl } from '../utils/apiConfig';

interface ServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onServerUrlChanged: () => void;
  isStaticMode: boolean;
}

export const ServerConfigModal: React.FC<ServerConfigModalProps> = ({
  isOpen,
  onClose,
  onServerUrlChanged,
  isStaticMode,
}) => {
  const [serverUrl, setServerUrl] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setServerUrl(getCustomServerUrl());
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async (urlToTest: string) => {
    const targetUrl = (urlToTest || '').trim().replace(/\/+$/, '');
    if (!targetUrl) {
      // Test current host
      try {
        setIsTesting(true);
        setTestResult(null);
        const res = await fetch(`/api/reports/status?_t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setTestResult({
            success: true,
            message: `현재 호스트 서버에 정상 연결되었습니다! (저장된 일지: ${data.count || 0}건)`,
          });
        } else {
          setTestResult({
            success: false,
            message: `현재 호스트에서 API를 찾을 수 없습니다 (HTTP ${res.status}). 정적 호스팅(GitHub Pages)의 경우 아래 원격 Cloud Run 서버 URL을 적용해 주세요.`,
          });
        }
      } catch (e: any) {
        setTestResult({
          success: false,
          message: `연결 실패: ${e.message || '네트워크 오류'}`,
        });
      } finally {
        setIsTesting(false);
      }
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      const res = await fetch(`${targetUrl}/api/reports/status?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `원격 서버 연결 성공! (저장된 일지: ${data.count || 0}건, 스마트폰/PC 실시간 동기화 가능)`,
        });
      } else {
        setTestResult({
          success: false,
          message: `서버 응답 오류 (HTTP ${res.status}). URL을 확인해 주세요.`,
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: `서버 연결 실패: ${e.message || 'CORS 또는 네트워크 상태 확인 필요'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    setCustomServerUrl(serverUrl);
    onServerUrlChanged();
    onClose();
  };

  const handleSetDefaultCloudRun = () => {
    const defaultUrl = getDefaultServerUrl();
    setServerUrl(defaultUrl);
    handleTestConnection(defaultUrl);
  };

  const handleResetToCurrentHost = () => {
    setServerUrl('');
    handleTestConnection('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-800">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600 rounded-xl">
              <Server className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base">🌐 서버 연동 및 실시간 동기화 설정</h3>
              <p className="text-xs text-slate-400">스마트폰과 PC 간 업무보고 데이터 실시간 공유</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Status info */}
          <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
            isStaticMode 
              ? 'bg-amber-50 border-amber-200 text-amber-800' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <AlertCircle className="w-4 h-4" />
              <span>
                {isStaticMode 
                  ? '현재 상태: 로컬 브라우저 독립 모드 (정적 배포)' 
                  : '현재 상태: 중앙 서버 실시간 연동 활성화'}
              </span>
            </div>
            {isStaticMode ? (
              <p>
                GitHub Pages와 같은 정적 호스팅 사이트에서는 자체 백엔드가 없어 404가 발생할 수 있습니다. 
                PC에서 엑셀을 업로드하면 스마트폰 최적화 데이터로 <strong>로컬에 즉시 안전 저장</strong>되며, 
                원격 실시간 동기화를 원하시면 아래 <strong>[Cloud Run 백엔드 연동]</strong>을 적용해 주세요!
              </p>
            ) : (
              <p>
                PC와 스마트폰이 동일한 중앙 서버와 실시간으로 초경량 JSON 데이터를 양방향 동기화하고 있습니다.
              </p>
            )}
          </div>

          {/* Server URL Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              중앙 백엔드 서버 URL (선택 사항)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Globe className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="예: https://ais-dev-pshbeuykxbj26nq52ozyfe-362057610439.asia-northeast1.run.app"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-slate-800 bg-slate-50"
                />
              </div>
              <button
                onClick={() => handleTestConnection(serverUrl)}
                disabled={isTesting}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                <span>연결 테스트</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              비워두면 현재 웹사이트 도메인(`/api/reports`)을 기본값으로 사용합니다.
            </p>
          </div>

          {/* Quick preset buttons */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-bold text-slate-600">빠른 연결 프리셋</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                onClick={handleSetDefaultCloudRun}
                className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-left transition cursor-pointer flex items-center gap-2.5"
              >
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-blue-900">Cloud Run 백엔드 적용</div>
                  <div className="text-[10px] text-blue-700">GitHub Pages에서도 실시간 연동</div>
                </div>
              </button>

              <button
                onClick={handleResetToCurrentHost}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition cursor-pointer flex items-center gap-2.5"
              >
                <Laptop className="w-4 h-4 text-slate-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-800">현재 호스트 기본값 사용</div>
                  <div className="text-[10px] text-slate-500">로컬 / 동일 도메인 연결</div>
                </div>
              </button>
            </div>
          </div>

          {/* Connection Test Result */}
          {testResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
              testResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              {testResult.success ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          {/* Mobile Guide */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <Smartphone className="w-4 h-4 text-indigo-600" />
              <span>스마트폰에서 볼 때 참고사항</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              PC에서 엑셀을 업로드하면 스마트폰 화면에서는 무거운 엑셀 파싱 없이 초경량 JSON으로 즉각 렌더링됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>설정 저장 및 적용</span>
          </button>
        </div>
      </div>
    </div>
  );
};

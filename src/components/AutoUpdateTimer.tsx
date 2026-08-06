import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle2, RefreshCw, Sparkles, Clock } from 'lucide-react';

interface AutoUpdateTimerProps {
  enabled: boolean;
  onAutoTriggerUpdate: () => void;
  setNextSyncTimeStr: (str: string) => void;
}

export const AutoUpdateTimer: React.FC<AutoUpdateTimerProps> = ({
  enabled,
  onAutoTriggerUpdate,
  setNextSyncTimeStr,
}) => {
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setNextSyncTimeStr('비활성화됨');
      return;
    }

    const checkAndSchedule = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(18, 0, 0, 0);

      if (now > target) {
        // Next day 18:00
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      const formattedCountdown = `${String(hours).padStart(2, '0')}:${String(mins).padStart(
        2,
        '0'
      )}:${String(secs).padStart(2, '0')} 남음`;

      setNextSyncTimeStr(formattedCountdown);

      // If exact 18:00 (within 1 second window)
      if (diffMs <= 1000) {
        setNotification('⏰ [18:00 정기 정시 동기화] 팀별 신규 일일 업무 보고서를 자동 업데이트 하였습니다!');
        onAutoTriggerUpdate();
        setTimeout(() => setNotification(null), 8000);
      }
    };

    checkAndSchedule();
    const interval = setInterval(checkAndSchedule, 1000);
    return () => clearInterval(interval);
  }, [enabled, onAutoTriggerUpdate, setNextSyncTimeStr]);

  if (!notification) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white border-2 border-emerald-500 rounded-2xl shadow-2xl p-4 max-w-md animate-bounce">
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            매일 18:00 자동 업데이트 실행 완료
          </h4>
          <p className="text-xs text-slate-200 mt-1 leading-snug">{notification}</p>
        </div>
      </div>
    </div>
  );
};

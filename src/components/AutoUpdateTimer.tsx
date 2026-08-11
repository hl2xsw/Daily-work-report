import React, { useEffect, useState, useRef } from 'react';
import { Bell, Sparkles } from 'lucide-react';

interface AutoUpdateTimerProps {
  enabled: boolean;
  autoSyncTime?: string;
  onAutoTriggerUpdate: () => void;
  setNextSyncTimeStr: (str: string) => void;
}

export const AutoUpdateTimer: React.FC<AutoUpdateTimerProps> = ({
  enabled,
  autoSyncTime = '17:30',
  onAutoTriggerUpdate,
  setNextSyncTimeStr,
}) => {
  const [notification, setNotification] = useState<string | null>(null);
  const triggeredRef = useRef<string>(localStorage.getItem('last_triggered_sync_key') || '');

  useEffect(() => {
    if (!enabled) {
      setNextSyncTimeStr('비활성화됨');
      return;
    }

    const checkAndSchedule = () => {
      const parts = (autoSyncTime || '17:30').split(':');
      const targetHour = parseInt(parts[0], 10) || 17;
      const targetMinute = parseInt(parts[1], 10) || 30;

      const now = new Date();

      // Create target time object for today
      const target = new Date();
      target.setHours(targetHour, targetMinute, 0, 0);

      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTriggerKey = `${todayDateStr}_${targetHour}:${targetMinute}`;

      // If today's target time has passed by more than 2 seconds, schedule for tomorrow
      if (now.getTime() >= target.getTime() + 2000) {
        target.setDate(target.getDate() + 1);
      }

      const diffMs = target.getTime() - now.getTime();

      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        const formattedCountdown = `${String(hours).padStart(2, '0')}:${String(mins).padStart(
          2,
          '0'
        )}:${String(secs).padStart(2, '0')} 남음`;

        setNextSyncTimeStr(formattedCountdown);

        // Trigger if target time is reached (within 2 seconds window) and hasn't fired for this target today
        if (diffMs <= 2000 && triggeredRef.current !== currentTriggerKey) {
          triggeredRef.current = currentTriggerKey;
          localStorage.setItem('last_triggered_sync_key', currentTriggerKey);
          setNotification(`⏰ [${autoSyncTime} 정기 정시 동기화] 감시 폴더 신규 일일 업무 보고서를 자동 수집 및 동기화하였습니다!`);
          onAutoTriggerUpdate();
          setTimeout(() => setNotification(null), 8000);
        }
      } else {
        setNextSyncTimeStr('동기화 진행 중...');
      }
    };

    checkAndSchedule();
    const interval = setInterval(checkAndSchedule, 1000);
    return () => clearInterval(interval);
  }, [enabled, autoSyncTime, onAutoTriggerUpdate, setNextSyncTimeStr]);

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
            매일 {autoSyncTime} 자동 업데이트 실행 완료
          </h4>
          <p className="text-xs text-slate-200 mt-1 leading-snug">{notification}</p>
        </div>
      </div>
    </div>
  );
};

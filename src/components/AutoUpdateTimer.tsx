import React, { useEffect, useState, useRef } from 'react';
import { Bell, Sparkles } from 'lucide-react';

interface AutoUpdateTimerProps {
  enabled: boolean;
  autoSyncTime?: string;
  onAutoTriggerUpdate: () => Promise<void> | void;
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

    const checkAndSchedule = async () => {
      const parts = (autoSyncTime || '17:30').split(':');
      const targetHour = parseInt(parts[0], 10) || 17;
      const targetMinute = parseInt(parts[1], 10) || 30;

      const now = new Date();

      // Today's target Date object
      const targetToday = new Date();
      targetToday.setHours(targetHour, targetMinute, 0, 0);

      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const currentTriggerKey = `${todayDateStr}_${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')}`;

      // Calculate countdown target time
      let countdownTarget = new Date(targetToday);
      if (now.getTime() >= targetToday.getTime()) {
        // If today's target time has passed, next target is tomorrow
        countdownTarget.setDate(countdownTarget.getDate() + 1);
      }

      // Format remaining countdown time
      const diffMs = countdownTarget.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

        const formattedCountdown = `${String(hours).padStart(2, '0')}:${String(mins).padStart(
          2,
          '0'
        )}:${String(secs).padStart(2, '0')} 남음`;

        setNextSyncTimeStr(formattedCountdown);
      } else {
        setNextSyncTimeStr('동기화 진행 중...');
      }

      // Trigger condition:
      // Current time is past today's target time, within 12 hours, and hasn't triggered for this key yet
      const timeSinceTarget = now.getTime() - targetToday.getTime();
      if (
        now.getTime() >= targetToday.getTime() &&
        timeSinceTarget < 12 * 60 * 60 * 1000 &&
        triggeredRef.current !== currentTriggerKey
      ) {
        triggeredRef.current = currentTriggerKey;
        localStorage.setItem('last_triggered_sync_key', currentTriggerKey);
        setNotification(`⏰ [${autoSyncTime} 정시 동기화] 감시 폴더 신규 업무일지 수집을 실행합니다...`);

        try {
          await onAutoTriggerUpdate();
        } catch (err) {
          console.error('Auto sync trigger error:', err);
        }

        setTimeout(() => setNotification(null), 8000);
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
            매일 {autoSyncTime} 정시 동기화 실행
          </h4>
          <p className="text-xs text-slate-200 mt-1 leading-snug">{notification}</p>
        </div>
      </div>
    </div>
  );
};

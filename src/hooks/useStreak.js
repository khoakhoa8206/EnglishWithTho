// src/hooks/useStreak.js
import { useEffect, useState } from 'react';
import { streakService } from '@/services/ai/streakService';

export function useStreak(studentId) {
  const [streak, setStreak] = useState(null);        // current_streak (number)
  const [longestStreak, setLongestStreak] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    streakService.getStreak(studentId)
      .then(data => {
        // data là object: { current_streak, longest_streak, last_active_date }
        setStreak(data?.current_streak ?? 0);
        setLongestStreak(data?.longest_streak ?? 0);
      })
      .catch(setError)
      .finally(() => setLoading(false));
  }, [studentId]);

  return { streak, longestStreak, loading, error };
}

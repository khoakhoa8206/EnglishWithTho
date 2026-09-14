// src/hooks/useAntiCheat.js
// Hook chống gian lận: detect ra khỏi tab/app khi làm bài
// - Lần 1-4: hiện cảnh báo, cho làm tiếp
// - Lần 5: hiện cảnh báo, gọi onReset để làm lại từ preview

import { useEffect, useRef, useState, useCallback } from 'react';

const MAX_VIOLATIONS = 5; // Số lần out trước khi bị reset

export function useAntiCheat({ active, onReset, onViolation }) {
  // active: boolean — chỉ bật khi học sinh đang thực sự làm bài (phase = 'part4_doing')
  // onReset: () => void — callback khi đạt ngưỡng, reset bài về preview
  // onViolation: (count) => void — callback mỗi lần vi phạm (để cộng dồn nếu cần)

  const [violationCount, setViolationCount] = useState(0);
  const [showWarning, setShowWarning]       = useState(false);
  const [isResetting, setIsResetting]       = useState(false);
  const activeRef  = useRef(active);
  const countRef   = useRef(0); // dùng ref để tránh stale closure trong event listener

  useEffect(() => { activeRef.current = active; }, [active]);

  // Reset bộ đếm khi bắt đầu làm bài mới
  useEffect(() => {
    if (active) {
      countRef.current = 0;
      setViolationCount(0);
      setShowWarning(false);
      setIsResetting(false);
    }
  }, [active]);

  const handleViolation = useCallback(() => {
    if (!activeRef.current) return;

    countRef.current += 1;
    const newCount = countRef.current;
    setViolationCount(newCount);
    setShowWarning(true);

    if (onViolation) onViolation(newCount);

    if (newCount >= MAX_VIOLATIONS) {
      setIsResetting(true);
    }
  }, [onViolation]);

  // Đóng cảnh báo (cho làm tiếp nếu chưa đến ngưỡng)
  const dismissWarning = useCallback(() => {
    if (isResetting) {
      setShowWarning(false);
      if (onReset) onReset(countRef.current);
    } else {
      setShowWarning(false);
    }
  }, [isResetting, onReset]);

  useEffect(() => {
    if (!active) return;

    // Tránh double-fire khi cả 2 event cùng lúc
    let lastFiredAt = 0;
    const DEBOUNCE_MS = 500;

    const fire = () => {
      const now = Date.now();
      if (now - lastFiredAt < DEBOUNCE_MS) return;
      lastFiredAt = now;
      handleViolation();
    };

    const onVisibilityChange = () => {
      if (document.hidden) fire();
    };
    const onBlur = () => {
      // window blur bắt thêm case: mở cửa sổ trình duyệt thứ 2, alt+tab sang app khác
      fire();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
    };
  }, [active, handleViolation]);

  return { violationCount, showWarning, isResetting, dismissWarning };
}
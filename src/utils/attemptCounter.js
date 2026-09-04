// src/utils/attemptCounter.js
// Giới hạn số lần làm bài của học viên (tự học) — lưu trong localStorage

export const MAX_ATTEMPTS = 3;

/**
 * Tạo key duy nhất cho mỗi bài làm của học viên.
 * @param {string} kind - 'vocab' | 'grammar'
 * @param {string} studentId
 * @param {string} topicId
 * @param {number} index - lessonIdx (vocab) hoặc batchIdx (grammar)
 */
export function attemptKey(kind, studentId, topicId, index) {
  return `attempt_${kind}_${studentId}_${topicId}_${index}`;
}

export function getAttemptCount(kind, studentId, topicId, index) {
  if (!studentId) return 0;
  try {
    const raw = localStorage.getItem(attemptKey(kind, studentId, topicId, index));
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function incrementAttemptCount(kind, studentId, topicId, index) {
  if (!studentId) return;
  try {
    const current = getAttemptCount(kind, studentId, topicId, index);
    localStorage.setItem(attemptKey(kind, studentId, topicId, index), String(current + 1));
  } catch {}
}

export function isAttemptLimitReached(kind, studentId, topicId, index) {
  return getAttemptCount(kind, studentId, topicId, index) >= MAX_ATTEMPTS;
}

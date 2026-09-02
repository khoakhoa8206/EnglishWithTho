// src/hooks/useAsyncData.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAsyncData — hook tái sử dụng pattern loading/error/retry
 *
 * @param {Function} fetchFn  — hàm async trả về data
 * @param {Array}    deps     — dependencies (giống useEffect)
 * @param {Object}   options
 *   options.skip   {boolean} — true → không fetch (VD: chưa có studentId)
 *   options.initial {any}    — giá trị khởi tạo của data (default null)
 *
 * @returns {{ data, loading, error, refetch }}
 */
export function useAsyncData(fetchFn, deps = [], { skip = false, initial = null } = {}) {
  const [data, setData]       = useState(initial);
  const [loading, setLoading] = useState(!skip);
  const [error, setError]     = useState(null);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const run = useCallback(async () => {
    if (skip) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchFn();
      if (mountedRef.current) setData(result);
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'Đã có lỗi xảy ra.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { data, loading, error, refetch: run };
}
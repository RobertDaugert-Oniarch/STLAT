import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Client-side rate limiter.
 * Tracks attempts within a time window and blocks when the limit is reached.
 *
 * @param maxAttempts  Maximum allowed attempts within the window.
 * @param windowMs     Time window in milliseconds (resets after this period).
 * @returns { canProceed, remainingSeconds, recordAttempt }
 */
export function useRateLimit(maxAttempts: number, windowMs: number) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const attempts = useRef<number[]>([]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;
    const timer = setTimeout(() => setRemainingSeconds((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [remainingSeconds]);

  const recordAttempt = useCallback(() => {
    const now = Date.now();
    // Remove attempts outside the window
    attempts.current = attempts.current.filter((t) => now - t < windowMs);
    attempts.current.push(now);

    if (attempts.current.length >= maxAttempts) {
      const oldestInWindow = attempts.current[0];
      const cooldownEnd = oldestInWindow + windowMs;
      const secondsLeft = Math.ceil((cooldownEnd - now) / 1000);
      setRemainingSeconds(secondsLeft);
    }
  }, [maxAttempts, windowMs]);

  const canProceed = remainingSeconds <= 0;

  return { canProceed, remainingSeconds, recordAttempt };
}

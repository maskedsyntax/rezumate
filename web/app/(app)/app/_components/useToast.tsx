"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** A short status message at the bottom of the screen, announced to screen readers. */
export function useToast(): [React.ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const show = useCallback((next: string) => {
    clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2600);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  const node = <div aria-live="polite">{message ? <div className="toast" key={message + Date.now()}>{message}</div> : null}</div>;
  return [node, show];
}

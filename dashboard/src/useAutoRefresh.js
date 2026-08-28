import { useEffect, useRef } from "react";

/** Poll callback while the tab is visible (orders, dashboard stats, etc.). */
export function useAutoRefresh(callback, intervalMs = 12000) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") cbRef.current();
    }
    const id = setInterval(tick, intervalMs);
    function onVisible() {
      if (document.visibilityState === "visible") cbRef.current();
    }
    function onFocus() {
      cbRef.current();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [intervalMs]);
}

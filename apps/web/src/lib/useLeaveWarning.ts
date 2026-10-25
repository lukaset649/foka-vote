import { useEffect } from 'react';

/** Asks the browser to confirm closing or reloading the page while `enabled` is true. */
const useLeaveWarning = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [enabled]);
};

export default useLeaveWarning;

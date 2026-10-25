import { useCallback, useEffect, useRef } from 'react';

/**
 * Runs `discard` when the user leaves the page: on unmount (in-app navigation) or on `pagehide`
 * (closing or reloading the tab). Returns `keep`, which cancels it for an intended navigation.
 */
const useDiscardOnLeave = (discard: () => void) => {
  const discardRef = useRef(discard);
  const keptRef = useRef(false);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    discardRef.current = discard;
  });

  useEffect(() => {
    // StrictMode unmounts and remounts right away in development; the remount cancels the
    // discard its simulated unmount scheduled.
    window.clearTimeout(timerRef.current);

    const handlePageHide = (event: PageTransitionEvent) => {
      // A page kept in the back/forward cache can be restored with its form intact.
      if (!event.persisted && !keptRef.current) {
        discardRef.current();
      }
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      timerRef.current = window.setTimeout(() => {
        if (!keptRef.current) {
          discardRef.current();
        }
      }, 0);
    };
  }, []);

  return useCallback(() => {
    keptRef.current = true;
  }, []);
};

export default useDiscardOnLeave;

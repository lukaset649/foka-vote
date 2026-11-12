import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let justInstalled = false;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach((listener) => listener());
};

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  justInstalled = true;
  notify();
});

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => deferredPrompt;
const getJustInstalledSnapshot = () => justInstalled;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

const useInstallPrompt = () => {
  const prompt = useSyncExternalStore(subscribe, getSnapshot);
  const isJustInstalled = useSyncExternalStore(subscribe, getJustInstalledSnapshot);
  const standalone = isStandalone();

  const canPrompt = !standalone && prompt !== null;
  const needsIosInstructions = !standalone && prompt === null && isIos();

  const promptInstall = async () => {
    if (!prompt) {
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    deferredPrompt = null;
    notify();
  };

  const dismissInstalled = () => {
    justInstalled = false;
    notify();
  };

  return {
    canPrompt,
    needsIosInstructions,
    promptInstall,
    justInstalled: isJustInstalled,
    dismissInstalled,
  };
};

export default useInstallPrompt;

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isWebView, setIsWebView] = useState(false);

  useEffect(() => {
    // 1. Detect platform and browser environment
    const ua = (typeof window !== 'undefined' && window.navigator ? window.navigator.userAgent : '').toLowerCase();
    const androidDetected = /android/.test(ua);
    const iosDetected = /iphone|ipad|ipod/.test(ua) && !('MSStream' in window);
    
    // Check for in-app browsers (WhatsApp, Telegram, Instagram, Facebook, TikTok, Line, or Android WebView)
    const webViewDetected =
      /fban|fbav|instagram|line|micromessenger|telegram|whatsapp|bytedance|tiktok/.test(ua) ||
      (androidDetected && /wv|\.wv/.test(ua));

    setIsAndroid(androidDetected);
    setIsIOS(iosDetected);
    setIsWebView(webViewDetected);

    // 2. Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;
      const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');
      setIsInstalled(isStandaloneMatch || isIOSStandalone || isAndroidApp);
    };

    checkStandalone();

    // 3. Register Service Worker reliably
    if ('serviceWorker' in navigator) {
      const registerSW = () => {
        navigator.serviceWorker
          .register('./sw.js')
          .then((reg) => {
            console.log('iLoveQyu Service Worker aktif:', reg.scope);
          })
          .catch((err) => {
            console.error('PWA Service Worker registration error:', err);
          });
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
      }
    }

    // 4. Capture beforeinstallprompt for Android & Chromium browsers
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Track online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 6. Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<'accepted' | 'dismissed' | 'modal'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
        }
        return choice.outcome;
      } catch (err) {
        console.error('Install prompt failed:', err);
        return 'modal';
      }
    }

    // When deferredPrompt is not available (e.g. iOS, in-app WebView, or browser requiring manual menu selection)
    return 'modal';
  };

  return {
    isInstalled,
    isOnline,
    isIOS,
    isAndroid,
    isWebView,
    hasNativePrompt: !!deferredPrompt,
    canInstall: !isInstalled,
    triggerInstall,
  };
}

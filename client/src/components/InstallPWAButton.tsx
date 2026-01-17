import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches || 
          (window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
    };

    checkIfInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);
      
      // Show banner after a short delay if not installed
      setTimeout(() => {
        if (!isInstalled) {
          setShowBanner(true);
        }
      }, 3000);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setShowInstallButton(false);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowInstallButton(false);
        setShowBanner(false);
      } else {
        console.log('User dismissed the install prompt');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error during install prompt:', error);
    }
  };

  const closeBanner = () => {
    setShowBanner(false);
    // Don't show banner again for this session
    sessionStorage.setItem('installBannerDismissed', 'true');
  };

  // Don't show if already installed or no prompt available
  if (isInstalled || (!showInstallButton && !showBanner)) {
    return null;
  }

  return (
    <>
      {/* Install Banner */}
      {showBanner && !sessionStorage.getItem('installBannerDismissed') && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-3 shadow-lg z-50 animate-slide-down">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5" />
              <div>
                <p className="font-bold text-sm">Install Shahdol Bazaar App</p>
                <p className="text-xs opacity-90">Get faster access and offline features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-orange-600 px-4 py-1 rounded-full text-sm font-bold hover:bg-orange-50 transition-colors"
              >
                Install
              </button>
              <button
                onClick={closeBanner}
                className="p-1 hover:bg-orange-400 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Install Button */}
      {showInstallButton && !showBanner && (
        <button
          onClick={handleInstallClick}
          className="fixed bottom-20 right-4 bg-orange-600 hover:bg-orange-700 text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-40 animate-bounce"
          title="Install Shahdol Bazaar App"
          aria-label="Install App"
        >
          <Download className="w-5 h-5" />
        </button>
      )}

      <style jsx>{`
        @keyframes slide-down {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default InstallPWAButton;

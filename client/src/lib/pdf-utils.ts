/**
 * Utility functions for PDF handling in PWA environments
 */

/**
 * Detects if the app is running as a Progressive Web App
 */
export const isPWA = (): boolean => {
  // Check for display-mode: standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  
  // Check for iOS standalone mode
  const isIOSStandalone = (window.navigator as any).standalone === true;
  
  // Check for Android PWA (Chrome)
  const isAndroidPWA = window.matchMedia('(display-mode: standalone)').matches ||
                       window.matchMedia('(display-mode: fullscreen)').matches ||
                       window.matchMedia('(display-mode: minimal-ui)').matches;
  
  return isStandalone || isIOSStandalone || isAndroidPWA;
};

/**
 * Opens a PDF in an external browser when running as PWA, otherwise opens in new tab
 */
export const openPdfExternally = (pdfUrl: string): void => {
  console.log('Opening PDF in system browser');
  
  if (isPWA()) {
    // Running as PWA - force external browser
    try {
      // Method 1: Try _system target (works on many mobile browsers)
      const opened = window.open(pdfUrl, '_system');
      
      // Method 2: Fallback - try _blank with specific window features to force external
      if (!opened || opened.closed) {
        const externalWindow = window.open(
          pdfUrl, 
          '_blank',
          'noopener,noreferrer,toolbar=yes,location=yes,menubar=yes'
        );
        
        // Method 3: Final fallback - direct navigation
        if (!externalWindow || externalWindow.closed) {
          // Use location assignment as last resort
          setTimeout(() => {
            window.location.href = pdfUrl;
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error opening PDF externally:', error);
      // Final fallback - standard window.open
      window.open(pdfUrl, '_blank');
    }
  } else {
    // Running in regular browser - standard behavior
    window.open(pdfUrl, '_blank');
  }
};

/**
 * Logs PWA detection info for debugging
 */
export const logPWAStatus = (): void => {
  console.log('PWA Detection:', {
    isPWA: isPWA(),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    iOSStandalone: (window.navigator as any).standalone,
    userAgent: navigator.userAgent
  });
};
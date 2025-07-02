/**
 * Utility functions for PDF handling in PWA environments
 * Enhanced for iOS PWA to force external browser opening
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
 * Detects if running on iOS
 */
export const isiOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Opens a PDF in an external browser when running as PWA, especially for iOS
 */
export const openPdfExternally = (pdfUrl: string): void => {
  console.log('Opening PDF in system browser', {
    isPWA: isPWA(),
    isiOS: isiOS(),
    userAgent: navigator.userAgent
  });
  
  if (isPWA() && isiOS()) {
    // iOS PWA requires NUCLEAR approach to break out of PWA context completely
    console.log('🚨 iOS PWA DETECTED - Using NUCLEAR external browser escape methods');
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });
    
    // NUCLEAR OPTION 1: Use mailto scheme to trigger external app, then redirect
    try {
      console.log('🚀 NUCLEAR METHOD 1: Using mailto scheme to break PWA context');
      
      // Create a mailto link to force iOS to ask about opening external app
      const mailtoUrl = `mailto:?subject=PDF Report&body=Opening PDF report...`;
      const tempMailto = document.createElement('a');
      tempMailto.href = mailtoUrl;
      tempMailto.style.display = 'none';
      document.body.appendChild(tempMailto);
      
      // Trigger the mailto (this often breaks PWA context)
      tempMailto.click();
      document.body.removeChild(tempMailto);
      
      // Wait and then navigate to PDF (now that PWA context might be broken)
      setTimeout(() => {
        console.log('🚀 NUCLEAR METHOD 1b: Now navigating to PDF after PWA break attempt');
        window.location.replace(window.location.origin + pdfUrl);
      }, 500);
      
    } catch (error) {
      console.error('NUCLEAR METHOD 1 failed:', error);
      
      // NUCLEAR OPTION 2: Use tel scheme as PWA context breaker
      try {
        console.log('🚀 NUCLEAR METHOD 2: Using tel scheme to break PWA context');
        
        const telUrl = 'tel:+1';
        const tempTel = document.createElement('a');
        tempTel.href = telUrl;
        tempTel.style.display = 'none';
        document.body.appendChild(tempTel);
        
        tempTel.click();
        document.body.removeChild(tempTel);
        
        setTimeout(() => {
          console.log('🚀 NUCLEAR METHOD 2b: Now navigating to PDF after tel PWA break');
          window.location.replace(window.location.origin + pdfUrl);
        }, 500);
        
      } catch (error2) {
        console.error('NUCLEAR METHOD 2 failed:', error2);
        
        // NUCLEAR OPTION 3: Direct location replacement (most aggressive)
        console.log('🚀 NUCLEAR METHOD 3: Direct location replacement - MOST AGGRESSIVE');
        window.location.replace(window.location.origin + pdfUrl);
      }
    }
    
  } else if (isPWA()) {
    // Non-iOS PWA (Android, etc.)
    console.log('Non-iOS PWA detected - using standard external methods');
    
    try {
      // Method 1: Try _system target (works on many mobile browsers)
      const opened = window.open(pdfUrl, '_system');
      
      // Method 2: Fallback - try _blank with specific window features
      if (!opened || opened.closed) {
        const externalWindow = window.open(
          pdfUrl, 
          '_blank',
          'noopener,noreferrer,toolbar=yes,location=yes,menubar=yes'
        );
        
        // Method 3: Final fallback - direct navigation
        if (!externalWindow || externalWindow.closed) {
          setTimeout(() => {
            window.location.href = pdfUrl;
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error opening PDF externally:', error);
      window.location.href = pdfUrl;
    }
    
  } else {
    // Running in regular browser - standard behavior
    console.log('Regular browser detected - using standard window.open');
    const opened = window.open(pdfUrl, '_blank');
    if (!opened) {
      window.location.href = pdfUrl;
    }
  }
};

/**
 * Alternative method that fetches PDF as blob and creates download
 */
export const downloadPdfDirectly = async (pdfUrl: string, filename: string = 'document.pdf'): Promise<void> => {
  try {
    console.log('Downloading PDF directly as blob');
    const response = await fetch(pdfUrl);
    const blob = await response.blob();
    
    // Create blob URL
    const blobUrl = URL.createObjectURL(blob);
    
    // Create download link
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
    }, 1000);
    
  } catch (error) {
    console.error('Failed to download PDF directly:', error);
    // Fallback to external opening
    openPdfExternally(pdfUrl);
  }
};

/**
 * Logs PWA detection info for debugging
 */
export const logPWAStatus = (): void => {
  console.log('PWA Detection:', {
    isPWA: isPWA(),
    isiOS: isiOS(),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    iOSStandalone: (window.navigator as any).standalone,
    userAgent: navigator.userAgent
  });
};
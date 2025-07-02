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
    // iOS PWA requires special handling to break out of PWA context
    console.log('🚨 iOS PWA DETECTED - Using aggressive external browser methods');
    console.log('📱 Device info:', {
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone,
      displayMode: window.matchMedia('(display-mode: standalone)').matches
    });
    
    // Method 1: Create a hidden iframe approach
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = pdfUrl;
    document.body.appendChild(iframe);
    
    // Method 2: Create download link with user interaction
    setTimeout(() => {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'document.pdf';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      
      // Force a user gesture by creating a visible button temporarily
      link.style.position = 'fixed';
      link.style.top = '50%';
      link.style.left = '50%';
      link.style.transform = 'translate(-50%, -50%)';
      link.style.padding = '20px';
      link.style.backgroundColor = '#007AFF';
      link.style.color = 'white';
      link.style.border = 'none';
      link.style.borderRadius = '8px';
      link.style.fontSize = '16px';
      link.style.zIndex = '9999';
      link.style.cursor = 'pointer';
      link.innerHTML = 'Tap to Open PDF';
      
      document.body.appendChild(link);
      
      // Auto-remove after 5 seconds or on click
      const cleanup = () => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      };
      
      link.onclick = () => {
        console.log('🎯 User tapped the PDF button! Attempting to open:', pdfUrl);
        cleanup();
        
        // Try multiple opening methods
        console.log('📂 Method 1: Trying window.open with _blank');
        const newWindow = window.open(pdfUrl, '_blank');
        console.log('📂 window.open result:', newWindow);
        
        setTimeout(() => {
          console.log('📂 Method 2: Trying direct navigation as fallback');
          window.location.href = pdfUrl;
        }, 1000);
      };
      
      setTimeout(cleanup, 5000);
      
    }, 100);
    
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
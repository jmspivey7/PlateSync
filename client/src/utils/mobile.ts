// Mobile device detection utility
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent;
  const mobileKeywords = [
    'iPhone', 'iPad', 'iPod', 'iOS',
    'Android', 'BlackBerry', 'Opera Mini',
    'IEMobile', 'Windows Phone', 'Mobile'
  ];
  
  return mobileKeywords.some(keyword => 
    userAgent.includes(keyword)
  ) || window.innerWidth <= 768;
}

// Handle PDF access for all devices
export function handleMobilePDFAccess(pdfUrl: string): void {
  // Simple direct approach - just open the URL
  // This bypasses React router completely
  window.open(pdfUrl, '_blank');
}
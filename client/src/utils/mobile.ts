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

// Handle PDF access for mobile devices
export function handleMobilePDFAccess(pdfUrl: string): void {
  if (isMobileDevice()) {
    // For mobile devices, directly navigate to the PDF URL
    // This bypasses the frontend router and goes straight to the server
    window.location.href = pdfUrl;
  } else {
    // For desktop, open PDF in new window
    window.open(pdfUrl, '_blank');
  }
}
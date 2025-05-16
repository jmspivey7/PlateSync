import React, { createContext, useContext, ReactNode } from 'react';
import { useGlobalAdminAuth } from '@/hooks/useGlobalAdminAuth';

// Create auth context with the return type of useGlobalAdminAuth
export const GlobalAdminAuthContext = createContext<ReturnType<typeof useGlobalAdminAuth> | null>(null);

// Provider component that wraps the global admin part of the app
export function GlobalAdminAuthProvider({ children }: { children: ReactNode }) {
  const authUtils = useGlobalAdminAuth();
  
  return (
    <GlobalAdminAuthContext.Provider value={authUtils}>
      {children}
    </GlobalAdminAuthContext.Provider>
  );
}

// Hook for components to get the auth context
export function useGlobalAdminAuthContext() {
  const context = useContext(GlobalAdminAuthContext);
  if (!context) {
    throw new Error('useGlobalAdminAuthContext must be used within a GlobalAdminAuthProvider');
  }
  return context;
}
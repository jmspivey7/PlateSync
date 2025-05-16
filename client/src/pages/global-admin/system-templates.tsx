import React from 'react';
import { useLocation } from 'wouter';
import { Mail } from 'lucide-react';
import GlobalAdminHeader from '@/components/global-admin/GlobalAdminHeader';
import SystemEmailTemplates from '@/components/global-admin/SystemEmailTemplates';

// Main navigation links
const navLinks = [
  { name: 'Dashboard', href: '/global-admin/dashboard' },
  { name: 'Churches', href: '/global-admin/churches' },
  { name: 'Users', href: '/global-admin/users' },
  { name: 'Reports', href: '/global-admin/reports' },
  { name: 'System Templates', href: '/global-admin/system-templates', current: true },
  { name: 'Help & Support', href: '/global-admin/help' },
];

export default function SystemTemplates() {
  const [location, setLocation] = useLocation();
  
  // Check if user is authenticated as a global admin
  React.useEffect(() => {
    const token = localStorage.getItem('globalAdminToken');
    if (!token) {
      setLocation('/global-admin/login');
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Global Admin Header */}
      <GlobalAdminHeader />
      
      {/* Main content */}
      <div className="py-10">
        <header>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Mail className="h-8 w-8 text-primary mr-3" />
              <h1 className="text-3xl font-bold leading-tight text-gray-900">System Email Templates</h1>
            </div>
          </div>
        </header>
        <main>
          <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
            <div className="px-4 py-8 sm:px-0">
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="p-6">
                  <SystemEmailTemplates />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
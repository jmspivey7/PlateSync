import React from 'react';
import { useLocation } from 'wouter';
import { Mail } from 'lucide-react';
import GlobalAdminAccountDropdown from '@/components/global-admin/GlobalAdminAccountDropdown';
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
      {/* Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-semibold text-primary">PlateSync <span className="text-gray-500 text-sm">Admin</span></span>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8" aria-label="Global">
                {navLinks.map((item) => (
                  <a
                    key={item.name}
                    href={item.href}
                    className={`
                      inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium
                      ${item.current
                        ? 'border-primary text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'}
                    `}
                    aria-current={item.current ? 'page' : undefined}
                  >
                    {item.name}
                  </a>
                ))}
              </nav>
            </div>
            <div className="flex items-center">
              <GlobalAdminAccountDropdown />
            </div>
          </div>
        </div>
      </div>
      
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
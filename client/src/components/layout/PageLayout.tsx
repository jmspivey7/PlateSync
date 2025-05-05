import React from "react";
import SharedNavigation from "./SharedNavigation";
import SharedFooter from "./SharedFooter";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const PageLayout = ({ children, title, subtitle, icon, action }: PageLayoutProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-4">
      {/* Header/Navigation */}
      <SharedNavigation title={title} subtitle={subtitle} icon={icon} action={action} />
      
      {/* Main Content */}
      {children}
      
      {/* Footer */}
      <SharedFooter />
    </div>
  );
};

export default PageLayout;
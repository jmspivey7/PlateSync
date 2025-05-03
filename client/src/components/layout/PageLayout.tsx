import React from "react";
import SharedNavigation from "./SharedNavigation";
import SharedFooter from "./SharedFooter";

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const PageLayout = ({ children, title, subtitle }: PageLayoutProps) => {
  return (
    <div className="max-w-4xl mx-auto px-4 mb-8">
      {/* Header/Navigation */}
      <SharedNavigation title={title} subtitle={subtitle} />
      
      {/* Main Content */}
      {children}
      
      {/* Footer */}
      <SharedFooter />
    </div>
  );
};

export default PageLayout;
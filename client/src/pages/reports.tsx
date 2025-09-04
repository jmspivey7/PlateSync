import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileBarChart, Download } from "lucide-react";
import PageLayout from "@/components/layout/PageLayout";
import { useAuth } from "@/hooks/useAuth";

const Reports = () => {
  const { isAdmin } = useAuth();

  // Only admins can access this page
  if (!isAdmin) {
    return (
      <PageLayout title="Access Denied" subtitle="You don't have permission to access this page">
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-red-500 mb-4">
            This feature is only available to administrators.
          </p>
          <Button
            onClick={() => window.location.href = "/dashboard"}
            className="bg-[#d35f5f] hover:bg-[#d35f5f]/90 text-white"
          >
            Return to Dashboard
          </Button>
        </div>
      </PageLayout>
    );
  }

  const handleExport = (reportType: string) => {
    // TODO: Implement actual export functionality
    console.log(`Exporting ${reportType}`);
    // This would call an API endpoint to generate the report
  };

  return (
    <PageLayout 
      title="Reports" 
      subtitle="Export donation and member data for reporting purposes"
      icon={<FileBarChart className="h-6 w-6 text-[#d35f5f]" />}
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Generate Reports</CardTitle>
            <CardDescription>
              Export donation and member data for reporting purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="text-[#2D3748] hover:bg-[#d35f5f]/10 flex items-center justify-center gap-2 h-16"
                onClick={() => handleExport('monthly')}
              >
                <Download className="h-4 w-4" />
                <span>Monthly Donation Report</span>
              </Button>
              <Button 
                variant="outline" 
                className="text-[#2D3748] hover:bg-[#d35f5f]/10 flex items-center justify-center gap-2 h-16"
                onClick={() => handleExport('annual')}
              >
                <Download className="h-4 w-4" />
                <span>Annual Giving Statement</span>
              </Button>
              <Button 
                variant="outline" 
                className="text-[#2D3748] hover:bg-[#d35f5f]/10 flex items-center justify-center gap-2 h-16"
                onClick={() => handleExport('directory')}
              >
                <Download className="h-4 w-4" />
                <span>Member Directory</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              * Reports will be generated in CSV format for easy import into spreadsheet software.
            </p>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
};

export default Reports;
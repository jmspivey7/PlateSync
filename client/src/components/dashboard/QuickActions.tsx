import { useCallback } from "react";
import { Plus, UserPlus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";

const QuickActions = () => {
  const [_, setLocation] = useLocation();
  
  // Memoize the navigation handler to prevent rerenders
  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white"
            onClick={() => handleNavigate("/donations?new=true")}
          >
            <Plus className="h-5 w-5 mr-2" />
            Record New Donation
          </Button>
          
          <Button 
            className="bg-[#2D3748] hover:bg-[#2D3748]/90 text-white"
            onClick={() => handleNavigate("/members?new=true")}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add New Member
          </Button>
          
          <Button 
            className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
            onClick={() => handleNavigate("/settings")}
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            Manage Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;

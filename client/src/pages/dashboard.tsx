import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/dashboard/StatCard";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentDonations from "@/components/dashboard/RecentDonations";
import { CurrentCount } from "@/components/dashboard/CurrentCount";

const Dashboard = () => {
  const { user } = useAuth();
  
  // Fetch dashboard statistics
  const { data: stats, isLoading } = useQuery({
    queryKey: ['/api/dashboard/stats'],
  });
  
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold font-inter text-[#2D3748]">Dashboard</h2>
        <div className="flex space-x-2">
          <span className="text-sm text-gray-500">{format(new Date(), 'MMMM d, yyyy')}</span>
          <span className="text-sm text-gray-500">|</span>
          <span className="text-sm text-gray-500">{user?.churchName || "Your Church"}</span>
        </div>
      </div>
      
      {/* Dashboard Stats Cards */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Today's Donations"
            value={stats?.todaysDonations?.total || "0.00"}
            changeText="from last Sunday"
            changeValue={stats?.todaysDonations?.percentChange || 0}
            borderColor="border-[#4299E1]"
          />
          
          <StatCard
            title="Weekly Total"
            value={stats?.weeklyDonations?.total || "0.00"}
            changeText="from last week"
            changeValue={stats?.weeklyDonations?.percentChange || 0}
            borderColor="border-[#48BB78]"
          />
          
          <StatCard
            title="Monthly Total"
            value={stats?.monthlyDonations?.total || "0.00"}
            changeText="from last month"
            changeValue={stats?.monthlyDonations?.percentChange || 0}
            borderColor="border-yellow-500"
          />
          
          <StatCard
            title="Active Donors"
            value={stats?.activeDonors?.count?.toString() || "0"}
            changeText="this month"
            changeValue={stats?.activeDonors?.newCount || 0}
            borderColor="border-purple-500"
          />
        </div>
      )}
      
      {/* Dashboard Secondary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Left Column - Quick Actions */}
        <div className="lg:col-span-2">
          <QuickActions />
        </div>
        
        {/* Right Column - Current Count */}
        <div>
          <CurrentCount />
        </div>
      </div>
      
      {/* Recent Donations */}
      <RecentDonations />
    </div>
  );
};

export default Dashboard;

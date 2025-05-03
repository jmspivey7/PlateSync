import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";
import DonationForm from "@/components/donations/DonationForm";
import RecentDonations from "@/components/dashboard/RecentDonations";
import { useQuery } from "@tanstack/react-query";
import { DonationWithMember } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const Donations = () => {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  const [showForm, setShowForm] = useState(false);
  const [showDonationDetails, setShowDonationDetails] = useState(false);
  const [donationId, setDonationId] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // Extract query parameters
  useEffect(() => {
    const newParam = params.get("new");
    const idParam = params.get("id");
    const editParam = params.get("edit");
    
    if (newParam) {
      setShowForm(true);
      setShowDonationDetails(false);
      setDonationId(null);
      setIsEdit(false);
    } else if (idParam) {
      setDonationId(idParam);
      setShowDonationDetails(true);
      setShowForm(editParam === "true");
      setIsEdit(editParam === "true");
    } else {
      setShowForm(false);
      setShowDonationDetails(false);
    }
  }, [search, params]);
  
  // Fetch donation details if viewing a specific donation
  const { data: donation, isLoading: isLoadingDonation } = useQuery<DonationWithMember>({
    queryKey: ['/api/donations', donationId],
    enabled: !!donationId,
  });
  
  const handleNewDonation = () => {
    setLocation("/donations?new=true");
  };
  
  const handleBack = () => {
    setLocation("/donations");
  };
  
  const handleEditDonation = () => {
    if (donationId) {
      setLocation(`/donations?id=${donationId}&edit=true`);
    }
  };
  
  const formatDonationType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };
  
  const getNotificationBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800">Notified</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      case 'NOT_REQUIRED':
      default:
        return <Badge className="bg-gray-100 text-gray-800">Anonymous</Badge>;
    }
  };
  
  return (
    <div className="mb-8">
      {showForm ? (
        <DonationForm 
          donationId={donationId || undefined} 
          isEdit={isEdit} 
          onClose={handleBack}
        />
      ) : showDonationDetails && donation ? (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl font-bold text-[#2D3748]">
                Donation Details
              </CardTitle>
            </div>
            
            <Button 
              variant="outline" 
              className="text-[#4299E1]"
              onClick={handleEditDonation}
            >
              Edit Donation
            </Button>
          </CardHeader>
          
          <CardContent>
            {isLoadingDonation ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Donor</h3>
                    <p className="text-lg font-medium">
                      {donation.member 
                        ? `${donation.member.firstName} ${donation.member.lastName}` 
                        : "Anonymous/Visitor"
                      }
                    </p>
                    {donation.member?.email && (
                      <p className="text-sm text-gray-600">{donation.member.email}</p>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Amount</h3>
                    <p className="text-lg font-medium text-[#48BB78]">
                      ${parseFloat(donation.amount.toString()).toFixed(2)}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Date</h3>
                    <p className="text-lg">
                      {format(new Date(donation.date), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Type</h3>
                    <p className="text-lg">
                      {formatDonationType(donation.donationType)}
                      {donation.donationType === "CHECK" && donation.checkNumber && (
                        <span className="ml-2 text-sm text-gray-600">
                          (Check #{donation.checkNumber})
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Notification Status</h3>
                    <div className="mt-1">
                      {getNotificationBadge(donation.notificationStatus)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Recorded</h3>
                    <p className="text-sm text-gray-600">
                      {format(new Date(donation.createdAt), 'MMMM d, yyyy h:mm a')}
                    </p>
                  </div>
                </div>
                
                {donation.notes && (
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Notes</h3>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded border border-gray-200">
                      {donation.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-inter text-[#2D3748]">Donations</h2>
            <Button 
              className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white" 
              onClick={handleNewDonation}
            >
              <Plus className="h-5 w-5 mr-2" />
              Record New Donation
            </Button>
          </div>
          
          <RecentDonations />
        </>
      )}
    </div>
  );
};

export default Donations;

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Mail, Phone, DollarSign, Calendar } from "lucide-react";
import { Member, MemberWithDonations } from "@shared/schema";
import { format } from "date-fns";

interface MemberCardProps {
  member: Member;
}

const MemberCard = ({ member }: MemberCardProps) => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [showingDetails, setShowingDetails] = useState(false);
  
  // Fetch member details with donation history when needed
  const { data: memberWithDonations, isLoading } = useQuery<MemberWithDonations>({
    queryKey: ['/api/members', member.id.toString()],
    enabled: showingDetails,
  });
  
  const handleViewHistory = () => {
    setShowingDetails(true);
  };
  
  const handleEdit = () => {
    setLocation(`/members?id=${member.id}&edit=true`);
  };
  
  const handleAddDonation = () => {
    setLocation(`/donations?new=true&memberId=${member.id}`);
  };
  
  const formatDate = (date: string | Date) => {
    return format(new Date(date), 'MMM yyyy');
  };
  
  const formatCreatedAt = (createdAt: string | Date) => {
    // Format as "Member since Jan 2022"
    return `Member since ${formatDate(createdAt)}`;
  };
  
  return (
    <Card className="overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-[#2D3748]">
          {member.firstName} {member.lastName}
          {member.isVisitor && <span className="ml-2 text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full">Visitor</span>}
        </h3>
        <p className="text-sm text-gray-600">{formatCreatedAt(member.createdAt)}</p>
      </div>
      
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 gap-2">
          {member.email && (
            <div className="flex items-start">
              <Mail className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700 break-all">{member.email}</span>
            </div>
          )}
          
          {member.phone && (
            <div className="flex items-start">
              <Phone className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <span className="text-sm text-gray-700">{member.phone}</span>
            </div>
          )}
          
          {memberWithDonations?.lastDonation && (
            <div className="flex items-start mt-1">
              <DollarSign className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <span className="text-sm text-gray-700">
                  Last Donation: {format(new Date(memberWithDonations.lastDonation.date), 'MMM dd, yyyy')}
                </span>
                <span className="block text-sm font-medium text-[#2D3748]">
                  ${parseFloat(memberWithDonations.lastDonation.amount.toString()).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          
          {memberWithDonations?.totalDonations !== undefined && (
            <div className="flex items-start mt-1">
              <Calendar className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
              <div>
                <span className="text-sm text-gray-700">
                  Total Contributions: 
                </span>
                <span className="block text-sm font-medium text-[#2D3748]">
                  ${memberWithDonations.totalDonations.toFixed(2)} ({memberWithDonations.donations?.length || 0} donations)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-2">
        {!showingDetails ? (
          <Button variant="link" className="text-[#4299E1]" onClick={handleViewHistory}>
            View History
          </Button>
        ) : (
          <Button variant="link" className="text-[#4299E1]" onClick={handleAddDonation}>
            Add Donation
          </Button>
        )}
        <Button variant="link" className="text-gray-600" onClick={handleEdit}>
          Edit
        </Button>
      </div>
    </Card>
  );
};

export default MemberCard;

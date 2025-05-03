import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { UserPlus, ArrowLeft, Loader2 } from "lucide-react";
import MemberForm from "@/components/members/MemberForm";
import MembersList from "@/components/members/MembersList";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { MemberWithDonations } from "@shared/schema";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Members = () => {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  const [showForm, setShowForm] = useState(false);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isEdit, setIsEdit] = useState(false);
  
  // Extract query parameters
  useEffect(() => {
    const newParam = params.get("new");
    const idParam = params.get("id");
    const editParam = params.get("edit");
    
    if (newParam) {
      setShowForm(true);
      setShowMemberDetails(false);
      setMemberId(null);
      setIsEdit(false);
    } else if (idParam) {
      setMemberId(idParam);
      setShowMemberDetails(true);
      setShowForm(editParam === "true");
      setIsEdit(editParam === "true");
    } else {
      setShowForm(false);
      setShowMemberDetails(false);
    }
  }, [search, params]);
  
  // Fetch member details if viewing a specific member
  const { data: member, isLoading: isLoadingMember } = useQuery<MemberWithDonations>({
    queryKey: ['/api/members', memberId],
    enabled: !!memberId && showMemberDetails,
  });
  
  const handleAddMember = () => {
    setLocation("/members?new=true");
  };
  
  const handleBack = () => {
    setLocation("/members");
  };
  
  const handleEditMember = () => {
    if (memberId) {
      setLocation(`/members?id=${memberId}&edit=true`);
    }
  };
  
  const handleRecordDonation = () => {
    if (memberId) {
      setLocation(`/donations?new=true&memberId=${memberId}`);
    }
  };
  
  return (
    <div className="mb-8">
      {showForm ? (
        <MemberForm 
          memberId={memberId || undefined} 
          isEdit={isEdit} 
          onClose={handleBack}
        />
      ) : showMemberDetails && member ? (
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl font-bold text-[#2D3748]">
                Member Details
              </CardTitle>
            </div>
            
            <div className="flex space-x-2">
              <Button 
                variant="outline" 
                className="text-[#4299E1]"
                onClick={handleEditMember}
              >
                Edit Member
              </Button>
              <Button 
                className="bg-[#48BB78] hover:bg-[#48BB78]/90 text-white"
                onClick={handleRecordDonation}
              >
                Record Donation
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            {isLoadingMember ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Name</h3>
                    <p className="text-lg font-medium">
                      {member.firstName} {member.lastName}
                      {member.isVisitor && (
                        <Badge className="ml-2 bg-gray-100 text-gray-800">Visitor</Badge>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Member Since</h3>
                    <p className="text-lg">
                      {format(new Date(member.createdAt), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  
                  {member.email && (
                    <div>
                      <h3 className="font-medium text-gray-500 mb-1">Email</h3>
                      <p className="text-lg">{member.email}</p>
                    </div>
                  )}
                  
                  {member.phone && (
                    <div>
                      <h3 className="font-medium text-gray-500 mb-1">Phone</h3>
                      <p className="text-lg">{member.phone}</p>
                    </div>
                  )}
                  
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Total Donations</h3>
                    <p className="text-lg font-medium text-[#48BB78]">
                      ${member.totalDonations?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                  
                  {member.lastDonation && (
                    <div>
                      <h3 className="font-medium text-gray-500 mb-1">Latest Donation</h3>
                      <p className="text-lg">
                        ${parseFloat(member.lastDonation.amount.toString()).toFixed(2)} on {' '}
                        {format(new Date(member.lastDonation.date), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>
                
                {member.notes && (
                  <div>
                    <h3 className="font-medium text-gray-500 mb-1">Notes</h3>
                    <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded border border-gray-200">
                      {member.notes}
                    </p>
                  </div>
                )}
                
                {/* Donation History */}
                {member.donations && member.donations.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-[#2D3748] mb-4">Donation History</h3>
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>Check #</TableHead>
                              <TableHead>Notes</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {member.donations.map((donation) => (
                              <TableRow key={donation.id}>
                                <TableCell>{format(new Date(donation.date), 'MMM dd, yyyy')}</TableCell>
                                <TableCell>{donation.donationType.charAt(0).toUpperCase() + donation.donationType.slice(1).toLowerCase()}</TableCell>
                                <TableCell className="font-medium">
                                  ${parseFloat(donation.amount.toString()).toFixed(2)}
                                </TableCell>
                                <TableCell>{donation.checkNumber || "-"}</TableCell>
                                <TableCell className="truncate max-w-[200px]">{donation.notes || "-"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold font-inter text-[#2D3748]">Church Members</h2>
            <Button 
              className="bg-[#4299E1] hover:bg-[#4299E1]/90 text-white hidden md:flex"
              onClick={handleAddMember}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Add Member
            </Button>
          </div>
          
          <MembersList onAddMember={handleAddMember} />
        </>
      )}
    </div>
  );
};

export default Members;

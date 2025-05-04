import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import MemberForm from "@/components/members/MemberForm";
import MembersList from "@/components/members/MembersList";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { MemberWithDonations, Member } from "@shared/schema";
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
import PageLayout from "@/components/layout/PageLayout";

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
    queryKey: memberId ? [`/api/members/${memberId}`] : ['/api/members'],
    enabled: !!memberId,
  });
  
  const handleBack = () => {
    setLocation("/members");
  };
  
  const handleEditMember = () => {
    if (memberId) {
      setLocation(`/members?id=${memberId}&edit=true`);
    }
  };
  
  let content;
  if (showForm) {
    content = (
      <MemberForm 
        memberId={memberId || undefined} 
        isEdit={isEdit} 
        onClose={handleBack}
      />
    );
  } else if (showMemberDetails && member) {
    content = (
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
          
          <Button 
            variant="outline" 
            className="text-[#4299E1]"
            onClick={handleEditMember}
          >
            Edit Member
          </Button>
        </CardHeader>
        
        <CardContent>
          {isLoadingMember ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
            </div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Name</h3>
                  <p className="text-lg font-medium">
                    {member?.firstName} {member?.lastName}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Email</h3>
                  <p className="text-lg">
                    {member?.email || 'None provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Phone</h3>
                  <p className="text-lg">
                    {member?.phone || 'None provided'}
                  </p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Member Since</h3>
                  <p className="text-lg">
                    {member?.createdAt 
                      ? format(new Date(member.createdAt), 'MMMM d, yyyy') 
                      : 'Unknown'
                    }
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-500 mb-2">Donation History</h3>
                {member.donations && member.donations.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {member.donations.map((donation) => (
                          <TableRow key={donation.id}>
                            <TableCell>
                              {donation.date 
                                ? format(new Date(donation.date), 'MMM d, yyyy') 
                                : '-'
                              }
                            </TableCell>
                            <TableCell className="font-medium">
                              ${parseFloat(donation.amount.toString()).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              {donation.donationType || '-'}
                              {donation.donationType === 'CHECK' && donation.checkNumber && 
                                ` #${donation.checkNumber}`
                              }
                            </TableCell>
                            <TableCell>
                              {donation.notificationStatus === 'SENT' ? (
                                <Badge className="bg-green-100 text-green-800">Notified</Badge>
                              ) : donation.notificationStatus === 'PENDING' ? (
                                <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                              ) : donation.notificationStatus === 'FAILED' ? (
                                <Badge className="bg-red-100 text-red-800">Failed</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">
                                  {donation.notificationStatus || 'None'}
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-600 p-4 bg-gray-50 rounded border border-gray-200">
                    No donation history found for this member.
                  </p>
                )}
              </div>
              
              {member?.notes && (
                <div>
                  <h3 className="font-medium text-gray-500 mb-1">Notes</h3>
                  <p className="text-sm text-gray-600 p-3 bg-gray-50 rounded border border-gray-200">
                    {member.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <MembersList />
    );
  }
  
  // Fetch all members to get the count
  const { data: allMembers } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });
  
  const totalMembers = allMembers?.length || 0;
  
  return (
    <PageLayout 
      title={`Members (${totalMembers})`} 
      subtitle="Manage your church members and their information"
    >
      {content}
    </PageLayout>
  );
};

export default Members;
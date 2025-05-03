import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DonationWithMember } from "@shared/schema";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

const RecentDonations = () => {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  const { data: donations, isLoading, isError } = useQuery<DonationWithMember[]>({
    queryKey: ['/api/donations'],
  });
  
  // Use useEffect for side effects like showing toast messages
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "Failed to load recent donations",
        variant: "destructive",
      });
    }
  }, [isError, toast]);
  
  const formatDonationType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };
  
  const getNotificationBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Notified</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      case 'NOT_REQUIRED':
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Anonymous</Badge>;
    }
  };
  
  const handleViewDonation = (id: number) => {
    setLocation(`/donations?id=${id}`);
  };
  
  const handleEditDonation = (id: number) => {
    setLocation(`/donations?id=${id}&edit=true`);
  };
  
  const handleViewAll = () => {
    setLocation('/donations');
  };
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 border-b">
        <CardTitle className="text-lg">Recent Donations</CardTitle>
        <Button variant="link" className="text-[#4299E1]" onClick={handleViewAll}>
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Date</TableHead>
                    <TableHead>Donor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Check #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations && donations.slice(0, 5).map((donation) => (
                    <TableRow key={donation.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {format(new Date(donation.date), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>
                        {donation.member ? 
                          `${donation.member.firstName} ${donation.member.lastName}` : 
                          "Visitor"
                        }
                      </TableCell>
                      <TableCell>{formatDonationType(donation.donationType)}</TableCell>
                      <TableCell>{donation.checkNumber || "-"}</TableCell>
                      <TableCell className="font-medium">${parseFloat(donation.amount.toString()).toFixed(2)}</TableCell>
                      <TableCell>
                        {getNotificationBadge(donation.notificationStatus)}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          className="h-8 px-2 text-[#4299E1]"
                          onClick={() => handleViewDonation(donation.id)}
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          className="h-8 px-2 text-gray-500"
                          onClick={() => handleEditDonation(donation.id)}
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="px-6 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 text-sm text-gray-700">
                {donations && (
                  <p>
                    Showing <span className="font-medium">1</span> to <span className="font-medium">{Math.min(5, donations.length)}</span> of <span className="font-medium">{donations.length}</span> donations
                  </p>
                )}
              </div>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>1</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">2</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#">3</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext href="#" />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentDonations;

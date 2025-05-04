import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, UserPlus, Mail, Phone, Edit, FileEdit, Eye, DollarSign } from "lucide-react";
import { Member } from "@shared/schema";
import { format } from "date-fns";

interface MembersListProps {
  onAddMember: () => void;
}

const MembersList = ({ onAddMember }: MembersListProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("nameAsc");
  const [_, setLocation] = useLocation();
  
  // Fetch members data
  const { data: members, isLoading, isError } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });
  
  if (isError) {
    toast({
      title: "Error",
      description: "Failed to load members",
      variant: "destructive",
    });
  }
  
  // Filter and sort members
  const filteredMembers = members?.filter(member => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      (member.email && member.email.toLowerCase().includes(searchLower)) ||
      (member.phone && member.phone.toLowerCase().includes(searchLower))
    );
  }) || [];
  
  // Sort members based on the selected option
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortOption) {
      case "nameAsc":
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case "nameDesc":
        return `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
      default:
        return 0;
    }
  });
  
  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  className="pl-10"
                  placeholder="Search by name, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Select
                value={sortOption}
                onValueChange={setSortOption}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nameAsc">Name (A-Z)</SelectItem>
                  <SelectItem value="nameDesc">Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Member Button (Mobile) */}
      <div className="md:hidden">
        <Button 
          className="w-full bg-[#4299E1] hover:bg-[#4299E1]/90"
          onClick={onAddMember}
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Add Member
        </Button>
      </div>
      
      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
        </div>
      ) : sortedMembers.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 mb-4">No members found.</p>
          <Button 
            className="bg-[#69ad4c] hover:bg-[#5c9a42]"
            onClick={onAddMember}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add Your First Member
          </Button>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Member Since</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMembers.map((member) => {
                  const handleViewDetails = () => {
                    setLocation(`/members?id=${member.id}`);
                  };
                  
                  const handleEdit = () => {
                    setLocation(`/members?id=${member.id}&edit=true`);
                  };
                  
                  const handleAddDonation = () => {
                    setLocation(`/donations?new=true&memberId=${member.id}`);
                  };
                  
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="font-medium">
                          {member.lastName}, {member.firstName}
                        </div>
                        {member.isVisitor && (
                          <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                            Visitor
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {member.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">{member.email}</span>
                            </div>
                          )}
                          {member.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-4 w-4 text-gray-400 mr-2" />
                              <span className="text-gray-600">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {member.createdAt ? format(new Date(member.createdAt), 'MMM d, yyyy') : 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleViewDetails}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View Details</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleEdit}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <FileEdit className="h-4 w-4" />
                            <span className="sr-only">Edit Member</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={handleAddDonation} 
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <DollarSign className="h-4 w-4" />
                            <span className="sr-only">Add Donation</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {/* Add Member Button */}
          <div className="mt-4 hidden md:block">
            <Button 
              className="bg-[#69ad4c] hover:bg-[#5c9a42]"
              onClick={onAddMember}
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Add Member
            </Button>
          </div>
          
          {/* Pagination Controls */}
          <div className="mt-6">
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
    </div>
  );
};

export default MembersList;

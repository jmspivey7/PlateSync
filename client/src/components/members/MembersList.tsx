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

import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Mail, Phone } from "lucide-react";
import { Member } from "@shared/schema";
import { format } from "date-fns";

interface MembersListProps {}

const MembersList = ({}: MembersListProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("lastNameAsc");
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
      case "lastNameAsc":
        return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
      case "lastNameDesc":
        return b.lastName.localeCompare(a.lastName) || b.firstName.localeCompare(a.firstName);
      default:
        return a.lastName.localeCompare(b.lastName); // Default to last name ascending
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
                  <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                  <SelectItem value="lastNameDesc">Last Name (Z-A)</SelectItem>
                  <SelectItem value="nameAsc">First Name (A-Z)</SelectItem>
                  <SelectItem value="nameDesc">First Name (Z-A)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      

      
      {/* Members List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-[#4299E1]" />
        </div>
      ) : sortedMembers.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-gray-500 mb-4">No members found.</p>
          <p className="text-gray-400 text-sm">Members can only be added through CSV import in Settings.</p>
        </Card>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold">Cell Phone</TableHead>
                  <TableHead className="font-bold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedMembers.map((member) => (
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
                        {member.email ? (
                          <div className="flex items-center text-sm">
                            <Mail className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600">{member.email}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {member.phone ? (
                          <div className="flex items-center text-sm">
                            <Phone className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-gray-600">{member.phone}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          


        </>
      )}
    </div>
  );
};

export default MembersList;

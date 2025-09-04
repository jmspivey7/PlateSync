import { useState, useEffect } from "react";
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
import { Loader2, Search, Mail, Phone, Trash2, AlertTriangle } from "lucide-react";
import { Member } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MembersListProps {}

const MembersList = ({}: MembersListProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("lastNameAsc");
  const [_, setLocation] = useLocation();
  
  // Enhanced deletion state management
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);
  const [showEnhancedWarning, setShowEnhancedWarning] = useState(false);
  const [memberInvolvement, setMemberInvolvement] = useState<{
    hasInvolvement: boolean;
    openCounts: string[];
    finalizedCounts: string[];
    totalDonations: number;
  } | null>(null);
  
  // Fetch members data
  const { data: members, isLoading, isError } = useQuery<Member[]>({
    queryKey: ['/api/members'],
  });

  // Check member involvement mutation
  const checkInvolvementMutation = useMutation({
    mutationKey: ['check-member-involvement'],
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/members/${memberId}/involvement`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to check member involvement');
      }
      
      return response.json();
    },
  });

  // Delete member mutation with force option
  const deleteMemberMutation = useMutation({
    mutationKey: ['delete-member'],
    mutationFn: async ({ memberId, forceDelete = false }: { memberId: number; forceDelete?: boolean }) => {
      console.log(`🔥 FRONTEND: Attempting to delete member ${memberId} using POST /api/members/${memberId}/remove, force: ${forceDelete}`);
      const response = await fetch(`/api/members/${memberId}/remove`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceDelete }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete member failed:', response.status, errorText);
        throw new Error(`Failed to delete member: ${response.status} ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      setMemberToDelete(null);
      setShowEnhancedWarning(false);
      setMemberInvolvement(null);
      toast({
        title: "Success",
        description: "Member deleted successfully.",
        className: "bg-[#d35f5f] text-white",
      });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
      toast({
        title: "Error",
        description: `Failed to delete member: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  // Handler for first delete click - checks if member can be deleted
  const handleDeleteClick = async (member: Member) => {
    console.log('🔥 FRONTEND: Delete click for member:', member.id, member.firstName, member.lastName);
    setMemberToDelete(member);
    
    try {
      console.log('🔥 FRONTEND: Checking if member can be deleted:', member.id);
      const response = await fetch(`/api/members/${member.id}/can-delete`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const canDeleteData = await response.json();
        console.log('🔥 FRONTEND: Can delete data:', canDeleteData);
        
        if (!canDeleteData.canDelete) {
          console.log('🔥 FRONTEND: Member cannot be deleted, showing enhanced warning');
          // Create involvement data format for the dialog
          const involvementData = {
            hasInvolvement: true,
            openCounts: canDeleteData.openCounts,
            finalizedCounts: [],
            totalDonations: canDeleteData.openCounts.length
          };
          setMemberInvolvement(involvementData);
          setShowEnhancedWarning(true);
        } else {
          console.log('🔥 FRONTEND: Member can be deleted, proceeding with deletion');
          // Safe to delete, proceed with normal deletion
          deleteMemberMutation.mutate({ memberId: member.id, forceDelete: false });
        }
      } else {
        console.error('Failed to check if member can be deleted, response:', response.status);
        setMemberInvolvement(null);
        // If check fails, show a simple confirmation dialog
        setShowEnhancedWarning(true);
      }
    } catch (error) {
      console.error('Error checking if member can be deleted:', error);
      // If check fails, show a simple confirmation dialog
      setMemberInvolvement(null);
      setShowEnhancedWarning(true);
    }
  };

  // Handler for force delete (from enhanced warning dialog)
  const handleForceDelete = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate({ memberId: memberToDelete.id, forceDelete: true });
    }
  };

  // Handler for normal delete (from basic warning dialog)
  const handleNormalDelete = () => {
    if (memberToDelete) {
      deleteMemberMutation.mutate({ memberId: memberToDelete.id, forceDelete: false });
    }
  };
  
  // Handle error in useEffect to prevent infinite re-renders
  useEffect(() => {
    if (isError) {
      toast({
        title: "Error",
        description: "Failed to load members",
        variant: "destructive",
      });
    }
  }, [isError, toast]);
  
  // Check if members is an array before filtering
  const isValidMembersArray = Array.isArray(members);
  
  // Filter members if it's a valid array, otherwise use empty array
  const filteredMembers = isValidMembersArray 
    ? members.filter(member => {
        const searchLower = searchQuery.toLowerCase();
        return (
          member.firstName.toLowerCase().includes(searchLower) ||
          member.lastName.toLowerCase().includes(searchLower) ||
          (member.email && member.email.toLowerCase().includes(searchLower)) ||
          (member.phone && member.phone.toLowerCase().includes(searchLower))
        );
      }) 
    : [];
  
  // Sort members based on the selected option
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortOption) {
      case "lastNameAsc":
        return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
      case "firstNameAsc":
        return a.firstName.localeCompare(b.firstName) || a.lastName.localeCompare(b.lastName);
      case "emailAsc":
        const emailA = a.email || '';
        const emailB = b.email || '';
        return emailA.localeCompare(emailB);
      case "createdFromAsc":
        // Sort by "Added" first (no externalSystem), then "Import" (has externalSystem)
        const aHasExternal = !!a.externalSystem;
        const bHasExternal = !!b.externalSystem;
        if (aHasExternal !== bHasExternal) {
          return aHasExternal ? 1 : -1; // Added (false) comes before Import (true)
        }
        // If same type, sort by last name
        return a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
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
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastNameAsc">Last Name (A-Z)</SelectItem>
                  <SelectItem value="firstNameAsc">First Name (A-Z)</SelectItem>
                  <SelectItem value="emailAsc">Email</SelectItem>
                  <SelectItem value="createdFromAsc">Created From</SelectItem>
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
                  <TableHead className="font-bold text-center">Created From</TableHead>
                  <TableHead className="font-bold w-24">Actions</TableHead>
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
                      <TableCell className="text-center">
                        {member.externalSystem ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Import
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Added
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteMemberMutation.isPending}
                          onClick={() => {
                            console.log('🔥 BUTTON CLICKED - NEW VERSION');
                            handleDeleteClick(member);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Enhanced Warning Dialog for members with donations */}
          <Dialog open={showEnhancedWarning} onOpenChange={setShowEnhancedWarning}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  Warning: Member Has Active Donations
                </DialogTitle>
                <DialogDescription className="text-base pt-2">
                  {memberToDelete && memberInvolvement && (
                    <div className="space-y-4">
                      <p>
                        <strong>{memberToDelete.firstName} {memberToDelete.lastName}</strong> has donations 
                        in active counts. Deleting this member will affect the following:
                      </p>
                      
                      {memberInvolvement.openCounts.length > 0 && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <h4 className="font-medium text-red-800 mb-2">Open Counts ({memberInvolvement.openCounts.length})</h4>
                          <ul className="list-disc list-inside text-red-700 space-y-1">
                            {memberInvolvement.openCounts.map((countName, index) => (
                              <li key={index}>{countName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {memberInvolvement.finalizedCounts.length > 0 && (
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-800 mb-2">Finalized Counts ({memberInvolvement.finalizedCounts.length})</h4>
                          <ul className="list-disc list-inside text-yellow-700 space-y-1">
                            {memberInvolvement.finalizedCounts.map((countName, index) => (
                              <li key={index}>{countName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-800 mb-2">What happens when you delete:</h4>
                        <ul className="list-disc list-inside text-blue-700 space-y-1">
                          <li>The member will be marked as "(Deleted)" in donation records</li>
                          <li>All existing donation data will be preserved</li>
                          <li>The member will be removed from your member list</li>
                          <li>This action cannot be undone</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEnhancedWarning(false);
                    setMemberToDelete(null);
                    setMemberInvolvement(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 text-white hover:bg-red-700"
                  onClick={handleForceDelete}
                  disabled={deleteMemberMutation.isPending}
                >
                  {deleteMemberMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete Member"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </>
      )}

    </div>
  );
};

export default MembersList;

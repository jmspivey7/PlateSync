import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, X, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Member {
  id: number;
  firstName: string | null;
  lastName: string | null;
}

interface MemberSearchSelectProps {
  members: Member[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function MemberSearchSelect({ members, value, onValueChange, placeholder = "Search members..." }: MemberSearchSelectProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [newMemberData, setNewMemberData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: ""
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation for adding new member
  const addMemberMutation = useMutation({
    mutationFn: async (memberData: { firstName: string; lastName: string; email?: string; phone?: string }) => {
      const response = await fetch("/api/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberData),
        credentials: "include"
      });
      if (!response.ok) throw new Error("Failed to add member");
      return await response.json();
    },
    onSuccess: (newMember) => {
      // Invalidate members query to refresh the list
      queryClient.invalidateQueries({ queryKey: ['/api/members'] });
      
      // Auto-select the newly created member
      onValueChange(newMember.id.toString());
      
      // Close dialog and reset form
      setShowAddMemberDialog(false);
      setNewMemberData({ firstName: "", lastName: "", email: "", phone: "" });
      
      toast({
        title: "Member Added",
        description: `${newMember.firstName} ${newMember.lastName} has been added successfully.`,
        className: 'bg-[#48BB78] text-white',
      });
    },
    onError: (error) => {
      toast({
        title: "Error Adding Member",
        description: error instanceof Error ? error.message : "Failed to add member",
        variant: "destructive",
      });
    }
  });

  // Find selected member when value changes
  useEffect(() => {
    if (value) {
      const member = members.find(m => m.id.toString() === value);
      if (member) {
        setSelectedMember(member);
        setSearchTerm(`${member.firstName || ''} ${member.lastName || ''}`.trim());
      }
    } else {
      setSelectedMember(null);
      setSearchTerm("");
    }
  }, [value, members]);

  // Filter members based on search
  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower) || 
           (member.firstName && member.firstName.toLowerCase().startsWith(searchLower)) ||
           (member.lastName && member.lastName.toLowerCase().startsWith(searchLower));
  }).slice(0, 50); // Limit to 50 results

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);

    // Clear selection if user types something different
    if (selectedMember && newValue !== `${selectedMember.firstName || ''} ${selectedMember.lastName || ''}`.trim()) {
      setSelectedMember(null);
      onValueChange("");
    }
  };

  const handleMemberSelect = (member: Member) => {
    setSelectedMember(member);
    setSearchTerm(`${member.firstName || ''} ${member.lastName || ''}`.trim());
    onValueChange(member.id.toString());
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedMember(null);
    setSearchTerm("");
    onValueChange("");
    inputRef.current?.focus();
  };

  const handleInputFocus = () => {
    if (!selectedMember) {
      setIsOpen(true);
    }
  };

  const handleAddMember = () => {
    setShowAddMemberDialog(true);
  };

  const handleSaveMember = () => {
    if (!newMemberData.firstName.trim() || !newMemberData.lastName.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "First name and last name are required.",
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate({
      firstName: newMemberData.firstName.trim(),
      lastName: newMemberData.lastName.trim(),
      email: newMemberData.email.trim() || undefined,
      phone: newMemberData.phone.trim() || undefined,
    });
  };

  const handleDialogClose = () => {
    setShowAddMemberDialog(false);
    setNewMemberData({ firstName: "", lastName: "", email: "", phone: "" });
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={handleInputFocus}
            placeholder={selectedMember ? "Member selected" : placeholder}
            className={`w-full pr-20 ${selectedMember ? 'bg-green-50 border-green-200 text-green-800' : ''}`}
            readOnly={!!selectedMember}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
            {selectedMember ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-8 w-8 p-0 hover:bg-red-100"
              >
                <X className="h-4 w-4 text-red-500" />
              </Button>
            ) : (
              <Search className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddMember}
          className="shrink-0 h-10 px-3"
          title="Add new member"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      {isOpen && !selectedMember && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredMembers.length > 0 ? (
            <>
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center space-x-2"
                  onClick={() => handleMemberSelect(member)}
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {`${member.firstName || ''} ${member.lastName || ''}`.trim()}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No members found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={setShowAddMemberDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
            <DialogDescription>
              Add a new member to your church directory. First name and last name are required.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={newMemberData.firstName}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={newMemberData.lastName}
                  onChange={(e) => setNewMemberData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newMemberData.email}
                onChange={(e) => setNewMemberData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Mobile Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={newMemberData.phone}
                onChange={(e) => setNewMemberData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter mobile phone number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveMember} 
              disabled={addMemberMutation.isPending}
              className="bg-[#4299E1] hover:bg-[#3182CE]"
            >
              {addMemberMutation.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
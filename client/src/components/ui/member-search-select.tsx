import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, X } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    setIsOpen(true);
    
    // Clear selection if user is typing
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

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
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

      {isOpen && !selectedMember && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredMembers.length > 0 ? (
            <>
              {filteredMembers.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => handleMemberSelect(member)}
                  className="w-full flex items-center px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  <User className="h-4 w-4 text-gray-400 mr-3 flex-shrink-0" />
                  <span className="truncate">
                    {member.firstName || ''} {member.lastName || ''}
                  </span>
                </button>
              ))}
              {members.length > 50 && filteredMembers.length === 50 && (
                <div className="px-3 py-2 text-sm text-gray-500 border-t bg-gray-50">
                  Showing first 50 results. Type more to narrow search.
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No members found matching "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
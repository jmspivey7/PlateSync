import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Option {
  value: string;
  label: string;
}

interface ComboboxSearchProps {
  options: Option[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ComboboxSearch({
  options,
  value,
  onValueChange,
  placeholder = "Type to search for members...",
  className = "",
}: ComboboxSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const [showSelected, setShowSelected] = useState(false);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update display when value changes
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearch(selectedOption.label);
        setShowSelected(true);
      }
    } else {
      setSearch('');
      setShowSelected(false);
    }
  }, [value, options]);
  
  // Filter options when search changes
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOptions([]);
      setIsOpen(false);
      return;
    }
    
    // Enhanced search: match on first name, last name, or full name
    const searchTerm = search.toLowerCase().trim();
    const filtered = options.filter(option => {
      const label = option.label.toLowerCase();
      const nameParts = label.split(' ');
      
      return (
        label.includes(searchTerm) || // Full name match
        nameParts.some(part => part.startsWith(searchTerm)) || // Any name part starts with search
        nameParts.join('').includes(searchTerm.replace(/\s+/g, '')) // Remove spaces for partial matches
      );
    });
    
    // Sort results: exact matches first, then starts-with matches, then contains matches
    const sortedFiltered = filtered.sort((a, b) => {
      const aLabel = a.label.toLowerCase();
      const bLabel = b.label.toLowerCase();
      
      // Exact match priority
      if (aLabel === searchTerm) return -1;
      if (bLabel === searchTerm) return 1;
      
      // Starts with priority
      if (aLabel.startsWith(searchTerm) && !bLabel.startsWith(searchTerm)) return -1;
      if (bLabel.startsWith(searchTerm) && !aLabel.startsWith(searchTerm)) return 1;
      
      // Name parts start with priority
      const aNameParts = aLabel.split(' ');
      const bNameParts = bLabel.split(' ');
      const aStartsWith = aNameParts.some(part => part.startsWith(searchTerm));
      const bStartsWith = bNameParts.some(part => part.startsWith(searchTerm));
      
      if (aStartsWith && !bStartsWith) return -1;
      if (bStartsWith && !aStartsWith) return 1;
      
      // Alphabetical as tiebreaker
      return aLabel.localeCompare(bLabel);
    });
    
    setFilteredOptions(sortedFiltered);
    
    // Show dropdown if we have search text and matches, but not if showing selected
    if (search.trim() !== '' && sortedFiltered.length > 0 && !showSelected) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [search, options, showSelected]);
  
  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setShowSelected(false); // Allow searching again when user types
    
    // Clear the selected value when input is cleared
    if (newValue.trim() === '') {
      onValueChange('');
    }
  };
  
  const handleOptionSelect = (option: Option) => {
    setSearch(option.label);
    setShowSelected(true);
    onValueChange(option.value);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    // If a member is selected, allow user to clear and search again
    if (showSelected) {
      setSearch('');
      setShowSelected(false);
      onValueChange('');
    } else if (search.trim() !== '' && filteredOptions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleClearSelection = () => {
    setSearch('');
    setShowSelected(false);
    onValueChange('');
    inputRef.current?.focus();
  };
  
  return (
    <div ref={comboboxRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={search}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={showSelected ? "Click to change member..." : placeholder}
          className={`w-full bg-white pr-16 ${showSelected ? 'text-red-700 font-medium' : ''}`}
          readOnly={showSelected}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {showSelected ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-red-50"
              onClick={handleClearSelection}
            >
              <X className="h-4 w-4 text-red-500" />
            </Button>
          ) : (
            <Search className="h-4 w-4 text-gray-400 pointer-events-none" />
          )}
        </div>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200">
          {filteredOptions.slice(0, 50).map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full text-left cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-red-50 focus:outline-none focus:bg-red-50 ${
                option.value === value ? 'bg-red-50' : ''
              }`}
              onClick={() => handleOptionSelect(option)}
            >
              <User className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
              <span className={`truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                {option.label}
              </span>
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <Check className="h-5 w-5 text-red-600" />
                </span>
              )}
            </button>
          ))}
          {filteredOptions.length > 50 && (
            <div className="px-3 py-2 text-sm text-gray-500 border-t">
              Showing first 50 results. Type more to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
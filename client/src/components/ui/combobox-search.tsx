import React, { useState, useEffect, useRef } from "react";
import { User, Check, Search } from "lucide-react";
import { Input } from "./input";

interface Option {
  value: string;
  label: string;
}

interface ComboboxSearchProps {
  options: Option[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function ComboboxSearch({
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  className = "",
}: ComboboxSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const comboboxRef = useRef<HTMLDivElement>(null);
  
  // Update search display when value changes (for initial load)
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearch(selectedOption.label);
      }
    }
  }, [value, options]);
  
  // Filter options when search changes
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOptions([]);
      return;
    }
    
    const filtered = options.filter(option => 
      option.label.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredOptions(filtered);
    
    // Only show dropdown if we have search text and matches
    if (search.trim() !== '') {
      setIsOpen(true);
    }
  }, [search, options]);
  
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
    setSearch(e.target.value);
    
    // Close dropdown if input is empty
    if (e.target.value.trim() === '') {
      setIsOpen(false);
    }
  };
  
  const handleOptionClick = (option: Option) => {
    setSearch(option.label);
    onValueChange(option.value);
    setIsOpen(false);
  };
  
  return (
    <div ref={comboboxRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <Input
          type="text"
          value={search}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="w-full"
          onFocus={() => search.trim() !== '' && setIsOpen(true)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm border border-gray-200">
          <div className="overflow-y-auto max-h-60">
            {filteredOptions.map((option) => (
              <div
                key={option.value}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-blue-50 ${
                  option.value === value ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <User className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
                <span className={`truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                  {option.label}
                </span>
                {option.value === value && (
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                    <Check className="h-5 w-5 text-blue-600" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
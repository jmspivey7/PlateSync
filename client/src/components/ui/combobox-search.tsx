import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Check } from "lucide-react";

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
  placeholder = "Search...",
  className = "",
}: ComboboxSearchProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState<Option[]>([]);
  const comboboxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update search when value changes
  useEffect(() => {
    if (value) {
      const selectedOption = options.find(option => option.value === value);
      if (selectedOption) {
        setSearch(selectedOption.label);
      }
    } else {
      setSearch('');
    }
  }, [value, options]);
  
  // Filter options when search changes
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredOptions([]);
      setIsOpen(false);
      return;
    }
    
    const filtered = options.filter(option => 
      option.label.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredOptions(filtered);
    
    // Show dropdown if we have search text and matches
    if (search.trim() !== '' && filtered.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
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
    const newValue = e.target.value;
    setSearch(newValue);
    
    // Clear the selected value when input is cleared
    if (newValue.trim() === '') {
      onValueChange('');
    }
  };
  
  const handleOptionSelect = (option: Option) => {
    setSearch(option.label);
    onValueChange(option.value);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleInputFocus = () => {
    if (search.trim() !== '' && filteredOptions.length > 0) {
      setIsOpen(true);
    }
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
          placeholder={placeholder}
          className="w-full bg-white pr-10"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto border border-gray-200">
          {filteredOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`w-full text-left cursor-pointer select-none relative py-2 pl-3 pr-9 flex items-center hover:bg-green-50 focus:outline-none focus:bg-green-50 ${
                option.value === value ? 'bg-green-50' : ''
              }`}
              onClick={() => handleOptionSelect(option)}
            >
              <User className="flex-shrink-0 h-5 w-5 text-gray-400 mr-3" />
              <span className={`truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                {option.label}
              </span>
              {option.value === value && (
                <span className="absolute inset-y-0 right-0 flex items-center pr-4">
                  <Check className="h-5 w-5 text-green-600" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
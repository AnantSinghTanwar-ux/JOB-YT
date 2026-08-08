import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TagAutocompleteProps {
  label?: string;
  placeholder?: string;
  suggestions: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  helperText?: string;
}

export function TagAutocomplete({
  label,
  placeholder,
  suggestions,
  selectedTags,
  onChange,
  helperText,
}: TagAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      s.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedTags.includes(s)
  ).slice(0, 50);

  useEffect(() => {
    setSelectedIndex(0);
  }, [inputValue]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (isOpen && filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[selectedIndex] || inputValue.trim());
      } else {
        addTag(inputValue.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      onChange([...selectedTags, tag]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const removeTag = (tagToRemove: string) => {
    onChange(selectedTags.filter((t) => t !== tagToRemove));
  };

  return (
    <div className="w-full relative" ref={containerRef}>
      {label && <label className="text-sm font-bold text-[#0b1120] block mb-2">{label}</label>}
      <div className="min-h-[50px] w-full rounded-xl border-2 border-slate-100 bg-white/50 px-2 py-2 flex flex-wrap gap-2 items-center focus-within:border-[#0b1120] transition-colors relative">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-[#c3ff3d] text-[#0b1120] px-3 py-1 rounded-md text-xs font-bold"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:bg-black/10 rounded-full w-4 h-4 flex items-center justify-center transition-colors"
            >
              &times;
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-slate-400"
          placeholder={selectedTags.length === 0 ? placeholder : ''}
        />
      </div>
      
      {helperText && <p className="text-xs text-slate-400 font-medium mt-2">{helperText}</p>}

      {isOpen && inputValue.length >= 2 && filteredSuggestions.length > 0 && (
        <div className="absolute top-[calc(100%-1.5rem)] left-0 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl shadow-black/5 max-h-60 overflow-y-auto z-50 custom-scrollbar p-2">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => addTag(suggestion)}
              className={`w-full text-left px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                index === selectedIndex 
                  ? 'bg-slate-100 text-[#0b1120]' 
                  : 'text-[#0b1120] hover:bg-slate-50'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

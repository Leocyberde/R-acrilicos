import { useState, useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export default function SearchAutocomplete({ value, onChange, suggestions = [], placeholder = "Buscar..." }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const containerRef = useRef(null);

  const filtered = suggestions.filter(s =>
    s && s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  );

  const showDropdown = focused && value.length > 0 && filtered.length > 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setFocused(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (name) => {
    onChange(name);
    setFocused(false);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
      <input
        type="text"
        className="w-full h-9 pl-9 pr-8 rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        autoComplete="off"
      />
      {value && (
        <button
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          onClick={() => { onChange(""); setFocused(false); }}
          tabIndex={-1}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((name, i) => (
            <button
              key={i}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(name); }}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

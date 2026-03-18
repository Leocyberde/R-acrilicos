import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Search, X } from "lucide-react";

export default function ClientSearchInput({ value, onChange, records = [], placeholder = "Buscar por cliente..." }) {
  const [suggestions, setSuggestions] = useState([]);
  const [allClients, setAllClients] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await base44.entities.Client.list("-created_date", 500);
        const fromClients = (data || []).map(c => c.full_name || c.company_name || c.name).filter(Boolean);
        const fromRecords = (records || []).map(r => r.client_name).filter(Boolean);
        const merged = Array.from(new Set([...fromClients, ...fromRecords])).sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );
        setAllClients(merged);
      } catch {
        const fromRecords = (records || []).map(r => r.client_name).filter(Boolean);
        const merged = Array.from(new Set(fromRecords)).sort((a, b) =>
          a.localeCompare(b, "pt-BR", { sensitivity: "base" })
        );
        setAllClients(merged);
      }
    }
    loadClients();
  }, []);

  useEffect(() => {
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    const q = value.toLowerCase();
    const matches = allClients.filter(name => name.toLowerCase().includes(q));
    setSuggestions(matches.slice(0, 8));
  }, [value, allClients]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
  };

  const handleClear = () => {
    onChange("");
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { if (value.trim()) setOpen(true); }}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pl-9 pr-8"
        autoComplete="off"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-56 overflow-y-auto">
          {suggestions.map((name, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
              onMouseDown={() => handleSelect(name)}
            >
              <Search className="h-3 w-3 text-slate-400 shrink-0" />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

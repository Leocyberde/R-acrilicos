import { useState, useEffect, useRef } from "react";
import { localClient } from "@/api/localClient";
import { Search, X, User, ChevronDown } from "lucide-react";

export default function ClientSearchInput({
  value,
  onChange,
  onClientSelect,
  placeholder = "Digite ou selecione um cliente...",
  error = false,
}) {
  const [allClients, setAllClients] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    async function loadClients() {
      try {
        const data = await localClient.entities.Client.list();
        setAllClients(data || []);
      } catch {
        setAllClients([]);
      }
    }
    loadClients();
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = (value || "").toLowerCase().trim();
    if (!q) {
      setSuggestions(allClients);
    } else {
      const matches = allClients.filter(c =>
        (c.name || "").toLowerCase().includes(q)
      );
      setSuggestions(matches);
    }
  }, [value, allClients, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (client) => {
    onChange(client.name || "");
    if (onClientSelect) onClientSelect(client);
    setOpen(false);
  };

  const handleClear = () => {
    onChange("");
    if (onClientSelect) onClientSelect(null);
    setSuggestions(allClients);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleFocus = () => {
    setOpen(true);
  };

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
      <input
        ref={inputRef}
        type="text"
        value={value || ""}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        autoComplete="off"
        className={`flex h-9 w-full rounded-md border bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 pl-9 pr-8 ${
          error
            ? "border-red-500 focus-visible:ring-red-400"
            : "border-input focus-visible:ring-ring"
        }`}
      />
      {value ? (
        <button
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 z-10"
          type="button"
          tabIndex={-1}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
      )}

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-slate-400">
              {allClients.length === 0 ? "Nenhum cliente cadastrado" : "Nenhum cliente encontrado"}
            </div>
          ) : (
            suggestions.map((client) => (
              <button
                key={client.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors"
                onMouseDown={() => handleSelect(client)}
              >
                <div className="h-6 w-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-3 w-3 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{client.name}</p>
                  {client.phone && (
                    <p className="text-xs text-slate-400 truncate">{client.phone}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

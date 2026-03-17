import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter } from "lucide-react";

const statusOptions = [
  { value: "all", label: "Todos os Status" },
  { value: "pendente", label: "Pendente" },
  { value: "parcial", label: "Parcialmente Pago" },
  { value: "pago", label: "Pago" },
];

export default function AccountsFilters({ statusFilter, setStatusFilter }) {
  return (
    <div className="flex gap-3">
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-40">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {statusOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
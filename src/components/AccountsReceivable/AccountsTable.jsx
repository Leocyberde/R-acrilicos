import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MoreVertical, Edit2, Trash2 } from "lucide-react";

const statusConfig = {
  pendente: { label: "Pendente", className: "bg-orange-100 text-orange-800" },
  parcial: { label: "Parcialmente Pago", className: "bg-blue-100 text-blue-800" },
  pago: { label: "Pago", className: "bg-green-100 text-green-800" },
};

export default function AccountsTable({ accounts, onEdit, onDelete, getStatus }) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-slate-500 text-lg">Nenhum recebimento encontrado</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50">
          <TableHead className="font-semibold">Cliente</TableHead>
          <TableHead className="font-semibold">Descrição</TableHead>
          <TableHead className="font-semibold text-right">Valor</TableHead>
          <TableHead className="font-semibold">Data</TableHead>
          <TableHead className="font-semibold">Vencimento</TableHead>
          <TableHead className="font-semibold">Status</TableHead>
          <TableHead className="font-semibold text-center">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {accounts.map(account => {
          const status = getStatus(account);
          const dueDate = account.installments?.[0]?.due_date || account.created_date;
          
          return (
            <TableRow key={account.id} className="hover:bg-slate-50">
              <TableCell className="font-medium">{account.client_name}</TableCell>
              <TableCell className="text-slate-600">{account.description}</TableCell>
              <TableCell className="text-right font-semibold">
                {(account.total_amount || 0).toLocaleString("pt-BR", { 
                  style: "currency", 
                  currency: "BRL" 
                })}
              </TableCell>
              <TableCell className="text-slate-600">
                {format(new Date(account.created_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell className="text-slate-600">
                {format(new Date(dueDate), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                <Badge className={statusConfig[status].className}>
                  {statusConfig[status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(account)} className="gap-2 cursor-pointer">
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(account.id)}
                      className="gap-2 cursor-pointer text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
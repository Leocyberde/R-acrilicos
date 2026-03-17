import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import AccountsTable from "@/components/AccountsReceivable/AccountsTable";
import AccountsFilters from "@/components/AccountsReceivable/AccountsFilters";
import AccountsStats from "@/components/AccountsReceivable/AccountsStats";
import AccountsDialog from "@/components/AccountsReceivable/AccountsDialog";

export default function AccountsReceivable() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  useEffect(() => {
    loadAccounts();
    const unsubscribe = base44.entities.Receipt.subscribe((event) => {
      loadAccounts();
    });
    return unsubscribe;
  }, []);

  async function loadAccounts() {
    try {
      const data = await base44.entities.Receipt.list("-created_date", 500);
      setAccounts(data);
    } finally {
      setLoading(false);
    }
  }

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || getAccountStatus(account) === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function getAccountStatus(account) {
    if (!account.installments || account.installments.length === 0) return "pendente";
    
    const allPaid = account.installments.every(i => i.status === "pago");
    const somePaid = account.installments.some(i => i.status === "pago");
    
    if (allPaid) return "pago";
    if (somePaid) return "parcial";
    return "pendente";
  }

  const stats = {
    total: accounts.reduce((sum, a) => sum + (a.total_amount || 0), 0),
    paid: accounts
      .filter(a => getAccountStatus(a) === "pago")
      .reduce((sum, a) => sum + (a.total_amount || 0), 0),
    pending: accounts
      .filter(a => getAccountStatus(a) === "pendente")
      .reduce((sum, a) => sum + (a.total_amount || 0), 0),
    partial: accounts
      .filter(a => getAccountStatus(a) === "parcial")
      .reduce((sum, a) => sum + (a.total_amount || 0), 0),
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (confirm("Tem certeza que deseja deletar este recebimento?")) {
      await base44.entities.Receipt.delete(id);
      loadAccounts();
    }
  };

  const handleSave = async () => {
    loadAccounts();
    setShowDialog(false);
    setEditingAccount(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contas a Receber</h1>
          <p className="text-slate-600 mt-1">Gerencie todos os recebimentos pendentes</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Recebimento
        </Button>
      </div>

      {/* Stats */}
      <AccountsStats stats={stats} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar cliente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <AccountsFilters statusFilter={statusFilter} setStatusFilter={setStatusFilter} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <AccountsTable 
            accounts={filteredAccounts} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            getStatus={getAccountStatus}
          />
        </CardContent>
      </Card>

      {/* Dialog */}
      <AccountsDialog 
        open={showDialog}
        onOpenChange={setShowDialog}
        account={editingAccount}
        onSave={handleSave}
      />
    </div>
  );
}
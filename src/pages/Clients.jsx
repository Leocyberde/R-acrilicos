import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Users } from "lucide-react";
import ExportTabs from "@/components/ExportTabs";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const data = await base44.entities.Client.list("-created_date", 500);
    setClients(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredClients = clients.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Clientes</h1>
          <p className="text-slate-500 mt-0.5">Cadastro e gestão de clientes</p>
        </div>
        <div className="flex gap-2">
          <ExportTabs 
            data={clients}
            filename="relatorio_clientes"
            columns={[
              { key: "name", label: "Nome" },
              { key: "phone", label: "Telefone" },
              { key: "email", label: "Email" },
              { key: "cpf_cnpj", label: "CPF/CNPJ" },
              { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
            ]}
          />
          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => navigate(createPageUrl("ClientCreate"))}>
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar cliente..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Clientes Cadastrados ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredClients.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhum cliente encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Nome</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Telefone</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">CPF/CNPJ</th>
                    <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Arquivos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredClients.map(client => (
                    <tr key={client.id} className="hover:bg-slate-50/50 cursor-pointer transition-colors" onClick={() => navigate(createPageUrl("ClientDetail") + `?id=${client.id}`)}>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-slate-800">{client.name}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-600">{client.phone || "-"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-600">{client.email || "-"}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-600">{client.cpf_cnpj || "-"}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className="text-sm text-slate-600">{client.registration_files?.length || 0}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
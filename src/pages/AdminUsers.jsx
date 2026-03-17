import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Edit, Key, Trash2, ShieldCheck, Users, UserCircle, ChevronDown, ChevronRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import ModulePermissions from "@/components/ModulePermissions";
import ExportTabs from "@/components/ExportTabs";

const modules = [
  { id: 'budgets', label: 'Orçamentos' },
  { id: 'work_orders', label: 'Ordens de Serviço' },
  { id: 'receipts', label: 'Recibos' },
  { id: 'financial', label: 'Financeiro' },
  { id: 'production', label: 'Produção' },
  { id: 'accounts_receivable', label: 'Contas a Receber' },
];

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("user");
  const [creating, setCreating] = useState(false);
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [openFolders, setOpenFolders] = useState({ admin: true, user: true, cliente: true });

  const toggleFolder = (role) => setOpenFolders(prev => ({ ...prev, [role]: !prev[role] }));

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersData, me] = await Promise.all([
        base44.entities.User.list(),
        base44.auth.me(),
      ]);
      setUsers(usersData);
      setCurrentUser(me);
    } catch (err) {
      toast.error("Erro ao carregar usuários: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, inviteRole);
    toast.success("Convite enviado com sucesso!");
    setInviteEmail("");
    setInviteRole("user");
    setInviteOpen(false);
    setInviting(false);
    setTimeout(loadData, 1000);
  };

  const handleCreateUser = async () => {
    if (!createEmail || !createPassword) {
      toast.error("Email e senha são obrigatórios");
      return;
    }
    setCreating(true);
    try {
      await base44.auth.register({
        email: createEmail,
        password: createPassword
      });
      
      const users = await base44.entities.User.list();
      const newUser = users.find(u => u.email === createEmail);
      
      if (newUser && createRole !== "user") {
        await base44.entities.User.update(newUser.id, { role: createRole });
      }
      
      toast.success("Usuário criado com sucesso!");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("user");
      setCreateOpen(false);
      setTimeout(loadData, 500);
    } catch (error) {
      toast.error("Erro ao criar usuário: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdatePermissions = async () => {
    if (!editingUser) return;
    
    await base44.entities.User.update(editingUser.id, {
      role: editingUser.role,
    });
    
    const existingPerms = await base44.entities.UserPermissions.filter({
      user_email: editingUser.email
    });
    
    const permData = {
      user_email: editingUser.email,
      ...editingUser.permissions,
    };
    
    if (existingPerms.length > 0) {
      await base44.entities.UserPermissions.update(existingPerms[0].id, permData);
    } else {
      await base44.entities.UserPermissions.create(permData);
    }
    
    toast.success("Permissões atualizadas!");
    setEditOpen(false);
    setEditingUser(null);
    loadData();
  };

  const openEdit = async (user) => {
    const defaultPerms = {};
    modules.forEach(m => {
      defaultPerms[m.id] = { view: false, create: false, edit: false, delete: false };
    });
    
    const existingPerms = await base44.entities.UserPermissions.filter({
      user_email: user.email
    });
    
    const userPerms = existingPerms.length > 0 ? existingPerms[0] : defaultPerms;
    
    setEditingUser({
      ...user,
      permissions: userPerms,
    });
    setEditOpen(true);
  };

  const updateModulePermissions = (moduleId, modulePerms) => {
    setEditingUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: modulePerms,
      }
    }));
  };

  const handleDeleteUser = async (userId) => {
    await base44.entities.User.delete(userId);
    toast.success("Usuário excluído com sucesso!");
    loadData();
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      toast.error("Digite a nova senha");
      return;
    }
    setResettingPassword(true);
    try {
      await base44.auth.resetPassword(resetPasswordUser.id, newPassword);
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => {
        setResetPasswordOpen(false);
        setResetPasswordUser(null);
        setNewPassword("");
      }, 500);
    } catch (error) {
      toast.error("Erro ao redefinir senha: " + error.message);
    } finally {
      setResettingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gerenciar Usuários</h1>
          <p className="text-slate-500 mt-0.5">{users.length} usuários no sistema</p>
        </div>
        <div className="flex gap-2">
          <ExportTabs 
            data={users}
            filename="relatorio_usuarios"
            columns={[
              { key: "email", label: "Email" },
              { key: "full_name", label: "Nome Completo" },
              { key: "role", label: "Função" },
              { key: "created_date", label: "Criado", format: (v) => new Date(v).toLocaleDateString("pt-BR") },
            ]}
          />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <UserPlus className="h-4 w-4 mr-2" /> Criar Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="usuario@email.com"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    placeholder="Digite uma senha segura"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={createRole} onValueChange={setCreateRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateUser} disabled={creating} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {creating ? "Criando..." : "Criar Usuário"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="h-4 w-4 mr-2" /> Convidar por Email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="usuario@email.com"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Função</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Usuário</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="cliente">Cliente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleInvite} disabled={inviting} className="w-full bg-indigo-600 hover:bg-indigo-700">
                  {inviting ? "Enviando..." : "Enviar Convite"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {[
        { role: "admin", label: "Administradores", icon: ShieldCheck, badgeClass: "bg-purple-100 text-purple-700", folderColor: "bg-purple-50 border-purple-200 hover:bg-purple-100", headerColor: "text-purple-700" },
        { role: "user", label: "Usuários", icon: Users, badgeClass: "bg-blue-100 text-blue-700", folderColor: "bg-blue-50 border-blue-200 hover:bg-blue-100", headerColor: "text-blue-700" },
        { role: "cliente", label: "Clientes", icon: UserCircle, badgeClass: "bg-green-100 text-green-700", folderColor: "bg-green-50 border-green-200 hover:bg-green-100", headerColor: "text-green-700" },
      ].map(({ role, label, icon: Icon, badgeClass, folderColor, headerColor }) => {
        const group = users.filter(u => u.role === role);
        const isOpen = openFolders[role];
        return (
          <div key={role} className="rounded-xl border overflow-hidden">
            <button
              onClick={() => toggleFolder(role)}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b transition-colors ${folderColor}`}
            >
              {isOpen ? <ChevronDown className={`h-4 w-4 ${headerColor}`} /> : <ChevronRight className={`h-4 w-4 ${headerColor}`} />}
              <Icon className={`h-5 w-5 ${headerColor}`} />
              <span className={`font-semibold ${headerColor}`}>{label}</span>
              <span className="ml-auto text-xs font-medium text-slate-500 bg-white rounded-full px-2 py-0.5 border">{group.length}</span>
            </button>

            {isOpen && (
              <div className="divide-y">
                {group.length === 0 ? (
                  <p className="text-sm text-slate-400 px-4 py-4 text-center">Nenhum {label.toLowerCase().slice(0,-1)} encontrado</p>
                ) : group.map((user) => (
                <div key={user.id} className="bg-white px-4 py-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{user.full_name || user.email}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                      <span className={`inline-block mt-1.5 px-2.5 py-0.5 rounded text-xs font-medium ${badgeClass}`}>
                        {role === 'admin' ? 'Administrador' : role === 'cliente' ? 'Cliente' : 'Usuário'}
                      </span>
                    </div>
                      <div className="flex gap-2">
                        {currentUser?.id !== user.id && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:border-red-300">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o usuário <strong>{user.full_name || user.email}</strong>? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-red-600 hover:bg-red-700">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        <Dialog open={resetPasswordOpen && resetPasswordUser?.id === user.id} onOpenChange={(open) => {
                          if (!open) { setResetPasswordUser(null); setNewPassword(""); setResetPasswordOpen(false); }
                          else setResetPasswordOpen(true);
                        }}>
                           <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => { setResetPasswordUser(user); setResetPasswordOpen(true); }}>
                              <Key className="h-4 w-4" />
                            </Button>
                           </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Redefinir Senha - {resetPasswordUser?.email}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label>Nova Senha</Label>
                                <Input type="password" placeholder="Digite a nova senha" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="mt-1" />
                              </div>
                              <div className="flex gap-3">
                                <Button onClick={handleResetPassword} disabled={resettingPassword} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
                                  {resettingPassword ? "Redefinindo..." : "Redefinir Senha"}
                                </Button>
                                <Button variant="outline" onClick={() => { setResetPasswordOpen(false); setResetPasswordUser(null); setNewPassword(""); }} className="flex-1">
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog open={editOpen && editingUser?.id === user.id} onOpenChange={(open) => {
                          if (!open) setEditingUser(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => openEdit(user)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Gerenciar Permissões - {editingUser?.email}</DialogTitle>
                            </DialogHeader>
                            {editingUser && (
                              <div className="space-y-6 pt-4 max-h-96 overflow-y-auto">
                                <div>
                                  <Label className="text-base font-semibold mb-3 block">Função</Label>
                                  <Select value={editingUser.role} onValueChange={(value) => setEditingUser(prev => ({ ...prev, role: value }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="user">Usuário</SelectItem>
                                      <SelectItem value="admin">Administrador</SelectItem>
                                      <SelectItem value="cliente">Cliente</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-base font-semibold mb-4 block">Permissões Granulares por Módulo</Label>
                                  <div className="space-y-4">
                                    {modules.map((module) => (
                                      <ModulePermissions key={module.id} module={module} permissions={editingUser.permissions?.[module.id] || {}} onChange={(perms) => updateModulePermissions(module.id, perms)} />
                                    ))}
                                  </div>
                                </div>
                                <Button onClick={handleUpdatePermissions} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                  Atualizar Permissões
                                </Button>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                  </div>
                </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
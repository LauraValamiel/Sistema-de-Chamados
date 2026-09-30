import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Trash2, Pencil, X } from "lucide-react";
import { formatarNome } from "@/lib/utils";

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);

  const [usuarioEditando, setUsuarioEditando] = useState<number | null>(null);
  
  // Estados do formulário
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [setor, setSetor] = useState("Geral");
  const [perfil, setPerfil] = useState("solicitante");

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      const response = await api.get("/usuarios/");
      setUsuarios(response.data);
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  const limparFormulario = () => {
    setUsuarioEditando(null);
    setNome("");
    setMatricula("");
    setSenha("");
    setSetor("Geral");
    setPerfil("solicitante");
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/usuarios/", {
        nome: nome.toUpperCase(),
        matricula: matricula,
        senha: senha,
        setor: setor,
        perfil: perfil,
        email: `${matricula}@belavistademinas.mg.gov.br` // Gera o email automaticamente
      });
      
      alert("✅ Usuário cadastrado com sucesso!");
      setNome(""); setMatricula(""); setSenha(""); setSetor("Geral"); setPerfil("solicitante");
      carregarUsuarios(); // Atualiza a tabela
    } catch (error: any) {
      alert("❌ Erro ao cadastrar. Verifique se a matrícula já existe.");
    }
  };

  const handleEditarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();

    if (usuarioEditando ) {
        try {
            const dadosAtualizados: any = {
                nome: nome.toUpperCase(),
                setor: setor,
                perfil: perfil,
            };

            if (senha) {
                dadosAtualizados.senha = senha;
            }

            await api.put(`/usuarios/${usuarioEditando}`, dadosAtualizados);
            alert("✅ Usuário atualizado com sucesso!");
            limparFormulario();
            carregarUsuarios();
        } catch (error) {
            alert("❌ Erro ao atualizar usuário.");
        }
    } else {
        try {
            await api.post("/usuarios/", {
            nome: nome.toUpperCase(),
            matricula: matricula,
            senha: senha,
            setor: setor,
            perfil: perfil,
            email: `${matricula}@belavistademinas.mg.gov.br`
            });
            
            alert("✅ Usuário cadastrado com sucesso!");
            limparFormulario();
            carregarUsuarios();
        } catch (error: any) {
            alert("❌ Erro ao cadastrar. Verifique se a matrícula já existe no sistema.");
        }
    }
  };

  const handleEditarClique = (usuario: any) => {
    setUsuarioEditando(usuario.id);
    setNome(usuario.nome);
    setMatricula(usuario.matricula);
    setSetor(usuario.setor);
    setPerfil(usuario.perfil);
  };

  const handleDeletarUsuario = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir este usuário?")) {
      try {
        await api.delete(`/usuarios/${id}`);
        carregarUsuarios();
      } catch (error) {
        alert("Erro ao excluir usuário.");
      }
    }
  };

  return (
    <main className="p-8 w-full max-w-7xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gerenciar Usuários</h2>
        <p className="text-slate-500 mt-1">Adicione ou remova o acesso de servidores e técnicos ao sistema.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro/Edição */}
        <Card className={`lg:col-span-1 shadow-sm border-slate-200 h-fit transition-colors ${usuarioEditando ? 'border-amber-400 shadow-amber-100' : ''}`}>
          <CardHeader className={`${usuarioEditando ? 'bg-amber-50' : 'bg-slate-50/50'} border-b border-slate-100 pb-4`}>
            <CardTitle className="text-lg text-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {usuarioEditando ? <Pencil className="h-5 w-5 text-amber-600" /> : <UserPlus className="h-5 w-5 text-blue-600" />}
                {usuarioEditando ? "Editar Usuário" : "Novo Usuário"}
              </div>
              {usuarioEditando && (
                <Button variant="ghost" size="sm" type="button" onClick={limparFormulario} className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form onSubmit={handleCriarUsuario} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João da Silva" />
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input required type="number" disabled={usuarioEditando !== null} value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 12345" className={usuarioEditando ? 'bg-slate-100 cursor-not-allowed' : ''} />
              </div>
              <div className="space-y-2">
                <Label>{usuarioEditando ? 'Nova Senha (opcional)' : 'Senha'}</Label>
                <Input required={!usuarioEditando} type="text" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={usuarioEditando ? 'Digite para alterar...' : 'Defina uma senha'} />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input required value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Geral, Saúde, Obras..." />
              </div>
              <div className="space-y-2">
                <Label>Nível de Acesso (Perfil)</Label>
                <Select onValueChange={setPerfil} value={perfil}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solicitante">Solicitante (Apenas abre chamados)</SelectItem>
                    <SelectItem value="tecnico">Técnico (Estagiário TI)</SelectItem>
                    <SelectItem value="admin">Administrador (Gestor TI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className={`w-full mt-2 ${usuarioEditando ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {usuarioEditando ? "Salvar Alterações" : "Cadastrar Usuário"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardContent className="p-0 h-[600px] overflow-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-slate-700">{formatarNome(u.nome)}</TableCell>
                    <TableCell className="text-slate-500">{u.matricula}</TableCell>
                    <TableCell className="text-slate-500">{u.setor}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.perfil === 'tecnico' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {u.perfil.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" type="button" onClick={() => handleEditarClique(u)} className="text-slate-500 hover:text-amber-600 hover:bg-amber-50">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" type="button" onClick={() => handleDeletarUsuario(u.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
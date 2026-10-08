import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Trash2, Pencil, X, Search, SearchX, FilterX, CheckCircle2 } from "lucide-react";
import { formatarNome } from "@/lib/utils";
import ModalEditarUsuario, { type UsuarioEditavel } from "@/components/ModalEditarUsuario";

// Remove acentos e deixa minúsculo, para a busca achar "joao" em "JOÃO"
const normalizar = (texto: unknown) =>
  String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const FILTROS_PERFIL = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "solicitante", rotulo: "Solicitantes" },
  { valor: "tecnico", rotulo: "Técnicos" },
  { valor: "admin", rotulo: "Admins" },
] as const;

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([]);

  // Busca e filtros da tabela
  const [busca, setBusca] = useState("");
  const [filtroPerfil, setFiltroPerfil] = useState<string>("todos");
  const [filtroSetor, setFiltroSetor] = useState<string>("todos");

  // Usuário aberto na janela de edição
  const [usuarioEditando, setUsuarioEditando] = useState<UsuarioEditavel | null>(null);
  const [aviso, setAviso] = useState("");

  // Estados do formulário de cadastro
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
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

  // Setores existentes (para o filtro), em ordem alfabética
  const setores = useMemo(
    () =>
      Array.from(new Set(usuarios.map((u) => (u.setor || "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "pt-BR")
      ),
    [usuarios]
  );

  // Quantidade de usuários por perfil (mostrada nos botões de filtro)
  const contagemPerfil = useMemo(() => {
    const c: Record<string, number> = { todos: usuarios.length, solicitante: 0, tecnico: 0, admin: 0 };
    usuarios.forEach((u) => {
      const p = (u.perfil || "").toLowerCase();
      if (p in c) c[p]++;
    });
    return c;
  }, [usuarios]);

  // Lista filtrada e em ordem alfabética
  const usuariosFiltrados = useMemo(() => {
    const termo = normalizar(busca);
    return usuarios
      .filter((u) => {
        const bateBusca =
          !termo ||
          normalizar(u.nome).includes(termo) ||
          normalizar(u.matricula).includes(termo) ||
          normalizar(u.email).includes(termo) ||
          normalizar(u.setor).includes(termo);
        const batePerfil = filtroPerfil === "todos" || (u.perfil || "").toLowerCase() === filtroPerfil;
        const bateSetor = filtroSetor === "todos" || (u.setor || "").trim() === filtroSetor;
        return bateBusca && batePerfil && bateSetor;
      })
      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  }, [usuarios, busca, filtroPerfil, filtroSetor]);

  const temFiltroAtivo = busca !== "" || filtroPerfil !== "todos" || filtroSetor !== "todos";

  const limparFiltros = () => {
    setBusca("");
    setFiltroPerfil("todos");
    setFiltroSetor("todos");
  };

  const limparFormulario = () => {
    setNome("");
    setMatricula("");
    setEmail("");
    setSenha("");
    setSetor("Geral");
    setPerfil("solicitante");
  };

  const mostrarAviso = (texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso(""), 4000);
  };

  const handleCriarUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/usuarios/", {
        nome: nome.trim().toUpperCase(),
        matricula: matricula.trim(),
        senha: senha,
        setor: setor.trim(),
        perfil: perfil,
        // Se o e-mail não for informado, usa o padrão da prefeitura
        email: (email.trim() || `${matricula.trim()}@belavistademinas.mg.gov.br`).toLowerCase(),
      });
      limparFormulario();
      carregarUsuarios();
      mostrarAviso("Usuário cadastrado com sucesso.");
    } catch (error: any) {
      const detalhe = error.response?.data?.detail;
      alert("❌ " + (typeof detalhe === "string" ? detalhe : "Erro ao cadastrar. Verifique os dados."));
    }
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
    <main className="p-4 sm:p-8 w-full max-w-7xl mx-auto space-y-6 sm:space-y-8">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Gerenciar Usuários</h2>
        <p className="text-slate-500 mt-1">Adicione, edite ou remova o acesso de servidores e técnicos ao sistema.</p>
        {aviso && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> {aviso}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulário de Cadastro */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200 h-fit">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
            <CardTitle className="text-lg text-slate-700 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Novo Usuário
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
                <Input required inputMode="numeric" value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: 12345" />
              </div>
              <div className="space-y-2">
                <Label>E-mail <span className="font-normal text-slate-400">(opcional)</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder={matricula ? `${matricula}@belavistademinas.mg.gov.br` : "matricula@belavistademinas.mg.gov.br"} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input required type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Defina uma senha" autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input required list="setores-cadastro" value={setor} onChange={(e) => setSetor(e.target.value)} placeholder="Ex: Geral, Saúde, Obras..." />
                <datalist id="setores-cadastro">
                  {setores.map((s) => <option key={s} value={s} />)}
                </datalist>
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
              <Button type="submit" className="w-full mt-2 bg-blue-600 hover:bg-blue-700">
                Cadastrar Usuário
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Tabela de Usuários */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 overflow-hidden">
          {/* Barra de busca e filtros */}
          <div className="border-b border-slate-100 bg-slate-50/60 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por nome, matrícula, e-mail ou setor..."
                  className="bg-white pl-9 pr-9"
                  aria-label="Buscar usuário"
                />
                {busca && (
                  <button
                    type="button"
                    onClick={() => setBusca("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label="Limpar busca"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="sm:w-52 bg-white">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {setores.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-2">
                {FILTROS_PERFIL.map((f) => {
                  const ativo = filtroPerfil === f.valor;
                  return (
                    <button
                      key={f.valor}
                      type="button"
                      onClick={() => setFiltroPerfil(f.valor)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        ativo
                          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {f.rotulo}
                      <span className={`rounded-full px-1.5 text-[10px] ${ativo ? "bg-white/25" : "bg-slate-100 text-slate-500"}`}>
                        {contagemPerfil[f.valor] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>
                  Mostrando <b className="text-slate-700">{usuariosFiltrados.length}</b> de {usuarios.length}
                </span>
                {temFiltroAtivo && (
                  <button type="button" onClick={limparFiltros}
                    className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-800">
                    <FilterX className="h-3.5 w-3.5" /> Limpar filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-0 h-[70vh] sm:h-[600px] overflow-auto">
            <Table className="min-w-[560px]">
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usuariosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-16">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <SearchX className="h-8 w-8 text-slate-300" />
                        <p className="font-medium text-slate-600">Nenhum usuário encontrado</p>
                        <p className="text-sm text-slate-400">Tente outro nome, matrícula ou limpe os filtros.</p>
                        {temFiltroAtivo && (
                          <Button type="button" variant="outline" size="sm" onClick={limparFiltros} className="mt-2">
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                {usuariosFiltrados.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium text-slate-700">{formatarNome(u.nome)}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </TableCell>
                    <TableCell className="text-slate-500">{u.matricula}</TableCell>
                    <TableCell className="text-slate-500">{u.setor}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        u.perfil === 'admin' ? 'bg-purple-100 text-purple-700' : 
                        u.perfil === 'tecnico' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {(u.perfil || '').toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" type="button" onClick={() => setUsuarioEditando(u)} title="Editar dados" className="text-slate-500 hover:text-amber-600 hover:bg-amber-50">
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

      {usuarioEditando && (
        <ModalEditarUsuario
          usuario={usuarioEditando}
          setores={setores}
          onFechar={() => setUsuarioEditando(null)}
          onSalvo={() => {
            setUsuarioEditando(null);
            carregarUsuarios();
            mostrarAviso("Dados do usuário atualizados.");
          }}
        />
      )}
    </main>
  );
}
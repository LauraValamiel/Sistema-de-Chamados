import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, Eye, EyeOff, Loader2 } from "lucide-react";
import "./Login.css"
import logo from "/public/logotipobvm.png"
import { api } from "@/services/api";
import SelectSetor from "@/components/SelectSetor";
import { setorOficial } from "@/lib/setores";

// Troca obrigatória da senha padrão (Mudar123) no primeiro acesso.
// Desativada durante os testes: mude para true para voltar a exigir.
const EXIGIR_TROCA_SENHA = false;

// Campo de senha com botão de mostrar/ocultar
function CampoSenha({ id, value, onChange, placeholder, autoComplete }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string; autoComplete: string
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={visivel ? "text" : "password"}
        placeholder={placeholder ?? "••••••••"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white pr-10"
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisivel(!visivel)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
      >
        {visivel ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function Login() {
    const navigate = useNavigate();
    const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
    const [erro, setErro] = useState("");
    const [enviando, setEnviando] = useState(false);

    // Entrar
    const [matricula, setMatricula] = useState("");
    const [senha, setSenha] = useState("");

    // Criar conta
    const [cadMatricula, setCadMatricula] = useState("");
    const [cadSetor, setCadSetor] = useState("");
    const [cadSenha, setCadSenha] = useState("");
    const [cadConfirmacao, setCadConfirmacao] = useState("");

    const trocarModo = (novo: "entrar" | "cadastrar") => {
      setModo(novo);
      setErro("");
    };

    const entrarNoSistema = (usuarioLogado: any, senhaDigitada: string) => {
      // Quem entrou com a senha padrão precisa criar uma senha pessoal
      if (EXIGIR_TROCA_SENHA && senhaDigitada === "Mudar123") {
        localStorage.setItem("usuarioLogado", JSON.stringify({ ...usuarioLogado, precisaTrocarSenha: true }));
        navigate("/alterar-senha");
        return;
      }

      localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

      if (usuarioLogado.perfil === "admin" || usuarioLogado.perfil === "tecnico") {
        navigate("/dashboard");
      } else {
        navigate("/meus-chamados");
      }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setEnviando(true);

        try {
          const response = await api.post("/login/", { matricula: matricula.trim(), senha });
          entrarNoSistema(response.data, senha);
        } catch (error: any) {
          const status = error.response?.status;
          if (status === 400 || status === 401 || status === 404) {
            setErro("Matrícula ou senha inválidos. Tente novamente.");
          } else {
            setErro("Não foi possível conectar ao servidor. Tente novamente em instantes.");
          }
        } finally {
          setEnviando(false);
        }
    }

    // Regras do cadastro
    const regras = {
      matricula: /^\d+$/.test(cadMatricula.trim()),
      senha: cadSenha.length >= 6,
      confere: cadSenha !== "" && cadSenha === cadConfirmacao,
    };
    const podeCadastrar = regras.matricula && regras.senha && regras.confere && setorOficial(cadSetor) !== null;

    const handleCadastro = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        if (!podeCadastrar) return;
        setEnviando(true);

        try {
          const response = await api.post("/cadastro/", {
            matricula: cadMatricula.trim(),
            setor: cadSetor.trim(),
            senha: cadSenha,
          });
          // Cadastro feito: já entra no sistema e vai completar os dados
          localStorage.setItem("usuarioLogado", JSON.stringify(response.data));
          navigate("/meus-dados", { state: { novoCadastro: true } });
        } catch (error: any) {
          const detalhe = error.response?.data?.detail;
          setErro(
            typeof detalhe === "string"
              ? detalhe
              : error.response
                ? "Não foi possível concluir o cadastro. Verifique os dados."
                : "Não foi possível conectar ao servidor. Tente novamente em instantes."
          );
        } finally {
          setEnviando(false);
        }
    }

    return (
    <div className="login-container">
      <Card className="login-card">
        <CardHeader className="login-header">
          <div className="login-icon-wrapper">
            <img src={logo} alt="Logotipo Bela Vista de Minas" className='login-icon' />
          </div>
          <CardTitle className="login-title">
            Central de Suporte TI
          </CardTitle>
          <CardDescription className="login-desc">
            Prefeitura Municipal de Bela Vista de Minas
          </CardDescription>
        </CardHeader>

        {/* Abas: Entrar / Criar conta */}
        <div className="mx-6 mb-2 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm font-semibold">
          <button type="button" onClick={() => trocarModo("entrar")}
            className={`rounded-md py-2 transition ${modo === "entrar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Entrar
          </button>
          <button type="button" onClick={() => trocarModo("cadastrar")}
            className={`rounded-md py-2 transition ${modo === "cadastrar" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
            Criar conta
          </button>
        </div>

        {modo === "entrar" ? (
          <form onSubmit={handleLogin}>
            <CardContent className="login-content">
              {erro && <div className="text-red-500 text-sm font-semibold mb-2">{erro}</div>}

              <div className="login-field">
                <Label htmlFor="matricula" className="login-label">Matrícula</Label>
                <Input
                  id="matricula"
                  type="text"
                  inputMode="numeric"
                  placeholder="Ex: 12345"
                  required
                  value={matricula}
                  onChange={(e) => setMatricula(e.target.value)}
                  className="bg-white"
                  autoComplete="username"
                />
              </div>
              <div className="login-field">
                <Label htmlFor="password" className="login-label">Senha</Label>
                <CampoSenha id="password" value={senha} onChange={setSenha} autoComplete="current-password" />
              </div>
            </CardContent>
            <CardFooter className="login-footer flex-col gap-3">
              <Button type="submit" className="login-btn" disabled={enviando}>
                {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar no Sistema"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                Ainda não tem acesso?{" "}
                <button type="button" onClick={() => trocarModo("cadastrar")} className="font-semibold text-blue-600 hover:underline">
                  Crie sua conta
                </button>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleCadastro}>
            <CardContent className="login-content">
              {erro && <div className="text-red-500 text-sm font-semibold mb-2">{erro}</div>}

              <div className="login-field">
                <Label htmlFor="cad-matricula" className="login-label">Matrícula</Label>
                <Input
                  id="cad-matricula"
                  inputMode="numeric"
                  placeholder="Sua matrícula na prefeitura"
                  required
                  value={cadMatricula}
                  onChange={(e) => setCadMatricula(e.target.value)}
                  className="bg-white"
                  autoComplete="username"
                />
              </div>
              <div className="login-field">
                <Label htmlFor="cad-setor" className="login-label">Setor</Label>
                <SelectSetor id="cad-setor" value={cadSetor} onChange={setCadSetor} />
              </div>
              <div className="login-field">
                <Label htmlFor="cad-senha" className="login-label">Senha</Label>
                <CampoSenha id="cad-senha" value={cadSenha} onChange={setCadSenha} placeholder="Crie uma senha" autoComplete="new-password" />
              </div>
              <div className="login-field">
                <Label htmlFor="cad-confirmar" className="login-label">Confirmar senha</Label>
                <CampoSenha id="cad-confirmar" value={cadConfirmacao} onChange={setCadConfirmacao} placeholder="Repita a senha" autoComplete="new-password" />
              </div>

              <ul className="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs">
                {[
                  { ok: regras.matricula, texto: "Matrícula só com números" },
                  { ok: regras.senha, texto: "Senha com pelo menos 6 caracteres" },
                  { ok: regras.confere, texto: "As duas senhas são iguais" },
                ].map((r) => (
                  <li key={r.texto} className={`flex items-center gap-2 ${r.ok ? "text-emerald-600" : "text-slate-500"}`}>
                    {r.ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                    {r.texto}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="login-footer flex-col gap-3">
              <Button type="submit" className="login-btn" disabled={!podeCadastrar || enviando}>
                {enviando ? <><Loader2 className="h-4 w-4 animate-spin" /> Criando conta...</> : "Criar conta"}
              </Button>
              <p className="text-center text-xs text-slate-500">
                Já tem acesso?{" "}
                <button type="button" onClick={() => trocarModo("entrar")} className="font-semibold text-blue-600 hover:underline">
                  Entrar
                </button>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  )
}

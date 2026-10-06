import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import "./Login.css"
import logo from "/public/logotipobvm.png"
import { api } from "@/services/api";

// Troca obrigatória da senha padrão (Mudar123) no primeiro acesso.
// Desativada durante os testes: mude para true para voltar a exigir.
const EXIGIR_TROCA_SENHA = false;

export default function Login() {
    const navigate = useNavigate();
    const [matricula, setMatricula] = useState("");
    const [senha, setSenha] = useState("");
    const [mostrarSenha, setMostrarSenha] = useState(false);
    const [erro, setErro] = useState("");
    const [entrando, setEntrando] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");
        setEntrando(true);

        try {
          const response = await api.post("/login/", { 
            matricula, 
            senha });

            const usuarioLogado = response.data;

            // Quem entrou com a senha padrão precisa criar uma senha pessoal
            if (EXIGIR_TROCA_SENHA && senha === "Mudar123") {
              localStorage.setItem("usuarioLogado", JSON.stringify({ ...usuarioLogado, precisaTrocarSenha: true }));
              navigate("/alterar-senha");
              return;
            }

            localStorage.setItem("usuarioLogado", JSON.stringify(usuarioLogado));

            if (usuarioLogado.perfil === "admin" || usuarioLogado.perfil === "tecnico") {
              navigate("/dashboard");
            } else {
              navigate("/novo-chamado");
            }

        } catch (error: any) {
          const status = error.response?.status;
          if (status === 400 || status === 401 || status === 404) {
            setErro("Matrícula ou senha inválidos. Tente novamente.");
          } else {
            // Sem resposta (servidor fora do ar, erro 500, CORS...)
            setErro("Não foi possível conectar ao servidor. Tente novamente em instantes.");
          }
        } finally {
          setEntrando(false);
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
        
        <form onSubmit={handleLogin}>
          <CardContent className="login-content">
            {erro && <div className="text-red-500 text-sm font-semibold mb-2">{erro}</div>}
            
            <div className="login-field">
              <Label htmlFor="matricula" className="login-label">Matrícula</Label>
              <Input
                id="matricula"
                type="text"
                placeholder="Ex: 12345"
                required
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="login-field">
              <Label htmlFor="password" className="login-label">Senha</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={mostrarSenha ? "text" : "password"} 
                  placeholder="••••••••"
                  required 
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-white pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="login-footer">
            <Button type="submit" className="login-btn" disabled={entrando}>
              {entrando ? "Entrando..." : "Entrar no Sistema"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
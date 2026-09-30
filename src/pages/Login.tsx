import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import "./Login.css"
import logo from "/public/logotipobvm.png"
import { api } from "@/services/api";

export default function Login() {
    const navigate = useNavigate();
    const [matricula, setMatricula] = useState("");
    const [senha, setSenha] = useState("");
    const [erro, setErro] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErro("");

        try {
          const response = await api.post("/login", { 
            matricula, 
            senha });

            const usuarioLogado = response.data;

            localStorage.setItem("usuarioLogado", JSON.stringify(response.data));

            if (usuarioLogado.perfil === "admin" || usuarioLogado.perfil === "tecnico") {
              navigate("/dashboard");
            } else {
              navigate("/novo-chamado");
            }

            

        } catch (error) {
          setErro("Matrícula ou senha inválidos. Tente novamente.");
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
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                required 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="bg-white"
              />
            </div>
          </CardContent>
          <CardFooter className="login-footer">
            <Button type="submit" className="login-btn">
              Entrar no Sistema
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}

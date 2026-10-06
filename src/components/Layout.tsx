import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { KeyRound, LayoutDashboard, List, LogOut, Plus, User, Users } from "lucide-react"
import "./Layout.css"
import { formatarNome } from "@/lib/utils"

export default function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const path = location.pathname

    const usuarioStorage = localStorage.getItem("usuarioLogado");
    const usuario = usuarioStorage ? JSON.parse(usuarioStorage) : null;

    if (!usuario) {
        return <Navigate to="/login" replace />
    }

    // Enquanto estiver com a senha padrão, só pode acessar a tela de troca de senha
    if (usuario.precisaTrocarSenha && path !== "/alterar-senha") {
        return <Navigate to="/alterar-senha" replace />
    }

    const isPrvilegiado = usuario.perfil === "admin" || usuario.perfil === "tecnico";

    const isAdmin = usuario.perfil === "admin";

    if (!isPrvilegiado && (path === "/dashboard" || path === "/todos-chamados")) {
        return <Navigate to="/novo-chamado" replace />
    }

    if (!isAdmin && path === "/usuarios") {
        return <Navigate to="/dashboard" replace />
    }

    const handleLogout = () => {
        localStorage.removeItem("usuarioLogado");
        navigate("/login");
    }

    return (
        <div className="layout-root">
            <header className="layout-header">
                <div className="layout-header-inner">
                    <div className="flex items-center gap-3">
                        <img src="/logotipobvm.png" alt="Logo Moderna Bela Vista de Minas" className="h-11 w-auto object-contain" />
                        <div className="header-titles space-y-0.5 text-left">
                            <h1>Sistema de Chamados - TI</h1>
                            <p>Prefeitura Municipal de Bela Vista de Minas</p>
                        </div>
                    </div>
                    <div className="header-profile">
                        <div className="flex items-center gap-2">
                            <div className="header-avatar">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="text-left space-y-0.5 leading-none">
                                <p className="header-profile-name">{formatarNome(usuario?.nome)}</p>
                                <p className="header-profile-role">{formatarNome(usuario?.perfil)}</p>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            className="header-logout-btn"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sair
                        </Button>
                    </div>
                </div>
            </header>

            <nav className="layout-nav">
                <div className="layout-nav-inner">
                    
                    <div className="flex items-center pr-6 mr-2 border-r border-slate-200 h-8">
                        <img src="/bvm.png" alt="Brasão Bela Vista de Minas" className="h-8 w-auto object-contain" />
                    </div>

                    {isPrvilegiado && (
                        <div className={`nav-item ${path === '/dashboard' ? 'active' : ''}`} onClick={() => navigate("/dashboard")}>
                            <div className="nav-content">
                                <LayoutDashboard className="nav-icon" />
                                <span className="nav-text">Dashboard</span>
                            </div>
                        </div>
                    )}
                    
                    <div className={`nav-item ${path === '/novo-chamado' ? 'active' : ''}`} onClick={() => navigate("/novo-chamado")}>
                        <div className="nav-content">
                            <Plus className="nav-icon" />
                            <span className="nav-text">Novo Chamado</span>
                        </div>
                    </div>
                    
                    {isPrvilegiado && (
                        <div className={`nav-item ${path === '/todos-chamados' ? 'active' : ''}`} onClick={() => navigate("/todos-chamados")}>
                            <div className="nav-content">
                                <List className="nav-icon" />
                                <span className="nav-text">Todos os Chamados</span>
                            </div>
                        </div>
                    )}

                    <div className={`nav-item ${path === '/alterar-senha' ? 'active' : ''}`} onClick={() => navigate("/alterar-senha")}>
                        <div className="nav-content">
                            <KeyRound className="nav-icon" />
                            <span className="nav-text">Alterar Senha</span>
                        </div>
                    </div>

                    {isAdmin && (
                        <div className={`nav-item ${path === '/usuarios' ? 'active' : ''}`} onClick={() => navigate("/usuarios")}>
                            <div className="nav-content">
                                <Users className="nav-icon" />
                                <span className="nav-text">Gerenciar Usuários</span>
                            </div>
                        </div>
                    )}
                    
                </div>
            </nav>

            <Outlet />
        </div>
    )

}
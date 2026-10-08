import { useEffect, useRef, useState } from "react"
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { ClipboardList, LayoutDashboard, List, LogOut, Plus, User, UserRound, Users } from "lucide-react"
import "./Layout.css"
import { formatarNome } from "@/lib/utils"
import { useNotificacoesChamados } from "@/hooks/useNotificacoesChamados"
import { SinoNotificacoes, ToastsChamados } from "@/components/Notificacoes"

export default function Layout() {
    const navigate = useNavigate()
    const location = useLocation()

    const path = location.pathname

    // Relê o usuário quando ele atualiza os próprios dados em "Meus Dados"
    const [, setAtualizacao] = useState(0);
    useEffect(() => {
        const aoAtualizar = () => setAtualizacao((n) => n + 1);
        window.addEventListener("usuario-atualizado", aoAtualizar);
        return () => window.removeEventListener("usuario-atualizado", aoAtualizar);
    }, []);

    const usuarioStorage = localStorage.getItem("usuarioLogado");
    const usuario = usuarioStorage ? JSON.parse(usuarioStorage) : null;

    // No celular o menu rola para o lado: mantém a aba ativa visível
    const navRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const ativo = navRef.current?.querySelector(".nav-item.active") as HTMLElement | null;
        ativo?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }, [path]);

    // Notificações de novos chamados (só para admin e técnico)
    const recebeNotificacoes =
        !!usuario && !usuario.precisaTrocarSenha && (usuario.perfil === "admin" || usuario.perfil === "tecnico");
    const notif = useNotificacoesChamados(usuario?.id, recebeNotificacoes);

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
                    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                        <img src="/logotipobvm.png" alt="Logo Moderna Bela Vista de Minas" className="h-9 w-auto shrink-0 object-contain sm:h-11" />
                        <div className="header-titles min-w-0 space-y-0.5 text-left">
                            <h1 className="truncate">
                                <span className="sm:hidden">Chamados TI</span>
                                <span className="hidden sm:inline">Sistema de Chamados - TI</span>
                            </h1>
                            <p className="hidden truncate sm:block">Prefeitura Municipal de Bela Vista de Minas</p>
                        </div>
                    </div>
                    <div className="header-profile">
                        {recebeNotificacoes && (
                            <SinoNotificacoes
                                notificacoes={notif.notificacoes}
                                naoLidas={notif.naoLidas}
                                permissao={notif.permissao}
                                onMarcarLida={notif.marcarComoLida}
                                onMarcarTodas={notif.marcarTodasComoLidas}
                                onLimpar={notif.limparTodas}
                                onPedirPermissao={notif.pedirPermissao}
                            />
                        )}
                        <button
                            type="button"
                            onClick={() => navigate("/meus-dados")}
                            className="flex min-w-0 items-center gap-2 rounded-full text-left"
                            title={`${formatarNome(usuario?.nome)} · Meus dados`}
                        >
                            <div className="header-avatar shrink-0">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="hidden min-w-0 space-y-0.5 leading-none md:block">
                                <p className="header-profile-name max-w-[220px] truncate">{formatarNome(usuario?.nome)}</p>
                                <p className="header-profile-role">{formatarNome(usuario?.perfil)}</p>
                            </div>
                        </button>
                        <Button 
                            variant="ghost" 
                            className="header-logout-btn"
                            onClick={handleLogout}
                            title="Sair"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Sair</span>
                        </Button>
                    </div>
                </div>
            </header>

            <nav className="layout-nav">
                <div className="layout-nav-inner" ref={navRef}>
                    
                    <div className="hidden items-center pr-6 mr-2 border-r border-slate-200 h-8 shrink-0 md:flex">
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

                    <div className={`nav-item ${path === '/meus-chamados' ? 'active' : ''}`} onClick={() => navigate("/meus-chamados")}>
                        <div className="nav-content">
                            <ClipboardList className="nav-icon" />
                            <span className="nav-text">Meus Chamados</span>
                        </div>
                    </div>

                    <div className={`nav-item ${path === '/meus-dados' || path === '/alterar-senha' ? 'active' : ''}`} onClick={() => navigate("/meus-dados")}>
                        <div className="nav-content">
                            <UserRound className="nav-icon" />
                            <span className="nav-text">Meus Dados</span>
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

            {recebeNotificacoes && (
                <ToastsChamados
                    toasts={notif.toasts}
                    onFechar={notif.fecharToast}
                    onAbrir={(id) => {
                        notif.marcarComoLida(id)
                        navigate("/dashboard")
                    }}
                />
            )}
        </div>
    )

}
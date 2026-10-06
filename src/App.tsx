// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import NovoChamado from "./pages/NovoChamado" // Importe o novo arquivo
import TodosChamados from "./pages/TodosChamados"
import Layout from "./components/Layout"
import GerenciarUsuarios from "./pages/GerenciarUsuarios";
import AlterarSenha from "./pages/AlterarSenha";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/novo-chamado" element={<NovoChamado />} />
          <Route path="/todos-chamados" element={<TodosChamados />} />
          <Route path="/usuarios" element={<GerenciarUsuarios />} />
          <Route path="/alterar-senha" element={<AlterarSenha />} />
        </Route>
        
      </Routes>
    </BrowserRouter>
  )
}

export default App
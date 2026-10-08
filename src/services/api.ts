import axios from "axios";

export const api = axios.create({
  // Em produção vem da variável VITE_API_URL (configurada na Vercel)
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000",
  timeout: 15000,
});

// Envia o token de login em todas as requisições
api.interceptors.request.use((config) => {
  try {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado") ?? "null");
    if (usuario?.token) {
      config.headers.Authorization = `Bearer ${usuario.token}`;
    }
  } catch {
    // localStorage inválido: segue sem token
  }
  return config;
});

// Se o token expirou ou é inválido, volta para a tela de login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const ehLogin = String(error.config?.url ?? "").includes("/login");
    if (status === 401 && !ehLogin) {
      localStorage.removeItem("usuarioLogado");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
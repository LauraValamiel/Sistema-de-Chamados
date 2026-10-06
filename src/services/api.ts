import axios from "axios";

export const api = axios.create({
  // Em produção vem da variável VITE_API_URL (configurada na Vercel)
  baseURL: import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000",
  timeout: 15000,
});
import { useState } from 'react';
import { rotinaService } from '../supabaseClient';
import { Mail, Lock, LogIn, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess, onNavigateToCadastro }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!email.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!email.includes('@')) {
      setError('Insira um formato de e-mail válido.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: apiError } = await rotinaService.signIn(email, password);
      
      if (apiError) {
        setError(apiError.message || 'Erro ao realizar login.');
      } else if (data && data.user) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6 justify-center animate-fade-in select-none text-slate-800">
      
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3.5 shadow-lg shadow-indigo-600/25">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-8 h-8 text-white">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            <path d="M12 6v6l4 2" />
          </svg>
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">RotinaApp</h1>
        <p className="text-xs text-slate-500 mt-1">Lembretes inteligentes baseados em localização</p>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600 flex items-start gap-2 animate-shake font-bold">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Email Input */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">E-mail</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              type="email"
              placeholder="seu.email@exemplo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              required
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Senha</label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
              required
            />
          </div>
        </div>

        {/* Login Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 py-3.5 rounded-xl font-bold text-xs text-white transition active:scale-98 flex items-center justify-center gap-1.5 mt-2 cursor-pointer shadow-lg shadow-indigo-600/25"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              Entrando...
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Entrar
            </>
          )}
        </button>

      </form>

      {/* Switch Action Links */}
      <div className="mt-8 text-center">
        <p className="text-[11px] text-slate-500 font-medium">
          Não tem uma conta?{' '}
          <button
            type="button"
            onClick={onNavigateToCadastro}
            className="text-indigo-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            Cadastre-se grátis
          </button>
        </p>
      </div>

    </div>
  );
}

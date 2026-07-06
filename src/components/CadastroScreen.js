import { useState } from 'react';
import { rotinaService } from '../supabaseClient';
import { Mail, Lock, UserPlus, ArrowLeft, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';

export default function CadastroScreen({ onCadastroSuccess, onNavigateToLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Form Validations
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    if (!email.includes('@')) {
      setError('Insira um formato de e-mail válido.');
      return;
    }

    if (password.length < 6) {
      setError('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { data, error: apiError } = await rotinaService.signUp(email, password);
      
      if (apiError) {
        setError(apiError.message || 'Erro ao realizar cadastro.');
      } else if (data && data.user) {
        setSuccess(true);
        // Delay navigation slightly so they see the success state
        setTimeout(() => {
          onCadastroSuccess(data.user);
        }, 1200);
      }
    } catch (err) {
      setError('Ocorreu um erro inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white p-6 justify-center animate-fade-in select-none text-slate-800">
      
      {/* Back button */}
      <button
        onClick={onNavigateToLogin}
        className="absolute top-12 left-6 text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 transition cursor-pointer shadow-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar
      </button>

      {/* Brand Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Criar Conta</h1>
        <p className="text-xs text-slate-500 mt-1">Crie seu perfil para começar a monitorar tarefas</p>
      </div>

      {success ? (
        <div className="py-8 px-4 text-center space-y-3 bg-slate-50 border border-slate-200 rounded-2xl animate-scale-up shadow-sm">
          <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 animate-bounce">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="font-extrabold text-sm text-slate-900">Cadastro concluído!</h2>
          <p className="text-[11px] text-slate-500 leading-normal font-medium">Iniciando sua sessão automática...</p>
        </div>
      ) : (
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
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Senha (mín. 6 caracteres)</label>
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

          {/* Confirm Password Input */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Confirmar Senha</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 pl-10 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white transition"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 py-3.5 rounded-xl font-bold text-xs text-white transition active:scale-98 flex items-center justify-center gap-1.5 mt-2 cursor-pointer shadow-lg shadow-indigo-600/25"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                Criando conta...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Cadastrar-me
              </>
            )}
          </button>

        </form>
      )}

      {/* Switch Action Links */}
      {!success && (
        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Já possui uma conta?{' '}
            <button
              type="button"
              onClick={onNavigateToLogin}
              className="text-indigo-600 font-bold hover:underline bg-transparent border-none p-0 cursor-pointer"
            >
              Fazer login
            </button>
          </p>
        </div>
      )}

    </div>
  );
}

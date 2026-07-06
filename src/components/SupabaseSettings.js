import { useState } from 'react';
import { getSupabaseConfig, saveSupabaseConfig } from '../supabaseClient';
import { Server, Database, Check, AlertTriangle, Copy, Code } from 'lucide-react';

export default function SupabaseSettings({ onClose }) {
  const [config, setConfig] = useState(getSupabaseConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSave = () => {
    saveSupabaseConfig(config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1500);
  };

  const sqlScript = `-- 1. CRIAR TABELA DE TAREFAS (TASKS)
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL CHECK (priority IN ('alta', 'media', 'baixa')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'concluida')),
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid()
);

-- 2. HABILITAR SEGURANÇA EM NÍVEL DE LINHA (RLS - ROW LEVEL SECURITY)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICA DE LEITURA (USUÁRIO PODE VER APENAS SUAS PRÓPRIAS TAREFAS)
CREATE POLICY "Usuários podem visualizar suas próprias tarefas" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. POLÍTICA DE INSERÇÃO (USUÁRIO PODE CRIAR TAREFAS VINCULADAS A SI)
CREATE POLICY "Usuários podem inserir suas próprias tarefas" 
ON public.tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. POLÍTICA DE ATUALIZAÇÃO (USUÁRIO PODE EDITAR APENAS SUAS TAREFAS)
CREATE POLICY "Usuários podem atualizar suas próprias tarefas" 
ON public.tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 6. POLÍTICA DE EXCLUSÃO (USUÁRIO PODE EXCLUIR APENAS SUAS TAREFAS)
CREATE POLICY "Usuários podem deletar suas próprias tarefas" 
ON public.tasks 
FOR DELETE 
USING (auth.uid() = user_id);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999] select-none text-slate-800 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-extrabold text-sm tracking-tight text-slate-900">Integração do Banco Supabase</h3>
              <p className="text-[10px] text-slate-500 font-medium">Configure sua conexão oficial ou use o simulador</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs bg-white hover:bg-slate-50 text-slate-700 py-1.5 px-3 rounded-lg border border-slate-200 transition font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* Mode Switcher */}
          <div className="bg-slate-50 rounded-xl border border-slate-150 p-4">
            <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider block mb-3">Selecione o Banco de Dados</span>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, useRealSupabase: false }))}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  !config.useRealSupabase
                    ? 'bg-white border-indigo-500 shadow-sm text-indigo-800'
                    : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${!config.useRealSupabase ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs block text-slate-900">Simulador Integrado</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal font-medium">Offline, roda imediato no LocalStorage, sem precisar configurar nada!</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, useRealSupabase: true }))}
                className={`p-3.5 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  config.useRealSupabase
                    ? 'bg-white border-indigo-500 shadow-sm text-indigo-800'
                    : 'bg-white border-slate-250 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${config.useRealSupabase ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-extrabold text-xs block text-slate-900">Supabase Oficial (Real)</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5 leading-normal font-medium">Conecte com sua conta do Supabase para sincronizar suas tarefas reais.</span>
                </div>
              </button>
            </div>
          </div>

          {/* Credentials Inputs (Conditional) */}
          {config.useRealSupabase && (
            <div className="space-y-4 bg-slate-50 rounded-xl border border-slate-200 p-4 animate-slide-up">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">Credenciais do Supabase</span>
              
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Project URL</label>
                <input
                  type="text"
                  placeholder="https://sua-url-do-projeto.supabase.co"
                  value={config.url}
                  onChange={e => setConfig(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1.5">Anon API Key (Public)</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  value={config.anonKey}
                  onChange={e => setConfig(prev => ({ ...prev, anonKey: e.target.value }))}
                  className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition font-mono"
                />
              </div>

              <div className="flex gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800 font-medium leading-normal">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  Certifique-se de habilitar as regras do banco de dados (recomenda-se rodar o script SQL abaixo) para que as requisições de autenticação e tarefas funcionem corretamente.
                </p>
              </div>
            </div>
          )}

          {/* SQL Setup Script */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-extrabold text-slate-400 tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-indigo-600" /> Script SQL para o Supabase Editor
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1 text-[10px] font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded transition cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400" /> Copiar SQL
                  </>
                )}
              </button>
            </div>
            
            <p className="text-[10px] text-slate-500 font-medium leading-snug mb-3">
              Cole o script abaixo na ferramenta **SQL Editor** no painel do Supabase para criar a tabela de tarefas e configurar automaticamente o Row Level Security (RLS).
            </p>

            <pre className="w-full bg-slate-900 text-[10px] font-mono text-emerald-400 p-3.5 rounded-lg border border-slate-950 overflow-x-auto max-h-48 scrollbar-thin scrollbar-thumb-slate-800">
              {sqlScript}
            </pre>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="text-xs text-slate-500 hover:text-slate-800 py-2 px-4 rounded-lg hover:bg-slate-100 transition font-bold cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            onClick={handleSave}
            disabled={saveSuccess}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 text-white font-bold py-2 px-5 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="w-4 h-4" /> Configurações Salvas!
              </>
            ) : (
              'Aplicar Configurações'
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

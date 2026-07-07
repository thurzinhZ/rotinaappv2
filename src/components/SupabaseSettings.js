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
          {/* Read-Only Database Status Info Card */}
          <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 p-5">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Server className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900">Banco de Dados Ativo: Supabase Cloud</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">Online</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-normal font-medium">
                  Este aplicativo está configurado permanentemente para ler e salvar usuários e tarefas diretamente no seu servidor Supabase. O modo de simulação local foi desativado.
                </p>
              </div>
            </div>

            {/* Connection properties */}
            <div className="mt-4 pt-4 border-t border-emerald-100/50 space-y-2.5 text-[11px] font-medium text-slate-600">
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200/60 font-mono">
                <span className="text-slate-400 font-sans text-[10px] font-bold">URL DO PROJETO</span>
                <span className="text-slate-800 font-semibold text-[10px]">https://jrspadoowijuqfzvhngd.supabase.co</span>
              </div>
              <div className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-slate-200/60 font-mono">
                <span className="text-slate-400 font-sans text-[10px] font-bold">CHAVE ANON PÚBLICA</span>
                <span className="text-slate-500 truncate max-w-[280px] font-normal text-[10px]" title={config.anonKey}>
                  {config.anonKey}
                </span>
              </div>
            </div>
          </div>

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
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-lg transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
          >
            Confirmar e Voltar
          </button>
        </div>

      </div>
    </div>
  );
}

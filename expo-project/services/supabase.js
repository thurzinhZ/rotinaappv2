import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase. Para usar um banco real,
// substitua pelas suas credenciais do painel do Supabase.
const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

export let supabase = null;

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

// Chaves de cache locais caso o Supabase não esteja configurado
export const LOCAL_TASKS_KEY = '@RotinaApp:tasks_v1';
export const LOCAL_USER_KEY = '@RotinaApp:user_v1';
export const LOCAL_SUPABASE_CONFIG_KEY = '@RotinaApp:supabase_config';

/**
 * Função utilitária para inicializar dinamicamente o cliente Supabase 
 * caso o usuário configure as credenciais diretamente no aplicativo.
 */
export async function initializeCustomSupabase(url, anonKey) {
  if (!url || !anonKey) {
    supabase = null;
    return null;
  }
  
  try {
    supabase = createClient(url, anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    return supabase;
  } catch (error) {
    console.error('Erro ao inicializar Supabase customizado:', error);
    supabase = null;
    throw error;
  }
}

import { createClient } from '@supabase/supabase-js';

// Let's keep a reactive config in localStorage
const CONFIG_KEY = 'rotina_supabase_config';
const AUTH_USER_KEY = 'rotina_auth_user';
const TASKS_KEY = 'rotina_tasks_data';

const DEFAULT_CONFIG = {
  url: '',
  anonKey: '',
  useRealSupabase: false
};

// Initial system tasks to seed the app so it's super cool to use immediately!
// Let's center these around a realistic set of locations.
const INITIAL_MOCK_TASKS = (userId) => [
  {
    id: 'mock-1',
    title: 'Passar no Supermercado Cotripal',
    description: 'Comprar pão, leite, café e itens para o jantar.',
    priority: 'alta',
    status: 'pendente',
    latitude: -28.2911,
    longitude: -53.4990,
    address: 'Av. Adolfo Kepler, Panambi - RS (Cotripal)',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    user_id: userId
  },
  {
    id: 'mock-2',
    title: 'Pagar Fatura no Banrisul',
    description: 'Levar a fatura impressa ou usar o código de barras no caixa eletrônico.',
    priority: 'media',
    status: 'pendente',
    latitude: -28.2922,
    longitude: -53.5015,
    address: 'Rua Hermann Meyer, Centro, Panambi - RS (Banrisul)',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user_id: userId
  },
  {
    id: 'mock-3',
    title: 'Retirar Receita no Hospital Panambi',
    description: 'Retirar medicamento de uso contínuo na farmácia do hospital.',
    priority: 'baixa',
    status: 'pendente',
    latitude: -28.2955,
    longitude: -53.5040,
    address: 'Rua do Hospital, Panambi - RS',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    user_id: userId
  },
  {
    id: 'mock-4',
    title: 'Entregar Trabalho no IFFAR Panambi',
    description: 'Protocolar o relatório final com as assinaturas da coordenação.',
    priority: 'alta',
    status: 'concluida',
    latitude: -28.2872,
    longitude: -53.5028,
    address: 'Rua Hermann Faulhaber, Panambi - RS (IFFAR)',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    user_id: userId
  }
];

export function getSupabaseConfig() {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to parse Supabase config', e);
  }
  return DEFAULT_CONFIG;
}

export function saveSupabaseConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  // Force page reload or trigger subscribers
  window.dispatchEvent(new Event('supabase-config-changed'));
}

// Global listeners for database action logging so we can show a live Supabase SQL log stream!
const logListeners = new Set();

export function subscribeToSupabaseLogs(callback) {
  logListeners.add(callback);
  return () => {
    logListeners.delete(callback);
  };
}

function logAction(type, method, query) {
  const timestamp = new Date().toLocaleTimeString();
  logListeners.forEach(cb => cb({ type, method, query, timestamp }));
}

// Client cache to avoid rebuilding client repeatedly
let cachedClient = null;

export function getRealSupabaseClient() {
  const config = getSupabaseConfig();
  if (config.useRealSupabase && config.url && config.anonKey) {
    if (!cachedClient) {
      cachedClient = createClient(config.url, config.anonKey);
    }
    return cachedClient;
  }
  cachedClient = null;
  return null;
}

// Simulated Supabase Engine
class MockSupabaseAuth {
  getSavedUser() {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    return saved ? JSON.parse(saved) : null;
  }

  saveUser(user) {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  }

  async signUp({ email, password }) {
    logAction('info', 'auth.signUp()', `INSERT INTO auth.users (email) VALUES ('${email}')`);
    await new Promise(resolve => setTimeout(resolve, 600));

    // Basic email validation
    if (!email || !email.includes('@')) {
      logAction('error', 'auth.signUp()', 'Invalid email format');
      return { data: { user: null }, error: { message: 'Formato de e-mail inválido.' } };
    }
    if (password.length < 6) {
      logAction('error', 'auth.signUp()', 'Password too short');
      return { data: { user: null }, error: { message: 'A senha deve ter pelo menos 6 caracteres.' } };
    }

    // Check if user already exists in simulated storage
    const users = JSON.parse(localStorage.getItem('rotina_mock_users') || '[]');
    if (users.find((u) => u.email === email)) {
      logAction('error', 'auth.signUp()', 'User already exists');
      return { data: { user: null }, error: { message: 'Este e-mail já está cadastrado.' } };
    }

    const newUser = { id: 'usr_' + Math.random().toString(36).substr(2, 9), email };
    users.push({ ...newUser, password });
    localStorage.setItem('rotina_mock_users', JSON.stringify(users));

    this.saveUser(newUser);
    logAction('success', 'auth.signUp()', `User created with ID ${newUser.id}`);
    return { data: { user: newUser, session: { access_token: 'mock-token' } }, error: null };
  }

  async signInWithPassword({ email, password }) {
    logAction('info', 'auth.signInWithPassword()', `SELECT * FROM auth.users WHERE email = '${email}'`);
    await new Promise(resolve => setTimeout(resolve, 500));

    const users = JSON.parse(localStorage.getItem('rotina_mock_users') || '[]');
    const found = users.find((u) => u.email === email && u.password === password);

    if (found) {
      const user = { id: found.id, email: found.email };
      this.saveUser(user);
      logAction('success', 'auth.signInWithPassword()', `Login successful. User ID: ${user.id}`);
      return { data: { user, session: { access_token: 'mock-token-' + user.id } }, error: null };
    } else {
      logAction('error', 'auth.signInWithPassword()', 'Authentication failed');
      return { data: { user: null, session: null }, error: { message: 'E-mail ou senha incorretos.' } };
    }
  }

  async signOut() {
    logAction('info', 'auth.signOut()', 'Terminating session');
    this.saveUser(null);
    logAction('success', 'auth.signOut()', 'Logged out');
    return { error: null };
  }

  async getSession() {
    const user = this.getSavedUser();
    if (user) {
      return { data: { session: { user, access_token: 'mock-token-' + user.id } }, error: null };
    }
    return { data: { session: null }, error: null };
  }
}

class MockSupabaseQueryBuilder {
  constructor(tableName) {
    this.tableName = tableName;
  }

  getCurrentUserId() {
    const userJson = localStorage.getItem(AUTH_USER_KEY);
    if (!userJson) return '';
    return JSON.parse(userJson).id;
  }

  getTasks() {
    const currentUserId = this.getCurrentUserId();
    if (!currentUserId) return [];
    
    const saved = localStorage.getItem(TASKS_KEY);
    if (saved) {
      const allTasks = JSON.parse(saved);
      // Simulate Supabase Row Level Security (RLS) - Filter by current user
      return allTasks.filter(t => t.user_id === currentUserId);
    }
    
    // Seed database if empty for this user
    const seeded = INITIAL_MOCK_TASKS(currentUserId);
    this.saveTasks(seeded);
    return seeded;
  }

  saveTasks(tasks) {
    const currentUserId = this.getCurrentUserId();
    const saved = localStorage.getItem(TASKS_KEY);
    let allTasks = saved ? JSON.parse(saved) : [];
    
    // Remove all tasks belonging to current user first
    allTasks = allTasks.filter(t => t.user_id !== currentUserId);
    // Add new user tasks back
    allTasks.push(...tasks);
    
    localStorage.setItem(TASKS_KEY, JSON.stringify(allTasks));
  }

  // Chainable API
  async select(columns = '*') {
    logAction('info', `from('${this.tableName}').select('${columns}')`, `SELECT ${columns} FROM ${this.tableName} WHERE user_id = CURRENT_USER`);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (this.tableName === 'tasks') {
      const data = this.getTasks();
      logAction('success', `from('${this.tableName}').select()`, `Loaded ${data.length} tasks from local simulated storage.`);
      return { data, error: null };
    }
    return { data: [], error: null };
  }

  async insert(record) {
    const recordStr = JSON.stringify(record);
    logAction('info', `from('${this.tableName}').insert()`, `INSERT INTO ${this.tableName} VALUES ${recordStr}`);
    await new Promise(resolve => setTimeout(resolve, 450));

    if (this.tableName === 'tasks') {
      const tasks = this.getTasks();
      const currentUserId = this.getCurrentUserId();
      
      const newTask = {
        id: Math.random().toString(36).substr(2, 9),
        title: record.title || 'Nova Tarefa',
        description: record.description || '',
        priority: record.priority || 'media',
        status: record.status || 'pendente',
        latitude: record.latitude,
        longitude: record.longitude,
        address: record.address || 'Localização personalizada',
        created_at: new Date().toISOString(),
        user_id: currentUserId
      };

      tasks.unshift(newTask);
      this.saveTasks(tasks);
      
      logAction('success', `from('${this.tableName}').insert()`, `Task inserted successfully with ID ${newTask.id}`);
      return { data: [newTask], error: null };
    }
    return { data: null, error: { message: 'Table not supported' } };
  }

  async update(updates) {
    const updatesStr = JSON.stringify(updates);
    logAction('info', `from('${this.tableName}').update()`, `UPDATE ${this.tableName} SET ${updatesStr} WHERE user_id = CURRENT_USER`);
    
    return {
      eq: async (column, value) => {
        logAction('info', `eq('${column}', '${value}')`, `... AND ${column} = '${value}'`);
        await new Promise(resolve => setTimeout(resolve, 400));

        if (this.tableName === 'tasks') {
          const tasks = this.getTasks();
          const index = tasks.findIndex(t => t[column] === value);
          
          if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            this.saveTasks(tasks);
            logAction('success', `from('${this.tableName}').update()`, `Successfully updated task ${value}`);
            return { data: [tasks[index]], error: null };
          }
          logAction('error', `from('${this.tableName}').update()`, `Task with ${column} = ${value} not found`);
          return { data: null, error: { message: 'Task not found' } };
        }
        return { data: null, error: null };
      }
    };
  }

  async delete() {
    logAction('info', `from('${this.tableName}').delete()`, `DELETE FROM ${this.tableName} WHERE user_id = CURRENT_USER`);
    
    return {
      eq: async (column, value) => {
        logAction('info', `eq('${column}', '${value}')`, `... AND ${column} = '${value}'`);
        await new Promise(resolve => setTimeout(resolve, 400));

        if (this.tableName === 'tasks') {
          const tasks = this.getTasks();
          const filtered = tasks.filter(t => t[column] !== value);
          this.saveTasks(filtered);
          logAction('success', `from('${this.tableName}').delete()`, `Deleted task where ${column} = ${value}`);
          return { error: null };
        }
        return { error: null };
      }
    };
  }
}

// Combined export mimicking the supabase-js wrapper
export const supabaseMock = {
  auth: new MockSupabaseAuth(),
  from: (tableName) => new MockSupabaseQueryBuilder(tableName)
};

// Unified dynamic service that routes requests to either real Supabase or the simulator
export const rotinaService = {
  isRealEnabled() {
    return !!getRealSupabaseClient();
  },

  async signUp(email, password) {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Attempting signup for ${email}`);
      const { data, error } = await realClient.auth.signUp({ email, password });
      if (error) {
        logAction('error', 'Supabase Real', `Signup failed: ${error.message}`);
        return { data: null, error };
      }
      logAction('success', 'Supabase Real', `Signup succeeded: User ID ${data.user?.id}`);
      return { data, error: null };
    } else {
      return supabaseMock.auth.signUp({ email, password });
    }
  },

  async signIn(email, password) {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Attempting signin for ${email}`);
      const { data, error } = await realClient.auth.signInWithPassword({ email, password });
      if (error) {
        logAction('error', 'Supabase Real', `Signin failed: ${error.message}`);
        return { data: null, error };
      }
      logAction('success', 'Supabase Real', `Signin succeeded: User ID ${data.user?.id}`);
      return { data, error: null };
    } else {
      return supabaseMock.auth.signInWithPassword({ email, password });
    }
  },

  async signOut() {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', 'Attempting logout');
      const { error } = await realClient.auth.signOut();
      if (error) {
        logAction('error', 'Supabase Real', `Logout error: ${error.message}`);
        return { error };
      }
      logAction('success', 'Supabase Real', 'Logged out of Supabase');
      return { error: null };
    } else {
      return supabaseMock.auth.signOut();
    }
  },

  async getSession() {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      const { data, error } = await realClient.auth.getSession();
      return { data, error };
    } else {
      return supabaseMock.auth.getSession();
    }
  },

  async getTasks() {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Fetching tasks from 'tarefas' table`);
      const { data, error } = await realClient
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        logAction('error', 'Supabase Real', `Failed to load tasks: ${error.message}`);
        return { data: [], error };
      }
      logAction('success', 'Supabase Real', `Loaded ${data?.length || 0} tasks from Supabase.`);
      return { data, error: null };
    } else {
      const { data, error } = await supabaseMock.from('tasks').select('*');
      const sorted = data ? [...data].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) : [];
      return { data: sorted, error };
    }
  },

  async createTask(task) {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Inserting task: ${task.title}`);
      
      const { data: { session } } = await realClient.auth.getSession();
      if (!session || !session.user) {
        return { data: null, error: { message: 'Você precisa estar autenticado.' } };
      }

      const { data, error } = await realClient
        .from('tasks')
        .insert([{
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: 'pendente',
          latitude: task.latitude,
          longitude: task.longitude,
          address: task.address,
          user_id: session.user.id
        }])
        .select();

      if (error) {
        logAction('error', 'Supabase Real', `Create task failed: ${error.message}`);
        return { data: null, error };
      }
      logAction('success', 'Supabase Real', `Created task successfully.`);
      return { data: data ? data[0] : null, error: null };
    } else {
      const { data, error } = await supabaseMock.from('tasks').insert(task);
      return { data: data ? data[0] : null, error };
    }
  },

  async updateTaskStatus(id, isCompleted) {
    const statusStr = isCompleted ? 'concluida' : 'pendente';
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Updating status of ${id} to ${statusStr}`);
      const { data, error } = await realClient
        .from('tasks')
        .update({ status: statusStr })
        .eq('id', id)
        .select();

      if (error) {
        logAction('error', 'Supabase Real', `Failed to update status: ${error.message}`);
        return { data: null, error };
      }
      logAction('success', 'Supabase Real', `Updated task status.`);
      return { data: data ? data[0] : null, error: null };
    } else {
      const { data, error } = await (await supabaseMock.from('tasks').update({ status: statusStr })).eq('id', id);
      return { data, error };
    }
  },

  async updateTask(id, updates) {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Updating task ${id}`);
      const { data, error } = await realClient
        .from('tasks')
        .update({
          title: updates.title,
          description: updates.description,
          priority: updates.priority,
          status: updates.status,
          latitude: updates.latitude,
          longitude: updates.longitude,
          address: updates.address
        })
        .eq('id', id)
        .select();

      if (error) {
        logAction('error', 'Supabase Real', `Update failed: ${error.message}`);
        return { data: null, error };
      }
      logAction('success', 'Supabase Real', `Updated task details.`);
      return { data: data ? data[0] : null, error: null };
    } else {
      const { data, error } = await (await supabaseMock.from('tasks').update(updates)).eq('id', id);
      return { data, error };
    }
  },

  async deleteTask(id) {
    const realClient = getRealSupabaseClient();
    if (realClient) {
      logAction('info', 'Supabase Real', `Deleting task ${id}`);
      const { error } = await realClient
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) {
        logAction('error', 'Supabase Real', `Delete failed: ${error.message}`);
        return { error };
      }
      logAction('success', 'Supabase Real', `Deleted task.`);
      return { error: null };
    } else {
      return (await supabaseMock.from('tasks').delete()).eq('id', id);
    }
  }
};

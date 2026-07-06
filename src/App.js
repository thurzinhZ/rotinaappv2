import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { rotinaService, getSupabaseConfig } from './supabaseClient';

// Importing Custom Simulated Components
import GpsSimulator from './components/GpsSimulator';
import SupabaseSettings from './components/SupabaseSettings';
import MapComponent from './components/MapComponent';

// Importing Phone Screens
import LoginScreen from './components/LoginScreen';
import CadastroScreen from './components/CadastroScreen';
import TaskListScreen from './components/TaskListScreen';
import TaskFormModal from './components/TaskFormModal';

// Icons from lucide-react
import {
  ListTodo,
  Map,
  Settings,
  User,
  LogOut,
  Bell,
  Sparkles,
  Server,
  Database,
  X,
  Wifi,
  Battery,
  Info
} from 'lucide-react';

export default function App() {
  // Session State
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [currentScreen, setCurrentScreen] = useState('login');

  // App Database States
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('lista');

  // Modals state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);
  const [showSupabaseSettings, setShowSupabaseSettings] = useState(false);
  const [selectedPinTask, setSelectedPinTask] = useState(null);

  // Simulated GPS Location State
  // Initial center set around Panambi, RS
  const [userLocation, setUserLocation] = useState({
    latitude: -28.2922,
    longitude: -53.5015
  });

  // Simulated Push Notification Banner state
  const [activeNotification, setActiveNotification] = useState(null);

  // Selected Notification Radius (100, 300, 500, 1000 meters)
  const [geofenceRadius, setGeofenceRadius] = useState(() => {
    const saved = localStorage.getItem('geofenceRadius');
    return saved ? Number(saved) : 300;
  });

  // Active Connection Config
  const [dbConfig, setDbConfig] = useState(getSupabaseConfig());

  // 1. Initial Authentication & Session Load
  const checkSession = async () => {
    setSessionLoading(true);
    try {
      const { data } = await rotinaService.getSession();
      if (data?.session?.user) {
        setCurrentUser(data.session.user);
        setCurrentScreen('app');
        fetchTasks();
      } else {
        setCurrentUser(null);
        setCurrentScreen('login');
      }
    } catch (e) {
      console.error('Session load failed', e);
      setCurrentUser(null);
      setCurrentScreen('login');
    } finally {
      setSessionLoading(false);
    }
  };

  useEffect(() => {
    checkSession();

    // Listen to changes in Supabase URL config to live reload
    const handleConfigChange = () => {
      setDbConfig(getSupabaseConfig());
      checkSession();
    };

    window.addEventListener('supabase-config-changed', handleConfigChange);
    return () => {
      window.removeEventListener('supabase-config-changed', handleConfigChange);
    };
  }, []);

  // 2. Fetch Tasks from Supabase (or Mock Storage)
  const fetchTasks = async () => {
    if (!currentUser) return;
    setTasksLoading(true);
    try {
      const { data } = await rotinaService.getTasks();
      if (data) {
        setTasks(data);
      }
    } catch (e) {
      console.error('Failed to load tasks', e);
    } finally {
      setTasksLoading(false);
    }
  };

  // Trigger tasks refetch when user signs in or tab changes
  useEffect(() => {
    if (currentUser) {
      fetchTasks();
    }
  }, [currentUser]);

  // 3. Mark Task Status completed / pending
  const handleToggleTaskStatus = async (id, isCurrentlyCompleted) => {
    try {
      await rotinaService.updateTaskStatus(id, !isCurrentlyCompleted);
      // Refetch or update local list state
      setTasks(prev =>
        prev.map(task => {
          if (task.id === id) {
            return { ...task, status: isCurrentlyCompleted ? 'pendente' : 'concluida' };
          }
          return task;
        })
      );
    } catch (e) {
      console.error('Failed to toggle status', e);
    }
  };

  // 4. Save Task succeeded (Create or Edit)
  const handleSaveTaskSuccess = () => {
    setShowTaskForm(false);
    setTaskToEdit(null);
    fetchTasks();
  };

  const handleDeleteTaskSuccess = () => {
    setShowTaskForm(false);
    setTaskToEdit(null);
    fetchTasks();
  };

  // 5. Auth Success Handlers
  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentScreen('app');
  };

  const handleCadastroSuccess = (user) => {
    setCurrentUser(user);
    setCurrentScreen('app');
  };

  // 6. Sign Out Handler
  const handleSignOut = async () => {
    await rotinaService.signOut();
    setCurrentUser(null);
    setCurrentScreen('login');
    setTasks([]);
    setActiveTab('lista');
  };

  // 7. Simulated Proximity Notification Trigger
  const handleProximityAlert = (task) => {
    setActiveNotification(task);
    
    // Play virtual notification beep using Web Audio API!
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime); // subtle volume

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.15); // play for 150ms
    } catch (err) {
      console.log('Web Audio API not allowed or supported yet');
    }

    // Auto dismiss notification banner after 6 seconds
    setTimeout(() => {
      setActiveNotification(null);
    }, 6000);
  };

  const handleNotificationClick = () => {
    if (activeNotification) {
      // Go to map to view the task
      setActiveTab('mapa');
      setSelectedPinTask(activeNotification);
      setActiveNotification(null);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#f0f4f8] font-sans overflow-hidden select-none text-slate-800">
      
      {/* 1. Left Sidebar: Simulated Location Control Room & Server Activity Console */}
      <div className="hidden lg:flex flex-col w-[350px] shrink-0 border-r border-slate-200 bg-slate-50 overflow-hidden">
        
        {/* Sidebar Header Brand */}
        <div className="p-5 border-b border-slate-200 bg-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/35">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-extrabold text-base text-slate-900 tracking-tight">RotinaApp</h1>
              <p className="text-[10px] font-bold text-indigo-600 tracking-wide">PAINEL CONTROLE</p>
            </div>
          </div>
          
          {/* Supabase official settings trigger */}
          <button
            onClick={() => setShowSupabaseSettings(true)}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-500 transition cursor-pointer"
            title="Configurações Supabase"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {/* GPS Simulation section */}
        <div className="flex-1 overflow-hidden">
          <GpsSimulator
            tasks={tasks}
            userLocation={userLocation}
            onLocationChange={(lat, lng) => setUserLocation({ latitude: lat, longitude: lng })}
            onSimulatedNotification={handleProximityAlert}
            geofenceRadius={geofenceRadius}
          />
        </div>

      </div>

      {/* 2. Main Content Center: Highly detailed iPhone Mockup & Live Map Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Background Map canvas taking full area */}
        <div className="flex-1 h-full z-0 relative">
          <MapComponent
            tasks={tasks}
            userLocation={userLocation}
            onTaskSelect={(task) => {
              setSelectedPinTask(task);
            }}
            geofenceRadius={geofenceRadius}
          />

          {/* Interactive Floating Status HUD over map for smaller screens */}
          <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2 pointer-events-none md:pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md border border-slate-200 p-3.5 rounded-2xl shadow-xl flex items-center gap-3">
              <div className={`p-2 rounded-xl ${dbConfig.useRealSupabase ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                {dbConfig.useRealSupabase ? <Server className="w-4 h-4" /> : <Database className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Conexão Ativa</span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5">
                  {dbConfig.useRealSupabase ? 'Supabase Cloud (Real)' : 'Simulador Offline'}
                </span>
              </div>
              <button
                onClick={() => setShowSupabaseSettings(true)}
                className="pointer-events-auto ml-2 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-1.5 px-3 border border-indigo-100 rounded-xl transition cursor-pointer"
              >
                Alterar
              </button>
            </div>
          </div>
        </div>

        {/* 3. Right side: Smartphone Simulator Frame */}
        <div className="w-full md:w-[460px] shrink-0 border-l border-slate-200 bg-slate-50 flex flex-col p-4 md:p-6 shadow-2xl relative z-10 overflow-y-auto">
          
          <div className="flex flex-col items-center justify-center flex-1 w-full">
            {/* Phone Shell frame container */}
            <div className="w-full max-w-[360px] aspect-[9/19] bg-slate-900 rounded-[48px] border-[12px] border-slate-900 shadow-2xl shadow-slate-300/80 overflow-hidden flex flex-col relative ring-4 ring-indigo-600/5">
              
              {/* Phone Top Notch camera element */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-slate-900 rounded-b-2xl z-[2000] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-950 border border-slate-800" />
                <div className="w-10 h-1 bg-slate-950 rounded-full ml-4" />
              </div>

              {/* Virtual Status Bar */}
              <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 text-slate-800 z-[1999] select-none text-[10px] font-semibold pt-1">
                <span>10:24</span>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-slate-700" />
                  <span className="text-[9px] font-extrabold text-slate-700">5G</span>
                  <Battery className="w-4 h-3.5 text-slate-700" />
                </div>
              </div>

                {/* Virtual Push Notification Overlay */}
                <AnimatePresence>
                  {activeNotification && (
                    <motion.div
                      initial={{ y: -100, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -100, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                      onClick={handleNotificationClick}
                      className="absolute top-11 left-3 right-3 bg-white/95 backdrop-blur-md border border-slate-100 p-3.5 rounded-2xl shadow-xl z-[5000] cursor-pointer flex items-start gap-3 select-none hover:bg-slate-50 active:scale-98 transition duration-150"
                    >
                      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-600/35">
                        <Bell className="w-4 h-4 animate-swing" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] uppercase font-bold text-indigo-600">RotinaApp • Alerta de Local</span>
                          <span className="text-[9px] text-slate-400">Agora</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 truncate mt-0.5">{activeNotification.title}</p>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5">Você está a menos de {geofenceRadius}m do local!</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Internal Phone Viewport Container */}
                <div className="flex-1 overflow-hidden bg-[#f0f4f8] relative flex flex-col">
                  {sessionLoading ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 gap-2">
                      <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-bold text-slate-600">Carregando Sessão...</span>
                    </div>
                  ) : currentScreen === 'login' ? (
                    <LoginScreen
                      onLoginSuccess={handleLoginSuccess}
                      onNavigateToCadastro={() => setCurrentScreen('cadastro')}
                    />
                  ) : currentScreen === 'cadastro' ? (
                    <CadastroScreen
                      onCadastroSuccess={handleCadastroSuccess}
                      onNavigateToLogin={() => setCurrentScreen('login')}
                    />
                  ) : (
                    // Authenticated Mobile Application Shell
                    <div className="flex-1 flex flex-col h-full overflow-hidden">
                      
                      {/* Virtual Tab Contents */}
                      <div className="flex-1 overflow-hidden relative">
                        {activeTab === 'lista' && (
                          <TaskListScreen
                            tasks={tasks}
                            onToggleStatus={handleToggleTaskStatus}
                            onEditTask={(task) => {
                              setTaskToEdit(task);
                              setShowTaskForm(true);
                            }}
                            onNewTaskClick={() => {
                              setTaskToEdit(null);
                              setShowTaskForm(true);
                            }}
                          />
                        )}

                        {activeTab === 'mapa' && (
                          <div className="w-full h-full relative">
                            <MapComponent
                              tasks={tasks}
                              userLocation={userLocation}
                              onTaskSelect={(task) => {
                                setSelectedPinTask(task);
                              }}
                              geofenceRadius={geofenceRadius}
                            />
                            
                            {/* Selected PIN Task details Overlay in Mobile tab */}
                            {selectedPinTask && (
                              <div className="absolute bottom-4 left-3 right-3 bg-white border border-slate-200 p-4 rounded-2xl shadow-2xl z-[450] animate-slide-up flex flex-col text-slate-800">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span className={`text-[8px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                                      selectedPinTask.status === 'concluida'
                                        ? 'border-slate-200 bg-slate-50 text-slate-500'
                                        : selectedPinTask.priority === 'alta'
                                          ? 'border-rose-200 bg-rose-50 text-rose-600'
                                          : 'border-indigo-200 bg-indigo-50 text-indigo-600'
                                    }`}>
                                      {selectedPinTask.priority} • {selectedPinTask.status}
                                    </span>
                                    <h4 className="font-extrabold text-sm text-slate-900 mt-2.5 leading-tight">{selectedPinTask.title}</h4>
                                  </div>
                                  <button
                                    onClick={() => setSelectedPinTask(null)}
                                    className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                
                                {selectedPinTask.description && (
                                  <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                                    {selectedPinTask.description}
                                  </p>
                                )}

                                {/* Actions on task pin details card */}
                                <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
                                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[150px]">
                                    {selectedPinTask.address}
                                  </span>

                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        handleToggleTaskStatus(selectedPinTask.id, selectedPinTask.status === 'concluida');
                                        setSelectedPinTask(null);
                                      }}
                                      className="text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-xl transition cursor-pointer"
                                    >
                                      {selectedPinTask.status === 'concluida' ? 'Reabrir' : 'Concluir'}
                                    </button>
                                    <button
                                      onClick={() => {
                                        setTaskToEdit(selectedPinTask);
                                        setShowTaskForm(true);
                                        setSelectedPinTask(null);
                                      }}
                                      className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-3 rounded-xl border border-slate-200 transition cursor-pointer"
                                    >
                                      Editar
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {activeTab === 'perfil' && (
                          <div className="p-5 flex flex-col h-full justify-between bg-white animate-fade-in text-slate-800">
                            <div className="space-y-4 overflow-y-auto max-h-[400px] no-scrollbar pr-0.5">
                              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Perfil do Usuário</h2>
                              
                              {/* User card summary */}
                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm uppercase shadow-lg shadow-indigo-600/20">
                                  {currentUser?.email?.substr(0, 2)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[9px] text-indigo-600 block uppercase font-bold tracking-wider">E-mail Conectado</p>
                                  <p className="text-xs font-extrabold text-slate-850 truncate">{currentUser?.email}</p>
                                </div>
                              </div>

                              {/* App Stats summary */}
                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-xs">
                                  <span className="text-2xl font-extrabold text-slate-900 font-mono block">
                                    {tasks.filter(t => t.status === 'pendente').length}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Pendentes</span>
                                </div>
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center shadow-xs">
                                  <span className="text-2xl font-extrabold text-indigo-600 font-mono block">
                                    {tasks.filter(t => t.status === 'concluida').length}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mt-1">Concluídas</span>
                                </div>
                              </div>

                              {/* Geofence Radius Config */}
                              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                                <div className="flex items-center gap-2">
                                  <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span className="text-xs font-extrabold text-slate-800">Raio de Notificação</span>
                                </div>
                                <p className="text-[10px] text-slate-500 leading-normal">
                                  Defina a distância para disparar notificações automáticas ao se aproximar dos locais das tarefas:
                                </p>
                                <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                                  {[100, 300, 500, 1000].map((radius) => (
                                    <button
                                      key={radius}
                                      onClick={() => {
                                        setGeofenceRadius(radius);
                                        localStorage.setItem('geofenceRadius', radius.toString());
                                      }}
                                      className={`py-1.5 px-0.5 rounded-xl text-[11px] font-extrabold border transition duration-150 cursor-pointer text-center ${
                                        geofenceRadius === radius
                                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-150'
                                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                      }`}
                                    >
                                      {radius}m
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <div className="pt-1 text-[10px] text-slate-500 leading-relaxed space-y-2.5">
                                <p className="flex gap-2.5 items-start">
                                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                  <span>Sessões autenticadas e tarefas adicionadas são preservadas em seu dispositivo.</span>
                                </p>
                                <p className="flex gap-2.5 items-start">
                                  <Server className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                                  <span>Conecte com sua conta oficial Supabase para sincronizar entre múltiplos dispositivos.</span>
                                </p>
                              </div>
                            </div>

                            {/* Sign Out Button */}
                            <button
                              onClick={handleSignOut}
                              className="w-full bg-rose-50 hover:bg-rose-100 hover:text-rose-700 text-rose-600 border border-rose-100 font-bold py-3 rounded-xl text-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <LogOut className="w-4 h-4" /> Terminar Sessão
                            </button>
                          </div>
                        )}

                        {/* Draggable location creation forms modal */}
                        {showTaskForm && (
                          <TaskFormModal
                            taskToEdit={taskToEdit}
                            userLocation={userLocation}
                            onClose={() => {
                              setShowTaskForm(false);
                              setTaskToEdit(null);
                            }}
                            onSaveSuccess={handleSaveTaskSuccess}
                            onDeleteSuccess={handleDeleteTaskSuccess}
                          />
                        )}
                      </div>

                      {/* Phone Bottom Tab Navigator Menu bar */}
                      <div className="h-14 bg-white border-t border-slate-100 px-6 shrink-0 flex items-center justify-around text-slate-400 z-[490]">
                        <button
                          onClick={() => setActiveTab('lista')}
                          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeTab === 'lista' ? 'text-indigo-600 font-bold' : 'hover:text-slate-600'}`}
                        >
                          <ListTodo className="w-5 h-5" />
                          <span className="text-[8px] uppercase font-bold tracking-wider">Tarefas</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('mapa')}
                          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeTab === 'mapa' ? 'text-indigo-600 font-bold' : 'hover:text-slate-600'}`}
                        >
                          <Map className="w-5 h-5" />
                          <span className="text-[8px] uppercase font-bold tracking-wider">Mapa</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('perfil')}
                          className={`flex flex-col items-center gap-1 transition cursor-pointer ${activeTab === 'perfil' ? 'text-indigo-600 font-bold' : 'hover:text-slate-600'}`}
                        >
                          <User className="w-5 h-5" />
                          <span className="text-[8px] uppercase font-bold tracking-wider">Perfil</span>
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* Simulated iPhone Bottom Home Indicator Bar */}
                <div className="h-4 bg-white shrink-0 w-full flex justify-center items-center pb-2 z-[2000]">
                  <div className="w-28 h-1 bg-slate-200 rounded-full" />
                </div>

              </div>

              {/* Desktop interactive controls underneath the phone */}
              <div className="mt-4 flex items-center gap-3 md:hidden">
                <button
                  onClick={() => setShowSupabaseSettings(true)}
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-indigo-300 py-1.5 px-3 rounded-lg border border-slate-700/80 transition"
                >
                  Configurar Supabase
                </button>
              </div>
            </div>

        </div>

      </div>

      {/* 4. Supabase Integration Setup Modal Dialog */}
      {showSupabaseSettings && (
        <SupabaseSettings onClose={() => setShowSupabaseSettings(false)} />
      )}

    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Navigation, Play, Square, Compass, RotateCcw, ShieldAlert, CheckCircle, Info } from 'lucide-react';

// Preset locations centered around Panambi, RS coordinates
const PRESETS = [
  { name: 'Centro de Panambi (Início)', lat: -28.2922, lng: -53.5015, description: 'Ponto de partida central' },
  { name: 'Supermercado Cotripal', lat: -28.2911, lng: -53.4990, description: 'Cotripal é o principal mercado da cidade' },
  { name: 'Hospital Panambi', lat: -28.2955, lng: -53.5040, description: 'Atendimento de saúde' },
  { name: 'Praça da República', lat: -28.2916, lng: -53.5012, description: 'Praça central de lazer' },
  { name: 'Parque Rudolfo Arno Goldhardt', lat: -28.2872, lng: -53.5028, description: 'Parque municipal icônico' }
];

// Helper to calculate distance in meters between two lat/lng coordinates (Haversine Formula)
export function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

export default function GpsSimulator({
  tasks,
  userLocation,
  onLocationChange,
  onSimulatedNotification,
  geofenceRadius = 300
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // multiplier
  const [selectedPreset, setSelectedPreset] = useState(0);
  const timerRef = useRef(null);
  const angleRef = useRef(0);

  // Filter tasks that are pending for the alerts
  const pendingTasks = tasks.filter(t => t.status === 'pendente');

  // Tracking which tasks have already been triggered in the current walk to avoid spamming alerts
  const [triggeredTasks, setTriggeredTasks] = useState({});

  // Reset triggers when tasks list change or user resets simulation
  const handleResetSimulation = () => {
    setTriggeredTasks({});
    onLocationChange(PRESETS[0].lat, PRESETS[0].lng);
    setSelectedPreset(0);
    setIsPlaying(false);
  };

  // 1. Core loop of simulated movement
  useEffect(() => {
    if (isPlaying) {
      // Periodic check interval (simulates background or active GPS service)
      const intervalMs = 1000 / speed;

      timerRef.current = setInterval(() => {
        angleRef.current += 0.04; // steps

        // Draw a path circling around Panambi central presets
        // Center around -28.2922, -53.5015
        const centerLat = -28.2922;
        const centerLng = -53.5015;
        
        // Ellipse path touching preset points
        const nextLat = centerLat + 0.005 * Math.sin(angleRef.current);
        const nextLng = centerLng + 0.006 * Math.cos(angleRef.current * 0.7);

        onLocationChange(nextLat, nextLng);
      }, intervalMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed]);

  // 2. Geofence checking loop (Whenever userLocation changes)
  useEffect(() => {
    if (!userLocation || pendingTasks.length === 0) return;

    pendingTasks.forEach(task => {
      const dist = getDistance(
        userLocation.latitude,
        userLocation.longitude,
        task.latitude,
        task.longitude
      );

      // Trigger if distance is less than geofence radius
      if (dist <= geofenceRadius) {
        if (!triggeredTasks[task.id]) {
          // Play a native sound effect or call notify callback
          onSimulatedNotification(task);
          
          // Mark as triggered so we don't alert again for this visit
          setTriggeredTasks(prev => ({ ...prev, [task.id]: true }));
        }
      } else {
        // Reset trigger if user moves far away (so they can trigger again if they return)
        if (dist > geofenceRadius * 2 && triggeredTasks[task.id]) {
          setTriggeredTasks(prev => {
            const copy = { ...prev };
            delete copy[task.id];
            return copy;
          });
        }
      }
    });
  }, [userLocation, pendingTasks, triggeredTasks]);

  const selectPresetLocation = (idx) => {
    setSelectedPreset(idx);
    setIsPlaying(false);
    onLocationChange(PRESETS[idx].lat, PRESETS[idx].lng);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200 p-5 select-none text-slate-700 overflow-y-auto no-scrollbar">
      {/* Title & Badge */}
      <div className="flex items-center gap-2 mb-4">
        <Compass className="w-5 h-5 text-indigo-600 animate-spin-slow" />
        <h2 className="text-sm font-extrabold tracking-tight text-slate-900">Simulador de GPS</h2>
        <span className="ml-auto text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold border border-emerald-100">
          Ativo
        </span>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed mb-5 font-medium">
        Use este painel para simular a caminhada do "dispositivo virtual" e testar as notificações de proximidade (raio de {geofenceRadius}m).
      </p>

      {/* Controller Buttons */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 mb-5 shadow-xs">
        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">Movimento Automático</span>
        
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <button
              onClick={() => setIsPlaying(false)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs transition active:scale-95 text-white cursor-pointer shadow-sm shadow-rose-100"
            >
              <Square className="w-3.5 h-3.5 fill-current" /> Parar Caminhada
            </button>
          ) : (
            <button
              onClick={() => setIsPlaying(true)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs transition active:scale-95 text-white cursor-pointer shadow-sm shadow-indigo-100"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> Iniciar Caminhada
            </button>
          )}

          <button
            onClick={handleResetSimulation}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 transition cursor-pointer"
            title="Resetar Posição e Alertas"
          >
            <RotateCcw className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Speed Controls */}
        {isPlaying && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400">Velocidade da simulação:</span>
            <div className="flex gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
              {[1, 2, 5, 10].map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${
                    speed === s ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Preset Fast Travel Coordinates */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Teletransporte GPS (Presets)</span>
          <Navigation className="w-3.5 h-3.5 text-indigo-600" />
        </div>
        
        <div className="space-y-1.5 max-h-48 overflow-y-auto no-scrollbar pr-0.5">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => selectPresetLocation(idx)}
              className={`w-full text-left p-3 rounded-xl border transition flex flex-col cursor-pointer ${
                selectedPreset === idx && !isPlaying
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-900 shadow-xs'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`text-xs font-bold ${selectedPreset === idx && !isPlaying ? 'text-indigo-900' : 'text-slate-800'}`}>{preset.name}</span>
                <span className="text-[9px] font-mono text-slate-400">
                  {preset.lat.toFixed(4)}, {preset.lng.toFixed(4)}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 mt-0.5">{preset.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic Proximity Tracker List */}
      <div className="flex-1 min-h-[220px]">
        <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block mb-3">
          Monitoramento de Proximidade ({pendingTasks.length})
        </span>

        {pendingTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 bg-white text-center shadow-xs">
            <CheckCircle className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-400">Nenhuma tarefa pendente</p>
            <p className="text-[10px] text-slate-400 mt-1">Crie tarefas com locais no mapa para monitorar.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto no-scrollbar pr-0.5">
            {pendingTasks.map(task => {
              const distance = getDistance(
                userLocation.latitude,
                userLocation.longitude,
                task.latitude,
                task.longitude
              );

              const isTriggered = distance <= geofenceRadius;
              let priorityColor = 'border-indigo-100 bg-indigo-50 text-indigo-600';
              if (task.priority === 'alta') {
                priorityColor = 'border-rose-100 bg-rose-50 text-rose-600';
              } else if (task.priority === 'baixa') {
                priorityColor = 'border-emerald-100 bg-emerald-50 text-emerald-600';
              }

              return (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border transition duration-300 flex items-start gap-2.5 ${
                    isTriggered
                      ? 'bg-indigo-100/50 border-indigo-400 shadow-sm'
                      : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {isTriggered ? (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center animate-pulse shadow-md shadow-indigo-600/30">
                        <ShieldAlert className="w-3.5 h-3.5 text-white" />
                      </div>
                    ) : (
                      <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full border ${priorityColor}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{task.title}</p>
                    
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                      <span className="text-[10px] font-mono text-slate-500">
                        Distância: <span className={`font-bold ${isTriggered ? 'text-indigo-600' : 'text-slate-700'}`}>
                          {distance < 1000 ? `${Math.round(distance)}m` : `${(distance/1000).toFixed(1)}km`}
                        </span>
                      </span>
                    </div>

                    {isTriggered && (
                      <span className="inline-block mt-2 text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-bold border border-indigo-400 animate-pulse">
                        DENTRO DA ÁREA!
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-200 mt-4 flex gap-2 items-start text-[10px] text-slate-400 font-medium">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <p className="leading-snug">
          O aplicativo do celular verificará a localização em segundo plano a cada 1-2 minutos para notificar você mesmo com a tela bloqueada.
        </p>
      </div>
    </div>
  );
}

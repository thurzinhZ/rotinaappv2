import { useState } from 'react';
import { Plus, CheckCircle2, Circle, AlertCircle, Edit2, SlidersHorizontal, MapPin, Search } from 'lucide-react';

export default function TaskListScreen({
  tasks,
  onToggleStatus,
  onEditTask,
  onNewTaskClick
}) {
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterPriority, setFilterPriority] = useState('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters
  const filteredTasks = tasks.filter(task => {
    // 1. Search Query filter
    if (searchQuery.trim() && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // 2. Status filter
    if (filterStatus === 'pendentes' && task.status !== 'pendente') return false;
    if (filterStatus === 'concluidos' && task.status !== 'concluida') return false;

    // 3. Priority filter
    if (filterPriority !== 'todas' && task.priority !== filterPriority) return false;

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8] select-none text-slate-700 animate-fade-in">
      
      {/* Header with Search and New Button */}
      <div className="p-4 border-b border-slate-200 bg-white sticky top-0 z-[10] shadow-sm">
        
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">Suas Tarefas Geográficas</h2>
          <button
            onClick={onNewTaskClick}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition active:scale-95 shadow-lg shadow-indigo-600/25"
          >
            <Plus className="w-4 h-4" /> Nova
          </button>
        </div>

        {/* Search Bar & Filter Toggle */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Buscar por título..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 pl-9 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:bg-white"
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
              showFilters || filterPriority !== 'todas' || filterStatus !== 'todos'
                ? 'bg-indigo-50 border-indigo-300 text-indigo-600'
                : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Drawer (Conditional dropdown) */}
        {showFilters && (
          <div className="mt-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3.5 animate-slide-down shadow-inner">
            
            {/* Status Filter */}
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5">Filtrar por Status</span>
              <div className="flex gap-1.5">
                {['todos', 'pendentes', 'concluidos'].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterStatus(s)}
                    className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg border transition cursor-pointer ${
                      filterStatus === s
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s === 'todos' ? 'Todos' : s === 'pendentes' ? 'Pendentes' : 'Concluídos'}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block mb-1.5">Filtrar por Prioridade</span>
              <div className="flex gap-1.5">
                {['todas', 'alta', 'media', 'baixa'].map(p => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`flex-1 text-[10px] font-bold py-1.5 px-2 rounded-lg border transition capitalize cursor-pointer ${
                      filterPriority === p
                        ? p === 'alta'
                          ? 'bg-rose-600 border-rose-500 text-white shadow-xs'
                          : p === 'media'
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                            : p === 'baixa'
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs'
                              : 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p === 'todas' ? 'Todas' : p === 'media' ? 'média' : p}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Task List Content (FlatList simulator) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 no-scrollbar">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-slate-200 rounded-2xl bg-white/70 shadow-xs">
            <AlertCircle className="w-8 h-8 text-slate-400 mb-2" />
            <p className="text-xs font-bold text-slate-500">Nenhuma tarefa encontrada</p>
            <p className="text-[10px] text-slate-400 mt-1">Experimente mudar os filtros ou crie uma nova tarefa.</p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isCompleted = task.status === 'concluida';
            
            // Priority Tag Color
            let priorityBadgeColor = 'text-indigo-600 border-indigo-100 bg-indigo-50';
            if (task.priority === 'alta') {
              priorityBadgeColor = 'text-rose-600 border-rose-100 bg-rose-50';
            } else if (task.priority === 'baixa') {
              priorityBadgeColor = 'text-emerald-600 border-emerald-100 bg-emerald-50';
            }

            if (isCompleted) {
              priorityBadgeColor = 'text-slate-400 border-slate-200 bg-slate-100';
            }

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition duration-200 flex items-start gap-3 relative ${
                  isCompleted
                    ? 'bg-slate-100/70 border-slate-200 text-slate-400'
                    : 'bg-white border-slate-150 shadow-xs hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-600/[0.02]'
                }`}
              >
                {/* Status Toggle Box */}
                <button
                  onClick={() => onToggleStatus(task.id, isCompleted)}
                  className="mt-0.5 text-slate-450 hover:text-indigo-600 transition transform active:scale-90 cursor-pointer"
                  title={isCompleted ? 'Marcar como Pendente' : 'Marcar como Concluída'}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                  )}
                </button>

                {/* Task Body */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[8px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${priorityBadgeColor}`}>
                      {task.priority === 'media' ? 'média' : task.priority}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono">
                      {new Date(task.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className={`text-xs font-bold mt-1.5 leading-tight ${isCompleted ? 'line-through text-slate-400' : 'text-slate-900 font-extrabold'}`}>
                    {task.title}
                  </h3>

                  {task.description && (
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal line-clamp-2">
                      {task.description}
                    </p>
                  )}

                  {/* Geolocation Tag */}
                  <div className="flex items-center gap-1 mt-2 text-[9px] text-slate-500 font-medium">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{task.address}</span>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => onEditTask(task)}
                  className="absolute right-3.5 bottom-3.5 p-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-400 hover:text-indigo-600 transition active:scale-90 cursor-pointer"
                  title="Editar tarefa"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

import { useState, useEffect } from 'react';
import { rotinaService } from '../supabaseClient';
import { X, MapPin, Loader2, Save, Trash2, Check, AlertCircle } from 'lucide-react';
import MapComponent from './MapComponent';

export default function TaskFormModal({
  taskToEdit,
  userLocation,
  onClose,
  onSaveSuccess,
  onDeleteSuccess
}) {
  const isEditing = !!taskToEdit;
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('media');
  const [status, setStatus] = useState('pendente');
  
  // Geolocation selection
  const [lat, setLat] = useState(userLocation.latitude);
  const [lng, setLng] = useState(userLocation.longitude);
  const [address, setAddress] = useState('');
  const [showMiniMap, setShowMiniMap] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load editing task data
  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description);
      setPriority(taskToEdit.priority);
      setStatus(taskToEdit.status);
      setLat(taskToEdit.latitude);
      setLng(taskToEdit.longitude);
      setAddress(taskToEdit.address || '');
    } else {
      // Default location near Santa Maria center
      setLat(userLocation.latitude);
      setLng(userLocation.longitude);
      setAddress('Perto de mim');
    }
  }, [taskToEdit, userLocation]);

  const handleLocationSelected = (loc) => {
    setLat(loc.latitude);
    setLng(loc.longitude);
    if (loc.address) {
      setAddress(loc.address);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(null);

    // Form validations
    if (!title.trim()) {
      setError('O título é obrigatório.');
      return;
    }

    setLoading(true);

    try {
      const taskPayload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        latitude: Number(lat),
        longitude: Number(lng),
        address: address.trim() || `Coordenadas: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`
      };

      let result;
      if (isEditing && taskToEdit) {
        result = await rotinaService.updateTask(taskToEdit.id, taskPayload);
      } else {
        result = await rotinaService.createTask(taskPayload);
      }

      if (result.error) {
        setError(result.error.message || 'Erro ao salvar tarefa.');
      } else {
        onSaveSuccess();
      }
    } catch (err) {
      setError('Erro ao salvar a tarefa. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!taskToEdit || !onDeleteSuccess) return;
    
    if (confirm('Deseja realmente excluir esta tarefa?')) {
      setLoading(true);
      try {
        const { error: deleteError } = await rotinaService.deleteTask(taskToEdit.id);
        if (deleteError) {
          setError(deleteError.message || 'Erro ao excluir tarefa.');
        } else {
          onDeleteSuccess();
        }
      } catch (err) {
        setError('Erro ao excluir tarefa.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="absolute inset-0 bg-slate-50/98 flex flex-col z-[1000] select-none text-slate-700 animate-slide-up overflow-y-auto no-scrollbar pb-6">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-white sticky top-0 z-[1001] shadow-xs">
        <h2 className="font-extrabold text-sm tracking-tight text-slate-900">
          {isEditing ? 'Editar Tarefa' : 'Nova Tarefa Geográfica'}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-750 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form Content */}
      <div className="p-5 space-y-4 flex-1">
        
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-150 rounded-xl text-xs text-rose-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-tight font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Title */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Título da Tarefa</label>
            <input
              type="text"
              placeholder="Ex: Passar no mercado"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1.5">Anotações / Descrição</label>
            <textarea
              placeholder="Descreva detalhes como itens para comprar, contas a pagar, etc."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition resize-none"
            />
          </div>

          {/* Priority radio selectors */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Prioridade</label>
            <div className="grid grid-cols-3 gap-2">
              {['alta', 'media', 'baixa'].map(p => {
                let badgeStyle = 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50';
                if (priority === p) {
                  if (p === 'alta') badgeStyle = 'bg-rose-50 border-rose-400 text-rose-700 font-extrabold shadow-sm';
                  if (p === 'media') badgeStyle = 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold shadow-sm';
                  if (p === 'baixa') badgeStyle = 'bg-emerald-50 border-emerald-400 text-emerald-700 font-extrabold shadow-sm';
                }

                return (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`border text-center py-2.5 rounded-xl text-xs capitalize transition cursor-pointer flex items-center justify-center gap-1 ${badgeStyle}`}
                  >
                    {priority === p && <Check className="w-3.5 h-3.5" />}
                    {p === 'media' ? 'média' : p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status selector (only shown when editing) */}
          {isEditing && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">Status da Tarefa</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'pendente', label: 'Pendente' },
                  { key: 'concluida', label: 'Concluída' }
                ].map(s => (
                  <button
                    type="button"
                    key={s.key}
                    onClick={() => setStatus(s.key)}
                    className={`border text-center py-2.5 rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                      status === s.key
                        ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-extrabold shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {status === s.key && <Check className="w-3.5 h-3.5" />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Geographic Coordinates Picker */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Local de Ativação (Notificação)
              </label>
              
              <span className="text-[9.5px] font-bold text-indigo-600">
                Toque no mapa abaixo para definir o Marcador (PIN)
              </span>
            </div>

            {/* Address reference input */}
            <input
              type="text"
              placeholder="Referência (ex: Av. Central, 123)"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 transition"
            />

            {/* Small coordinate feedback */}
            <div className="mt-2 flex gap-4 text-[9px] font-mono text-slate-400">
              <span>Lat: {Number(lat).toFixed(5)}</span>
              <span>Lng: {Number(lng).toFixed(5)}</span>
            </div>

            {/* Embedded Location Map Selection */}
            {showMiniMap && (
              <div className="w-full h-44 rounded-xl overflow-hidden border border-slate-200 mt-3 animate-fade-in z-10 relative">
                <MapComponent
                  tasks={[]}
                  userLocation={userLocation}
                  isSelectingLocation={true}
                  selectedLocation={{ latitude: lat, longitude: lng }}
                  onLocationSelect={handleLocationSelected}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-4 flex gap-2">
            
            {isEditing && onDeleteSuccess && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="p-3 rounded-xl bg-rose-50 border border-rose-150 text-rose-600 hover:bg-rose-100 hover:border-rose-200 transition flex items-center justify-center cursor-pointer shadow-xs"
                title="Excluir tarefa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 py-3 rounded-xl font-bold text-xs text-white transition active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Salvar Alterações' : 'Criar Tarefa'}
                </>
              )}
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}

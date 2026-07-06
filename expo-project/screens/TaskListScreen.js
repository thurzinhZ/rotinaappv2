import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert
} from 'react-native';

export default function TaskListScreen({ tasks, onToggleComplete, onEditTask, onAddTask, onLogout }) {
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [search, setSearch] = useState('');

  // Filtragem e busca de tarefas
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // Filtrar por busca textual
      const matchesSearch =
        task.title?.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase()) ||
        task.address?.toLowerCase().includes(search.toLowerCase());

      if (!matchesSearch) return false;

      // Filtrar por status
      if (filter === 'active') return task.status === 'pendente';
      if (filter === 'completed') return task.status === 'concluida';
      return true;
    });
  }, [tasks, filter, search]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'concluida').length;
    const active = total - completed;
    return { total, completed, active };
  }, [tasks]);

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'alta':
        return { container: styles.priorityAlta, text: '#dc2626' };
      case 'media':
        return { container: styles.priorityMedia, text: '#4f46e5' };
      case 'baixa':
        return { container: styles.priorityBaixa, text: '#16a34a' };
      default:
        return { container: styles.priorityBaixa, text: '#475569' };
    }
  };

  const renderTaskItem = ({ item }) => {
    const isCompleted = item.status === 'concluida';
    const pStyle = getPriorityStyle(item.priority);

    return (
      <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
        
        {/* Toggle Complete Checkbox */}
        <TouchableOpacity
          style={[styles.checkbox, isCompleted && styles.checkboxChecked]}
          onPress={() => onToggleComplete(item.id, isCompleted ? 'pendente' : 'concluida')}
        >
          {isCompleted ? <Text style={styles.checkIcon}>✓</Text> : null}
        </TouchableOpacity>

        {/* Task Details Info */}
        <TouchableOpacity style={styles.taskDetails} onPress={() => onEditTask(item)}>
          <View style={styles.taskHeaderRow}>
            <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]} numberOfLines={1}>
              {item.title}
            </Text>
            
            {/* Priority Badge */}
            <View style={[styles.priorityBadge, pStyle.container]}>
              <Text style={[styles.priorityBadgeText, { color: pStyle.text }]}>
                {item.priority === 'media' ? 'média' : item.priority}
              </Text>
            </View>
          </View>

          {item.description ? (
            <Text style={[styles.taskDesc, isCompleted && styles.taskDescCompleted]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}

          {/* Location details */}
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>📍 {item.address || 'Sem endereço definido'}</Text>
          </View>
        </TouchableOpacity>

      </View>
    );
  };

  return (
    <View style={styles.container}>
      
      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="🔍 Buscar tarefas geográficas..."
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filter Toggles Row */}
      <View style={styles.filterRow}>
        {['all', 'active', 'completed'].map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? `Todas (${stats.total})` : f === 'active' ? `Pendentes (${stats.active})` : `Concluídas (${stats.completed})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List Grid/FlatList */}
      <FlatList
        data={filteredTasks}
        keyExtractor={item => item.id}
        renderItem={renderTaskItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={styles.emptyTitle}>Nenhuma tarefa encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Crie uma nova tarefa geográfica clicando no botão de adição abaixo.
            </Text>
          </View>
        )}
      />

      {/* Add Task Floating Action Button (FAB) */}
      <TouchableOpacity style={styles.fab} onPress={onAddTask}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  searchBarContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchBar: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'space-between',
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  filterBtnActive: {
    backgroundColor: '#4f46e5',
  },
  filterBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterBtnTextActive: {
    color: '#ffffff',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 88,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  taskCardCompleted: {
    opacity: 0.65,
    backgroundColor: '#f8fafc',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  checkIcon: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskDetails: {
    flex: 1,
  },
  taskHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  priorityAlta: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  priorityMedia: {
    backgroundColor: '#e0e7ff',
    borderColor: '#c7d2fe',
  },
  priorityBaixa: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  taskDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 10,
  },
  taskDescCompleted: {
    color: '#94a3b8',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4f46e5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
  }
});

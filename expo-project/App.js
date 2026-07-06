import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import MapView, { Marker } from 'react-native-maps';

// Importando Telas
import LoginScreen from './screens/LoginScreen';
import CadastroScreen from './screens/CadastroScreen';
import TaskListScreen from './screens/TaskListScreen';
import MapScreen from './screens/MapScreen';

// Importando Serviços
import {
  supabase,
  initializeCustomSupabase,
  LOCAL_TASKS_KEY,
  LOCAL_USER_KEY,
  LOCAL_SUPABASE_CONFIG_KEY
} from './services/supabase';

// Configurando as Notificações locais no Expo
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function App() {
  const [user, setUser] = useState(null);
  const [currentScreen, setCurrentScreen] = useState('login'); // login, cadastro, app
  const [activeTab, setActiveTab] = useState('tasks'); // tasks, map, config
  
  // States do Aplicativo
  const [tasks, setTasks] = useState([]);
  const [userLocation, setUserLocation] = useState({
    latitude: -28.2922, // Padrão inicial (Panambi-RS)
    longitude: -53.5015,
  });
  
  // Form modal state para adicionar/editar tarefas
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('media'); // alta, media, baixa
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState('-28.2922');
  const [formLng, setFormLng] = useState('-53.5015');

  // Supabase Custom Config State
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');
  const [useSupa, setUseSupa] = useState(false);

  // Selected Notification Radius (100, 300, 500, 1000 meters)
  const [geofenceRadius, setGeofenceRadius] = useState(300);

  // Armazenamento das tarefas que já dispararam notificação para evitar loops de alertas
  const notifiedTasksRef = useRef(new Set());

  // 1. Carregar sessão do usuário e configurações ao inicializar
  useEffect(() => {
    async function loadAppSession() {
      try {
        // Solicitar permissões de notificação
        const { status: notifStatus } = await Notifications.requestPermissionsAsync();
        if (notifStatus !== 'granted') {
          console.log('Permissão para notificações não foi concedida!');
        }

        // Solicitar permissões de localização
        const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
        if (locStatus === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
        }

        // Carregar configurações salvas do Supabase
        const savedSupaConfig = await AsyncStorage.getItem(LOCAL_SUPABASE_CONFIG_KEY);
        if (savedSupaConfig) {
          const config = JSON.parse(savedSupaConfig);
          setSupaUrl(config.url || '');
          setSupaKey(config.anonKey || '');
          setUseSupa(config.useRealSupabase || false);
          
          if (config.useRealSupabase && config.url && config.anonKey) {
            await initializeCustomSupabase(config.url, config.anonKey);
          }
        }

        // Carregar raio do geofence salvo
        const savedRadius = await AsyncStorage.getItem('geofenceRadius');
        if (savedRadius) {
          setGeofenceRadius(Number(savedRadius));
        }

        // Carregar sessão de usuário
        const savedUser = await AsyncStorage.getItem(LOCAL_USER_KEY);
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
          setCurrentScreen('app');
          loadTasks(parsedUser.id);
        }
      } catch (err) {
        console.error('Erro de inicialização:', err);
      }
    }
    loadAppSession();
  }, []);

  // 2. Monitoramento de Localização em tempo real (Proximidade)
  useEffect(() => {
    let locationSubscription = null;

    async function startLocationTracking() {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Escutar mudanças de posição a cada 10 metros ou 5 segundos
      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (location) => {
          const { latitude, longitude } = location.coords;
          setUserLocation({ latitude, longitude });
          
          // Verificar proximidade com tarefas ativas pendentes
          checkProximityToTasks(latitude, longitude);
        }
      );
    }

    if (user) {
      startLocationTracking();
    }

    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, [user, tasks, geofenceRadius]);

  // Função para calcular distância usando a fórmula de Haversine
  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Raio da Terra em metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Retorna metros
  };

  // Verificar proximidade de tarefas pendentes e disparar notificações locais
  const checkProximityToTasks = async (uLat, uLng) => {
    tasks.forEach(async (task) => {
      if (task.status !== 'pendente') return;

      const distance = getDistanceInMeters(uLat, uLng, Number(task.lat), Number(task.lng));
      
      // Se estiver a menos de geofenceRadius metros e ainda não alertamos nesta sessão
      if (distance <= geofenceRadius && !notifiedTasksRef.current.has(task.id)) {
        notifiedTasksRef.current.add(task.id);
        
        // Disparar Notificação Local no celular do usuário
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📍 Lembrete Geográfico: ${task.title}`,
            body: `Você está próximo ao local (${task.address || 'Marcador'}). Prioridade: ${task.priority.toUpperCase()}`,
            data: { taskId: task.id },
            sound: true,
          },
          trigger: null, // Disparo imediato
        });

        Alert.alert(
          '📍 Lembrete de Proximidade!',
          `Você chegou perto de: "${task.title}"\nEndereço: ${task.address || 'Sem endereço'}`
        );
      }
    });
  };

  // 3. Carregar tarefas do banco real ou AsyncStorage
  const loadTasks = async (userId) => {
    try {
      if (useSupa && supabase) {
        // Obter do Supabase Real
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setTasks(data || []);
      } else {
        // Obter do AsyncStorage local
        const localData = await AsyncStorage.getItem(LOCAL_TASKS_KEY);
        if (localData) {
          const allTasks = JSON.parse(localData);
          // Filtrar apenas do usuário atual
          const userTasks = allTasks.filter(t => t.user_id === userId);
          setTasks(userTasks);
        } else {
          setTasks([]);
        }
      }
    } catch (err) {
      console.log('Erro ao carregar tarefas:', err);
    }
  };

  // Salvar tarefas localmente ou sincronizar com o banco
  const saveTask = async () => {
    if (!formTitle.trim()) {
      Alert.alert('Erro', 'O título da tarefa é obrigatório.');
      return;
    }

    try {
      const isEditing = !!editingTask;
      
      const taskData = {
        id: isEditing ? editingTask.id : 'task-' + Date.now().toString(),
        title: formTitle.trim(),
        description: formDesc.trim(),
        priority: formPriority,
        address: formAddress.trim(),
        lat: Number(formLat) || userLocation.latitude,
        lng: Number(formLng) || userLocation.longitude,
        status: isEditing ? editingTask.status : 'pendente',
        user_id: user.id,
        created_at: isEditing ? editingTask.created_at : new Date().toISOString(),
      };

      if (useSupa && supabase) {
        // Gravar no Supabase
        if (isEditing) {
          const { error } = await supabase
            .from('tasks')
            .update({
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority,
              address: taskData.address,
              lat: taskData.lat,
              lng: taskData.lng,
              status: taskData.status,
            })
            .eq('id', taskData.id);

          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('tasks')
            .insert([taskData]);

          if (error) throw error;
        }
      } else {
        // Gravar no AsyncStorage Offline
        const localData = await AsyncStorage.getItem(LOCAL_TASKS_KEY);
        let allTasks = localData ? JSON.parse(localData) : [];

        if (isEditing) {
          allTasks = allTasks.map(t => t.id === taskData.id ? taskData : t);
        } else {
          allTasks.unshift(taskData);
        }

        await AsyncStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(allTasks));
      }

      setIsFormVisible(false);
      loadTasks(user.id);
      Alert.alert('Sucesso', isEditing ? 'Tarefa atualizada!' : 'Tarefa geográfica salva com sucesso!');
    } catch (err) {
      Alert.alert('Erro ao salvar', err.message);
    }
  };

  // Alternar status de conclusão
  const toggleCompleteTask = async (id, newStatus) => {
    try {
      if (useSupa && supabase) {
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus })
          .eq('id', id);

        if (error) throw error;
      } else {
        const localData = await AsyncStorage.getItem(LOCAL_TASKS_KEY);
        if (localData) {
          let allTasks = JSON.parse(localData);
          allTasks = allTasks.map(t => t.id === id ? { ...t, status: newStatus } : t);
          await AsyncStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(allTasks));
        }
      }
      loadTasks(user.id);
    } catch (err) {
      Alert.alert('Erro', err.message);
    }
  };

  // Deletar tarefa
  const deleteTask = async (id) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta tarefa geográfica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (useSupa && supabase) {
                const { error } = await supabase
                  .from('tasks')
                  .delete()
                  .eq('id', id);

                if (error) throw error;
              } else {
                const localData = await AsyncStorage.getItem(LOCAL_TASKS_KEY);
                if (localData) {
                  let allTasks = JSON.parse(localData);
                  allTasks = allTasks.filter(t => t.id !== id);
                  await AsyncStorage.setItem(LOCAL_TASKS_KEY, JSON.stringify(allTasks));
                }
              }
              setIsFormVisible(false);
              loadTasks(user.id);
            } catch (err) {
              Alert.alert('Erro', err.message);
            }
          }
        }
      ]
    );
  };

  // Salvar configurações do Supabase customizadas pelo usuário no aplicativo
  const saveSupabaseConfig = async () => {
    try {
      const configObj = {
        url: supaUrl.trim(),
        anonKey: supaKey.trim(),
        useRealSupabase: useSupa,
      };

      await AsyncStorage.setItem(LOCAL_SUPABASE_CONFIG_KEY, JSON.stringify(configObj));

      if (useSupa) {
        if (!supaUrl.trim() || !supaKey.trim()) {
          Alert.alert('Aviso', 'Credenciais vazias! O app continuará em modo Offline.');
          setUseSupa(false);
          return;
        }

        const initializedClient = await initializeCustomSupabase(supaUrl.trim(), supaKey.trim());
        if (initializedClient) {
          Alert.alert('Sincronização Ativa', 'Conexão com o Supabase configurada com sucesso!');
        }
      } else {
        Alert.alert('Modo Alterado', 'Sincronização desligada. O aplicativo agora opera offline.');
      }

      if (user) {
        loadTasks(user.id);
      }
    } catch (err) {
      Alert.alert('Erro ao configurar', err.message);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
    setCurrentScreen('login');
  };

  // Abrir modal de criação
  const openAddTaskModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDesc('');
    setFormPriority('media');
    setFormAddress('Av. Central, 123');
    setFormLat(userLocation.latitude.toString());
    setFormLng(userLocation.longitude.toString());
    setIsFormVisible(true);
  };

  // Abrir modal para edição de tarefa existente
  const openEditTaskModal = (task) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDesc(task.description || '');
    setFormPriority(task.priority);
    setFormAddress(task.address || '');
    setFormLat(task.lat.toString());
    setFormLng(task.lng.toString());
    setIsFormVisible(true);
  };

  // Renderização condicional de telas de login/cadastro
  if (currentScreen === 'login') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" />
        <LoginScreen
          onLoginSuccess={(usr) => {
            setUser(usr);
            setCurrentScreen('app');
            loadTasks(usr.id);
          }}
          onNavigateToRegister={() => setCurrentScreen('cadastro')}
        />
      </SafeAreaView>
    );
  }

  if (currentScreen === 'cadastro') {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar barStyle="dark-content" />
        <CadastroScreen
          onCadastroSuccess={(usr) => {
            setUser(usr);
            setCurrentScreen('app');
            loadTasks(usr.id);
          }}
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="dark-content" />
      
      {/* App Header Bar */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.headerTitle}>RotinaApp</Text>
          <Text style={styles.headerUser}>{user?.email}</Text>
        </View>
        
        {/* Logout and Database Quick Config Indicators */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.dbStatusIndicator, useSupa ? styles.dbActive : styles.dbOffline]}
            onPress={() => setActiveTab('config')}
          >
            <Text style={styles.dbIndicatorText}>{useSupa ? '☁️ Supabase' : '📱 Local'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Tab Render Grid */}
      <View style={styles.mainContent}>
        {activeTab === 'tasks' && (
          <TaskListScreen
            tasks={tasks}
            onToggleComplete={toggleCompleteTask}
            onEditTask={openEditTaskModal}
            onAddTask={openAddTaskModal}
          />
        )}

        {activeTab === 'map' && (
          <MapScreen
            tasks={tasks}
            userLocation={userLocation}
            onMarkerPress={openEditTaskModal}
            geofenceRadius={geofenceRadius}
          />
        )}

        {activeTab === 'config' && (
          <ScrollView contentContainerStyle={styles.configContainer}>
            <Text style={styles.configTitle}>Configurações de Conectividade</Text>
            <Text style={styles.configSubtitle}>
              O RotinaApp funciona 100% offline via banco AsyncStorage em seu celular. Caso queira, ative a sincronização na nuvem com seu banco Supabase abaixo.
            </Text>

            <View style={styles.configCard}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Ativar Banco Supabase Real</Text>
                <Switch
                  value={useSupa}
                  onValueChange={setUseSupa}
                  trackColor={{ false: '#cbd5e1', true: '#c7d2fe' }}
                  thumbColor={useSupa ? '#4f46e5' : '#f4f3f4'}
                />
              </View>

              {useSupa && (
                <View style={styles.supabaseInputs}>
                  <Text style={styles.inputLabel}>PROJECT URL</Text>
                  <TextInput
                    style={styles.configInput}
                    placeholder="https://sua-url.supabase.co"
                    placeholderTextColor="#94a3b8"
                    value={supaUrl}
                    onChangeText={setSupaUrl}
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputLabel}>ANON KEY (PUBLIC)</Text>
                  <TextInput
                    style={styles.configInput}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                    placeholderTextColor="#94a3b8"
                    value={supaKey}
                    onChangeText={setSupaKey}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              )}

              <TouchableOpacity style={styles.saveConfigBtn} onPress={saveSupabaseConfig}>
                <Text style={styles.saveConfigText}>Salvar Configuração</Text>
              </TouchableOpacity>
            </View>

            {/* Notification geofence radius selector */}
            <View style={styles.configCard}>
              <Text style={styles.inputLabel}>📏 RAIO DE NOTIFICAÇÃO PROXIMIDADE</Text>
              <Text style={styles.configSubtitle}>
                Defina a distância mínima necessária para disparar a notificação local de proximidade ao se aproximar de um local cadastrado.
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
                {[100, 300, 500, 1000].map((radius) => {
                  const isSelected = geofenceRadius === radius;
                  return (
                    <TouchableOpacity
                      key={radius}
                      style={{
                        flex: 1,
                        backgroundColor: isSelected ? '#4f46e5' : '#f8fafc',
                        borderWidth: 1,
                        borderColor: isSelected ? '#4f46e5' : '#cbd5e1',
                        borderRadius: 12,
                        paddingVertical: 10,
                        alignItems: 'center',
                      }}
                      onPress={async () => {
                        setGeofenceRadius(radius);
                        await AsyncStorage.setItem('geofenceRadius', radius.toString());
                      }}
                    >
                      <Text style={{
                        color: isSelected ? '#ffffff' : '#475569',
                        fontWeight: 'bold',
                        fontSize: 12,
                      }}>
                        {radius}m
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>💡 Dica de Simulação GPS</Text>
              <Text style={styles.infoText}>
                No simulador oficial Expo, você pode alterar sua localização nas configurações do emulador ou enviando coordenadas personalizadas para testar o alerta de tarefas geográficas de {geofenceRadius}m de raio.
              </Text>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Navigation Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tasks' && styles.tabItemActive]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={styles.tabIcon}>📝</Text>
          <Text style={[styles.tabLabel, activeTab === 'tasks' && styles.tabLabelActive]}>Tarefas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'map' && styles.tabItemActive]}
          onPress={() => setActiveTab('map')}
        >
          <Text style={styles.tabIcon}>🗺️</Text>
          <Text style={[styles.tabLabel, activeTab === 'map' && styles.tabLabelActive]}>Mapa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'config' && styles.tabItemActive]}
          onPress={() => setActiveTab('config')}
        >
          <Text style={styles.tabIcon}>⚙️</Text>
          <Text style={[styles.tabLabel, activeTab === 'config' && styles.tabLabelActive]}>Ajustes</Text>
        </TouchableOpacity>
      </View>

      {/* Task Form Modal (Add / Edit Task) */}
      <Modal
        visible={isFormVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFormVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Editar Tarefa Geográfica' : 'Nova Tarefa Geográfica'}
              </Text>
              <TouchableOpacity onPress={() => setIsFormVisible(false)}>
                <Text style={styles.closeModalBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormScroll}>
              <View style={styles.inputGroup}>
                <Text style={styles.modalLabel}>TÍTULO DA TAREFA</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: Passar no mercado"
                  placeholderTextColor="#94a3b8"
                  value={formTitle}
                  onChangeText={setFormTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.modalLabel}>DESCRIÇÃO</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  placeholder="Ex: Pegar leite, arroz e frutas"
                  placeholderTextColor="#94a3b8"
                  multiline
                  numberOfLines={3}
                  value={formDesc}
                  onChangeText={setFormDesc}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.modalLabel}>PRIORIDADE</Text>
                <View style={styles.prioritySelectorRow}>
                  {['baixa', 'media', 'alta'].map((p) => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.prioritySelectBtn,
                        formPriority === p && styles.prioritySelectBtnActive,
                        formPriority === p && p === 'alta' && styles.btnHigh,
                        formPriority === p && p === 'media' && styles.btnMed,
                        formPriority === p && p === 'baixa' && styles.btnLow,
                      ]}
                      onPress={() => setFormPriority(p)}
                    >
                      <Text
                        style={[
                          styles.prioritySelectBtnText,
                          formPriority === p && styles.prioritySelectBtnTextActive,
                        ]}
                      >
                        {p === 'media' ? 'média' : p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.modalLabel}>ENDEREÇO DE REFERÊNCIA</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: Av. Central, 123"
                  placeholderTextColor="#94a3b8"
                  value={formAddress}
                  onChangeText={setFormAddress}
                />
              </View>

              <View style={[styles.inputGroup, { marginBottom: 16 }]}>
                <Text style={styles.modalLabel}>LOCAL DE ATIVAÇÃO NO MAPA</Text>
                <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: 'bold', marginBottom: 8 }}>
                  👉 Toque no mapa abaixo para posicionar o PIN (marcador)
                </Text>
                <View style={{ height: 180, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 8 }}>
                  <MapView
                    style={{ flex: 1 }}
                    initialRegion={{
                      latitude: Number(formLat) || -28.2922,
                      longitude: Number(formLng) || -53.5015,
                      latitudeDelta: 0.015,
                      longitudeDelta: 0.015,
                    }}
                    onPress={(e) => {
                      const { latitude, longitude } = e.nativeEvent.coordinate;
                      setFormLat(latitude.toString());
                      setFormLng(longitude.toString());
                    }}
                  >
                    <Marker
                      coordinate={{
                        latitude: Number(formLat) || -28.2922,
                        longitude: Number(formLng) || -53.5015,
                      }}
                      title="PIN Selecionado"
                      pinColor="#4f46e5"
                    />
                  </MapView>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 10, color: '#64748b', fontFamily: 'System' }}>Lat: {Number(formLat).toFixed(5)}</Text>
                  <Text style={{ fontSize: 10, color: '#64748b', fontFamily: 'System' }}>Lng: {Number(formLng).toFixed(5)}</Text>
                </View>
              </View>

              {/* Action Buttons inside Form Modal */}
              <View style={styles.modalActionsRow}>
                {editingTask && (
                  <TouchableOpacity
                    style={styles.deleteTaskBtn}
                    onPress={() => deleteTask(editingTask.id)}
                  >
                    <Text style={styles.deleteTaskBtnText}>Excluir</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity style={styles.saveTaskBtn} onPress={saveTask}>
                  <Text style={styles.saveTaskBtnText}>Salvar Tarefa</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  appContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  appHeader: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerUser: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dbStatusIndicator: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  dbActive: {
    backgroundColor: '#e0e7ff',
    borderColor: '#cbd5e1',
  },
  dbOffline: {
    backgroundColor: '#f1f5f9',
    borderColor: '#cbd5e1',
  },
  dbIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  logoutBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  logoutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ef4444',
  },
  mainContent: {
    flex: 1,
  },
  tabBar: {
    height: 64,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  tabItemActive: {
    opacity: 1,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '700',
  },
  tabLabelActive: {
    color: '#4f46e5',
  },
  configContainer: {
    padding: 16,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  configSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 16,
  },
  configCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  supabaseInputs: {
    borderTopWidth: 1,
    borderColor: '#f1f5f9',
    paddingTop: 16,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  configInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
    marginBottom: 12,
  },
  saveConfigBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveConfigText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 16,
    padding: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e40af',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#1e3a8a',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeModalBtn: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: 'bold',
  },
  modalFormScroll: {
    paddingBottom: 40,
  },
  modalLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  prioritySelectBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prioritySelectBtnActive: {
    borderWidth: 1.5,
  },
  btnLow: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  btnMed: {
    backgroundColor: '#e0e7ff',
    borderColor: '#4f46e5',
  },
  btnHigh: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  prioritySelectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'capitalize',
  },
  prioritySelectBtnTextActive: {
    color: '#0f172a',
  },
  coordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  saveTaskBtn: {
    flex: 1,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveTaskBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  deleteTaskBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTaskBtnText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '700',
  }
});

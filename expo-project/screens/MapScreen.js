import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';

export default function MapScreen({ tasks, userLocation, onMarkerPress, geofenceRadius = 300 }) {
  const [permissionError, setPermissionError] = useState(null);
  const [mapRegion, setMapRegion] = useState(null);

  // Se o aplicativo tiver localização real disponível
  useEffect(() => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    }
  }, [userLocation]);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'alta':
        return '#ef4444'; // Vermelho
      case 'media':
        return '#4f46e5'; // Indigo/Azul
      case 'baixa':
        return '#10b981'; // Verde
      default:
        return '#64748b';
    }
  };

  if (!mapRegion) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Iniciando o Mapa Geográfico...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        region={mapRegion}
        showsUserLocation={true}
        followsUserLocation={true}
      >
        {/* User Location Simulated Marker & Proximity Circle if on screen */}
        {userLocation && (
          <>
            {/* Custom User Position Indicator */}
            <Marker
              coordinate={{
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              }}
              title="Minha Localização"
              description="Você está aqui"
            >
              <View style={styles.userLocationDot}>
                <View style={styles.userLocationPulse} />
              </View>
            </Marker>
          </>
        )}

        {/* Task Markers */}
        {tasks
          .filter(t => t.status === 'pendente')
          .map(task => {
            const color = getPriorityColor(task.priority);
            return (
              <React.Fragment key={task.id}>
                {/* Marker Pin */}
                <Marker
                  coordinate={{
                    latitude: Number(task.lat),
                    longitude: Number(task.lng),
                  }}
                  title={task.title}
                  description={task.address}
                  pinColor={color}
                  onCalloutPress={() => onMarkerPress(task)}
                />

                {/* Activation Radius Circle */}
                <Circle
                  center={{
                    latitude: Number(task.lat),
                    longitude: Number(task.lng),
                  }}
                  radius={geofenceRadius} // Raio de ativação dinâmico
                  strokeWidth={1}
                  strokeColor={`${color}80`}
                  fillColor={`${color}15`}
                />
              </React.Fragment>
            );
          })}
      </MapView>

      {/* Floating Map Legend Indicator */}
      <View style={styles.legendCard}>
        <Text style={styles.legendTitle}>Legenda de Prioridades:</Text>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendLabel}>Alta</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: '#4f46e5' }]} />
            <Text style={styles.legendLabel}>Média</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: '#10b981' }]} />
            <Text style={styles.legendLabel}>Baixa</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '700',
    marginTop: 12,
  },
  userLocationDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3b82f6',
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  userLocationPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1d4ed8',
  },
  legendCard: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0f172a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  }
});

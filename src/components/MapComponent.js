import { useEffect, useRef } from 'react';

export default function MapComponent({
  tasks,
  userLocation,
  onTaskSelect,
  isSelectingLocation = false,
  selectedLocation,
  onLocationSelect,
  geofenceRadius = 300
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersGroupRef = useRef(null);
  const userMarkerRef = useRef(null);
  const selectionMarkerRef = useRef(null);
  const geofenceCirclesGroupRef = useRef(null);

  // Default coordinate center (Panambi, RS)
  const defaultCenter = [-28.2922, -53.5015];

  // 1. Initialize map
  useEffect(() => {
    const L = window.L;
    if (typeof L === 'undefined') {
      console.warn('Leaflet not loaded yet');
      return;
    }

    if (!containerRef.current || mapRef.current) return;

    // Use simulated user location as center if available
    const initialCenter = userLocation
      ? [userLocation.latitude, userLocation.longitude]
      : defaultCenter;

    // Initialize Map with custom theme and options
    mapRef.current = L.map(containerRef.current, {
      zoomControl: false, // will add in custom position
      attributionControl: false
    }).setView(initialCenter, 14);

    // Light styled Voyager tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapRef.current);

    // Add zoom control in bottom-right
    L.control.zoom({
      position: 'bottomright'
    }).addTo(mapRef.current);

    // Initialize overlay groups
    markersGroupRef.current = L.layerGroup().addTo(mapRef.current);
    geofenceCirclesGroupRef.current = L.layerGroup().addTo(mapRef.current);

    // If we click the map while in selecting location mode
    mapRef.current.on('click', (e) => {
      if (isSelectingLocation && onLocationSelect) {
        const { lat, lng } = e.latlng;
        // Simple address approximation
        const address = `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`;
        onLocationSelect({ latitude: lat, longitude: lng, address });
      }
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // 2. Fly to user location when requested
  const handleRecenter = () => {
    if (mapRef.current && userLocation) {
      mapRef.current.flyTo([userLocation.latitude, userLocation.longitude], 15, {
        duration: 1.2
      });
    }
  };

  // 3. Update User Marker and geofences
  useEffect(() => {
    const L = window.L;
    if (!mapRef.current || typeof L === 'undefined' || !userLocation) return;

    // Create or update simulated user marker
    const userLatLng = [userLocation.latitude, userLocation.longitude];

    const userPulseIcon = L.divIcon({
      className: 'user-pulse-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(userLatLng);
    } else {
      userMarkerRef.current = L.marker(userLatLng, { icon: userPulseIcon }).addTo(mapRef.current);
    }

  }, [userLocation]);

  // 4. Update Task Pins & Proximity Radii
  useEffect(() => {
    const L = window.L;
    if (!mapRef.current || typeof L === 'undefined' || !markersGroupRef.current || !geofenceCirclesGroupRef.current) return;

    // Clear old elements
    markersGroupRef.current.clearLayers();
    geofenceCirclesGroupRef.current.clearLayers();

    // Do not show task pins if in selecting mode (to keep focus clean)
    if (isSelectingLocation) return;

    tasks.forEach(task => {
      const pinLatLng = [task.latitude, task.longitude];
      const isCompleted = task.status === 'concluida';

      // Design priority-specific icons using HTML/Tailwind styling
      let priorityColor = '#3b82f6'; // media/default
      let priorityBorder = '#60a5fa';
      if (task.priority === 'alta') {
        priorityColor = '#ef4444'; // red
        priorityBorder = '#f87171';
      } else if (task.priority === 'baixa') {
        priorityColor = '#10b981'; // green
        priorityBorder = '#34d399';
      }

      if (isCompleted) {
        priorityColor = '#64748b'; // muted grey
        priorityBorder = '#94a3b8';
      }

      // Modern SVG PIN Markup
      const pinHtml = `
        <div class="relative group cursor-pointer flex flex-col items-center">
          <div class="flex items-center justify-center w-8 h-8 rounded-full shadow-lg border-2" 
               style="background-color: ${priorityColor}; border-color: ${priorityBorder}; transform: translateY(-4px); transition: all 0.2s;">
            <!-- Icon content based on priority/status -->
            ${isCompleted 
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>`
              : task.priority === 'alta'
                ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><line x1="12" y1="9" x2="12" y2="15"></line><line x1="12" y1="18" x2="12.01" y2="18"></line><line x1="12" y1="6" x2="12.01" y2="6"></line></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-white"><circle cx="12" cy="12" r="10"></circle></svg>`
            }
          </div>
          <!-- Tiny bottom triangle for real pin effect -->
          <div class="w-2 h-2 rotate-45" style="background-color: ${priorityColor}; margin-top: -8px;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'custom-leaflet-pin',
        iconSize: [32, 40],
        iconAnchor: [16, 36]
      });

      const marker = L.marker(pinLatLng, { icon: customIcon });
      
      // Bind callback on pin click
      if (onTaskSelect) {
        marker.on('click', () => onTaskSelect(task));
      }

      markersGroupRef.current.addLayer(marker);

      // Add visual geofence circle overlay for PENDING tasks
      if (!isCompleted) {
        const geofenceCircle = L.circle(pinLatLng, {
          radius: geofenceRadius, // custom geofence radius
          color: priorityColor,
          fillColor: priorityColor,
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '3, 4'
        });
        geofenceCirclesGroupRef.current.addLayer(geofenceCircle);
      }
    });
  }, [tasks, isSelectingLocation, geofenceRadius]);

  // 5. Update Location Selection Pin (draggable)
  useEffect(() => {
    const L = window.L;
    if (!mapRef.current || typeof L === 'undefined') return;

    // Clear old selection marker if any
    if (selectionMarkerRef.current) {
      mapRef.current.removeLayer(selectionMarkerRef.current);
      selectionMarkerRef.current = null;
    }

    if (isSelectingLocation && selectedLocation) {
      const pinLatLng = [selectedLocation.latitude, selectedLocation.longitude];

      const pinHtml = `
        <div class="relative flex flex-col items-center animate-bounce">
          <div class="flex items-center justify-center w-10 h-10 rounded-full shadow-2xl bg-indigo-600 border-2 border-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-white"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div class="w-3 h-3 rotate-45 bg-indigo-600 border-r border-b border-white -mt-2"></div>
          <span class="absolute top-11 bg-slate-900 border border-slate-700 text-[10px] text-white px-1.5 py-0.5 rounded shadow whitespace-nowrap font-medium">Arraste-me!</span>
        </div>
      `;

      const customIcon = L.divIcon({
        html: pinHtml,
        className: 'selection-draggable-pin',
        iconSize: [40, 50],
        iconAnchor: [20, 48]
      });

      // Create DRAGGABLE marker
      selectionMarkerRef.current = L.marker(pinLatLng, {
        icon: customIcon,
        draggable: true
      }).addTo(mapRef.current);

      // Pan to selected position
      mapRef.current.panTo(pinLatLng);

      // Handle drag end events
      selectionMarkerRef.current.on('dragend', (e) => {
        const marker = e.target;
        const position = marker.getLatLng();
        if (onLocationSelect) {
          const address = `Lat: ${position.lat.toFixed(4)}, Lng: ${position.lng.toFixed(4)}`;
          onLocationSelect({
            latitude: position.lat,
            longitude: position.lng,
            address
          });
        }
      });
    }
  }, [isSelectingLocation, selectedLocation]);

  return (
    <div className="relative w-full h-full">
      {/* Actual Map Container */}
      <div id="map-canvas" ref={containerRef} className="w-full h-full bg-[#f0f4f8]" />

      {/* Helper Overlays */}
      <button
        onClick={handleRecenter}
        id="btn-recenter-map"
        className="absolute bottom-5 left-5 z-[500] p-3 rounded-xl bg-white border border-slate-200 text-indigo-600 shadow-xl hover:bg-slate-50 hover:text-indigo-700 active:scale-95 transition"
        title="Centralizar na minha localização"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-600">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
        </svg>
      </button>

      {/* Selecting Location Mode Indicator bar */}
      {isSelectingLocation && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[500] bg-indigo-600 text-white border border-indigo-400 py-2 px-5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-400 rounded-full animate-ping"></span>
          <span>Toque no mapa ou arraste o pin azul para definir o local</span>
        </div>
      )}
    </div>
  );
}

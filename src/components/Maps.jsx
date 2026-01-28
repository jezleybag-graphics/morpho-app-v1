import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Crosshair } from 'lucide-react';

// --- LOCAL IMPORTS ---
import { getRoadDistanceKm, calculateFee, getReverseGeocoding } from '../utils';
import { CAFE_LOCATION } from '../data';

// ==========================================
// 1. READ-ONLY MAP COMPONENT
// ==========================================

export const ReadOnlyMap = ({ center }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    // Polling to ensure Leaflet is loaded
    const intervalId = setInterval(() => {
      if (window.L && mapContainer.current && !mapInstance.current) {
        clearInterval(intervalId);

        const map = window.L.map(mapContainer.current, {
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          touchZoom: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          boxZoom: false,
          keyboard: false,
        }).setView(center, 15);

        mapInstance.current = map;

        window.L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ).addTo(map);

        // GREEN DOT (Static) - Updated to Deep Forest Green #013E37
        const pinIcon = window.L.divIcon({
          className: 'pin-icon',
          html: "<div style='background-color:#013E37;width:12px;height:12px;border-radius:50%;border:2px solid #F4F3F2;box-shadow:0 2px 4px rgba(0,0,0,0.3)'></div>",
          iconSize: [12, 12],
        });

        window.L.marker(center, { icon: pinIcon }).addTo(map);
      } else if (mapInstance.current) {
        mapInstance.current.setView(center);
        clearInterval(intervalId);
      }
    }, 100);

    return () => clearInterval(intervalId);
  }, [center]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: '100px', width: '100%', backgroundColor: '#e5e7eb' }}
    />
  );
};

// ==========================================
// 2. LOCATION PICKER COMPONENT
// ==========================================

export const LocationPicker = ({ onLocationSelect }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const labelMarkerRef = useRef(null); // Ref for the user label
  const [currentPosition, setCurrentPosition] = useState(CAFE_LOCATION);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Leaflet Map with Safety Check
  useEffect(() => {
    const timer = setInterval(() => {
      // Check if Leaflet (L) is loaded AND the ref exists
      if (window.L && mapContainerRef.current) {
        clearInterval(timer);

        // If map already exists, just resize it
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          return;
        }

        try {
          // CRITICAL FIX: Force container height via JS before initializing
          mapContainerRef.current.style.height = '400px';
          mapContainerRef.current.style.width = '100%';

          const map = window.L.map(mapContainerRef.current).setView(
            currentPosition,
            15
          );
          mapInstanceRef.current = map;

          window.L.tileLayer(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            {
              attribution: '© OpenStreetMap',
            }
          ).addTo(map);

          // --- CAFE MARKERS ---

          // 1.a CAFE DOT (Deep Forest Green)
          const cafeIcon = window.L.divIcon({
            className: 'cafe-icon',
            html: "<div style='background-color:#013E37;width:14px;height:14px;border-radius:50%;border:2px solid #F4F3F2;box-shadow:0 2px 4px rgba(0,0,0,0.2)'></div>",
            iconSize: [14, 14],
          });

          window.L.marker(CAFE_LOCATION, { icon: cafeIcon })
            .addTo(map)
            .bindPopup('<b>We are here</b>');

          // 1.b CAFE BUBBLE LABEL
          // Updated colors to match Theme
          const cafeLabelIcon = window.L.divIcon({
            className: 'cafe-label-icon',
            html: `
              <div style="transform: translate(-50%, -180%);" class="flex flex-col items-center">
                <div class="bg-[#F4F3F2] px-3 py-1.5 rounded-xl shadow-md border border-gray-100 flex flex-col items-center">
                  <span class="font-black text-[#013E37] text-sm whitespace-nowrap">Morpho Cafe</span>
                </div>
                <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#F4F3F2] -mt-[1px]"></div>
              </div>
            `,
            iconAnchor: [0, 0], // Anchor at coordinate, CSS handles centering
          });

          // Add label marker (interactive: false prevents it from blocking clicks)
          window.L.marker(CAFE_LOCATION, {
            icon: cafeLabelIcon,
            interactive: false,
          }).addTo(map);

          // Delivery Radius Circle (Deep Forest Green)
          window.L.circle(CAFE_LOCATION, {
            radius: 1000,
            color: '#013E37',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map);

          // --- USER MARKERS ---

          // 2.a USER MARKER (Red Pin) - BIGGER
          const userIcon = window.L.divIcon({
            className: 'user-pin',
            html: "<div style='background-color:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid #F4F3F2;box-shadow:0 4px 8px rgba(0,0,0,0.4);position:relative;'><div style='position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #ef4444;'></div></div>",
            iconSize: [24, 24],
            iconAnchor: [12, 24],
            popupAnchor: [0, -24],
          });

          const marker = window.L.marker(currentPosition, {
            draggable: true,
            icon: userIcon,
          }).addTo(map);
          markerRef.current = marker;

          // 2.b USER TEXT LABEL ("Move to your exact location")
          const userLabelIcon = window.L.divIcon({
            className: 'user-label-icon',
            html: `
              <div style="transform: translate(-50%, -240%);" class="flex flex-col items-center animate-bounce-slow">
                <div class="bg-gray-900/90 backdrop-blur text-[#F4F3F2] px-3 py-1.5 rounded-lg shadow-xl flex flex-col items-center">
                  <span class="font-bold text-[10px] whitespace-nowrap">Move to your exact location</span>
                </div>
                <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-900/90 -mt-[1px]"></div>
              </div>
            `,
            iconAnchor: [0, 0],
          });

          // We create a separate marker for the label that moves with the pin
          const labelMarker = window.L.marker(currentPosition, {
            icon: userLabelIcon,
            interactive: false,
            zIndexOffset: 1000, // Ensure text is always on top
          }).addTo(map);
          labelMarkerRef.current = labelMarker;

          // --- EVENTS ---

          marker.on('drag', function (event) {
            const pos = event.target.getLatLng();
            // Move label with pin in real-time
            labelMarker.setLatLng(pos);
          });

          marker.on('dragend', function (event) {
            const { lat, lng } = event.target.getLatLng();
            setCurrentPosition([lat, lng]);
            labelMarker.setLatLng([lat, lng]);
          });

          map.on('click', async (e) => {
            const { lat, lng } = e.latlng;
            marker.setLatLng([lat, lng]);
            labelMarker.setLatLng([lat, lng]);
            setCurrentPosition([lat, lng]);
          });

          // CRITICAL: Force map to recognize its container size
          setTimeout(() => {
            map.invalidateSize();
          }, 500);
          setTimeout(() => {
            map.invalidateSize();
          }, 2000);
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    }, 200);

    return () => clearInterval(timer);
  }, []);

  const handleLocateMe = () => {
    if (!('geolocation' in navigator)) {
      alert('Geolocation not supported');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newPos = [latitude, longitude];
        setCurrentPosition(newPos);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(newPos, 17);
          if (markerRef.current) markerRef.current.setLatLng(newPos);
          if (labelMarkerRef.current) labelMarkerRef.current.setLatLng(newPos);
        }
        setIsLocating(false);
      },
      (error) => {
        console.log(error);
        alert('Could not detect location. Please enable GPS.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleConfirm = async () => {
    setIsCalculating(true);
    try {
      const lat = Array.isArray(currentPosition)
        ? currentPosition[0]
        : currentPosition.lat;
      const lng = Array.isArray(currentPosition)
        ? currentPosition[1]
        : currentPosition.lng;

      const d = await getRoadDistanceKm(
        CAFE_LOCATION[0],
        CAFE_LOCATION[1],
        lat,
        lng
      );
      const distRounded = Math.round(d * 10) / 10;
      const f = calculateFee(distRounded);

      let streetInfo = { road: '', district: '' };
      try {
        streetInfo = await getReverseGeocoding(lat, lng);
      } catch (e) {
        console.error('Geocoding failed', e);
      }

      onLocationSelect({
        lat,
        lng,
        distance: distRounded,
        fee: f,
        mapLink: `https://www.google.com/maps?q=${lat},${lng}`,
        streetInfo,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <div
      className="flex flex-col h-full relative"
      style={{ minHeight: '450px' }}
    >
      <button
        onClick={handleLocateMe}
        disabled={isLocating}
        className="w-full bg-[#F4F3F2] text-[#013E37] text-sm font-bold p-3 rounded-2xl mb-2 flex items-center justify-center gap-2 border border-[#013E37]/30 shadow-sm active:scale-[0.98] transition-transform shrink-0"
      >
        {isLocating ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Crosshair size={18} />
        )}
        {isLocating ? 'Detecting...' : 'Use My Current Location'}
      </button>

      {/* MAP CONTAINER: HARDCODED HEIGHT IS REQUIRED HERE */}
      <div
        className="w-full rounded-3xl overflow-hidden shadow-inner border border-gray-200 relative bg-gray-100"
        style={{ height: '350px', width: '100%', flex: '1 1 auto' }}
      >
        <div
          ref={mapContainerRef}
          className="w-full h-full"
          style={{ height: '100%', width: '100%' }}
        />
      </div>

      <p className="text-xs text-gray-400 text-center mt-2 shrink-0">
        Drag the pin to your exact location
      </p>

      <button
        onClick={handleConfirm}
        disabled={isCalculating}
        className="w-full bg-[#013E37] text-[#F4F3F2] py-4 rounded-2xl font-bold shadow-lg flex justify-center items-center gap-2 mt-4 active:scale-[0.98] transition-transform shrink-0"
      >
        {isCalculating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Calculating Fee...
          </>
        ) : (
          <>Confirm Pin Location</>
        )}
      </button>
    </div>
  );
};
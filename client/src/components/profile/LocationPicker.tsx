import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from '../../pages/technician/profile-types';

const pin = L.divIcon({
  className: '',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
  html: `<svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 1C8.2 1 1 8 1 16.8 1 28.5 17 43 17 43s16-14.5 16-26.2C33 8 25.8 1 17 1z" fill="#f2b33d" stroke="#2a2118" stroke-width="2"/>
    <circle cx="17" cy="16.5" r="5.5" fill="#2a2118"/></svg>`,
});

function FollowPin({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([position.lat, position.lng]);
  }, [map, position.lat, position.lng]);
  return null;
}

function MoveOnClick({ onChange }: { onChange: (point: LatLng) => void }) {
  useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

interface LocationPickerProps {
  value: LatLng | null;
  center: LatLng;
  radiusKm: number;
  onChange: (point: LatLng) => void;
}

export function LocationPicker({ value, center, radiusKm, onChange }: LocationPickerProps) {
  const position = value ?? center;

  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={13}
      scrollWheelZoom={false}
      className="isolate h-72 rounded-box border border-line"
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      {value && (
        <>
          <Marker
            position={[value.lat, value.lng]}
            icon={pin}
            draggable
            title="Your location. Drag to move."
            eventHandlers={{
              dragend: (event) => {
                const point = (event.target as L.Marker).getLatLng();
                onChange({ lat: point.lat, lng: point.lng });
              },
            }}
          />
          <Circle
            center={[value.lat, value.lng]}
            radius={radiusKm * 1000}
            pathOptions={{ color: '#2f6f62', weight: 1, fillOpacity: 0.06 }}
          />
        </>
      )}
      <FollowPin position={position} />
      <MoveOnClick onChange={onChange} />
    </MapContainer>
  );
}

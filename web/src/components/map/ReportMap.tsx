import { useEffect } from "react";
import * as L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const markerIcon = L.divIcon({
  className: "",
  iconSize: [32, 40],
  iconAnchor: [16, 40],
  popupAnchor: [0, -38],
  html: `
    <div style="position:relative;width:32px;height:40px;">
      <div style="position:absolute;left:3px;top:2px;width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#059669;border:3px solid #ffffff;box-shadow:0 6px 14px rgba(15,23,42,.35);"></div>
      <div style="position:absolute;left:13px;top:10px;width:6px;height:6px;border-radius:9999px;background:#ffffff;"></div>
    </div>
  `,
});

function LocationEvents({ onChange }: { onChange: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onChange(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function MapSync({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    const current = map.getCenter();
    if (Math.abs(current.lat - latitude) > 0.0001 || Math.abs(current.lng - longitude) > 0.0001) {
      map.panTo([latitude, longitude], { animate: true });
    }
  }, [latitude, longitude, map]);

  return null;
}

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
  heightClass = "h-72",
}: {
  latitude: number;
  longitude: number;
  onChange: (latitude: number, longitude: number) => void;
  heightClass?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 ${heightClass}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution={OSM_ATTRIBUTION}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationEvents onChange={onChange} />
        <MapSync latitude={latitude} longitude={longitude} />
        <Marker
          position={[latitude, longitude]}
          icon={markerIcon}
          draggable
          eventHandlers={{
            dragend(event) {
              const position = event.target.getLatLng();
              onChange(position.lat, position.lng);
            },
          }}
        >
          <Popup>Geser marker atau klik peta untuk memilih lokasi.</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export function ReportMap({
  latitude,
  longitude,
  title,
  address,
  heightClass = "h-72",
}: {
  latitude: number;
  longitude: number;
  title: string;
  address?: string | null;
  heightClass?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 ${heightClass}`}>
      <MapContainer
        center={[latitude, longitude]}
        zoom={15}
        scrollWheelZoom={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution={OSM_ATTRIBUTION}
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={markerIcon}>
          <Popup>
            <strong>{title}</strong>
            {address && <span className="block">{address}</span>}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

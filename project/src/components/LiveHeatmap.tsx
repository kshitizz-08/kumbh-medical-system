import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { getAllIncidents, MedicalIncident } from '../lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

// Default center coordinates for Prayagraj / Kumbh Mela area
const DEFAULT_CENTER: [number, number] = [25.4358, 81.8463];

export default function LiveHeatmap() {
  useI18n();
  const [incidents, setIncidents] = useState<MedicalIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMapData() {
      try {
        const data = await getAllIncidents();
        setIncidents(data);
      } catch (err: any) {
        setError(err.message || "Failed to load heat map data.");
      } finally {
        setLoading(false);
      }
    }
    fetchMapData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMapData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="h-96 bg-gray-50 flex items-center justify-center rounded-xl border border-gray-200">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-96 bg-red-50 flex items-center justify-center rounded-xl border border-red-200 text-red-600 gap-2">
        <AlertTriangle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="w-full h-96 rounded-xl overflow-hidden shadow-inner border border-gray-200 relative z-0">
      <MapContainer 
        center={DEFAULT_CENTER} 
        zoom={13} 
        scrollWheelZoom={false}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {incidents.map((incident) => {
          if (!incident.latitude || !incident.longitude) return null;
          
          // Color coding based on incident type
          let color = '#3b82f6'; // Blue for consultation
          if (incident.incident_type === 'Emergency') color = '#ef4444'; // Red
          if (incident.incident_type === 'Follow-up') color = '#eab308'; // Yellow

          return (
            <CircleMarker
              key={incident.id}
              center={[incident.latitude, incident.longitude]}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.7 }}
              radius={8}
            >
              <Popup>
                <div className="p-1">
                  <h3 className="font-bold text-sm mb-1">{incident.incident_type}</h3>
                  <p className="text-xs text-gray-600 mb-1">
                    <strong>Symptoms:</strong> {incident.symptoms}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(incident.created_at).toLocaleString()}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      
      {/* Legend Overlay */}
      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg shadow-lg border border-gray-200 z-[1000] text-xs font-medium space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div> Emergency
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div> Consultation
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div> Follow-up
        </div>
      </div>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api');

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(path: string, options?: RequestInit): string | null {
  // Only cache GET requests
  if (options?.method && options.method !== 'GET') {
    return null;
  }
  return `api:${path}`;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const cacheKey = getCacheKey(path, options);

  // Check cache for GET requests
  if (cacheKey && !options?.method) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data as Promise<T>;
    }
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  const data = await response.json() as T;

  // Cache GET requests
  if (cacheKey) {
    cache.set(cacheKey, { data, timestamp: Date.now() });
  }

  return data;
}

// Clear cache function (useful for mutations)
export function clearApiCache(pathPattern?: string) {
  if (pathPattern) {
    for (const key of cache.keys()) {
      if (key.includes(pathPattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

export type Devotee = {
  id: string;
  registration_number: string;
  full_name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;

  emergency_contact_name: string;
  emergency_contact_phone: string;
  photo_url: string | null;
  // optional, only present when using face-based search
  match_distance?: number;
  // optional, stored for future searches
  face_descriptor?: number[] | null;
  created_at: string;
  updated_at: string;
};

export type MedicalRecord = {
  id: string;
  devotee_id: string;
  blood_group: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | null;
  height_cm: number | null;
  weight_kg: number | null;
  allergies: string;
  chronic_conditions: string;
  current_medications: string;
  past_surgeries: string;

  special_notes: string;
  created_at: string;
  updated_at: string;
};

export type LostPerson = {
  _id?: string;
  name: string;
  age?: number;
  gender: string;
  photo_url: string;
  status: 'missing' | 'found' | 'reunited';
  contact_info?: {
    name: string;
    phone: string;
    relationship: string;
  };
  last_seen_location?: string;
  current_location?: string;
  created_at?: string;
  match_similarity?: number; // Added when matching
};

export type MedicalIncident = {
  id: string;
  devotee_id: string;
  incident_date: string;
  incident_type: 'Emergency' | 'Consultation' | 'Follow-up';
  symptoms: string;
  diagnosis: string;
  treatment_given: string;
  medications_prescribed: string;
  attending_doctor: string;
  medical_center: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  created_at: string;
};

export type DevoteeWithRecord = Devotee & { medical_records: MedicalRecord | null };

export type CreateDevoteePayload = {
  full_name: string;
  age: number;
  gender: Devotee['gender'];
  phone: string;

  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_group: MedicalRecord['blood_group'];
  height_cm: number | null;
  weight_kg: number | null;
  allergies: string;
  chronic_conditions: string;
  current_medications: string;
  past_surgeries: string;

  special_notes: string;
  photo_url: string | null;
  face_descriptor: number[] | null;
};

export type CreateIncidentPayload = {
  devotee_id: string;
  incident_type: MedicalIncident['incident_type'];
  symptoms: string;
  diagnosis: string;
  treatment_given: string;
  medications_prescribed: string;
  attending_doctor: string;
  medical_center: string;
  follow_up_required: boolean;
  follow_up_notes: string;
};

export function registerDevotee(payload: CreateDevoteePayload) {
  return request<DevoteeWithRecord>('/devotees', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateDevotee(id: string, payload: CreateDevoteePayload) {
  return request<DevoteeWithRecord>(`/devotees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function searchDevoteesByFace(faceDescriptor: number[], maxDistance = 0.6) {
  return request<DevoteeWithRecord[]>('/devotees/search-by-face', {
    method: 'POST',
    body: JSON.stringify({ face_descriptor: faceDescriptor, maxDistance }),
  });
}

export function searchDevotees(searchTerm: string, searchType: 'name' | 'phone' | 'registration') {
  const params = new URLSearchParams({ q: searchTerm, type: searchType });
  return request<DevoteeWithRecord[]>(`/devotees?${params.toString()}`);
}

export function createIncident(payload: CreateIncidentPayload) {
  // Clear incidents cache after creating new incident
  clearApiCache('incidents');
  return request<MedicalIncident>('/incidents', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getIncidents(devoteeId: string) {
  const params = new URLSearchParams({ devoteeId });
  return request<MedicalIncident[]>(`/incidents?${params.toString()}`);
}

// Lost & Found
export const reportLostFound = async (data: any) => {
  return request<LostPerson>('/lost-found/report', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

export const matchFace = async (descriptor: number[], statusFilter?: string) => {
  return request<{ matches: { person: LostPerson; distance: number; similarity: number }[] }>('/lost-found/match', {
    method: 'POST',
    body: JSON.stringify({
      face_descriptor: descriptor,
      status_filter: statusFilter
    }),
  });
};

export const getLostFoundList = async (status?: string) => {
  const url = status
    ? `/lost-found/list?status=${status}`
    : `/lost-found/list`;
  return request<LostPerson[]>(url);
};


import { useEffect, useState } from 'react';
import { AlertTriangle, Users, Phone, Activity, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

interface RiskPatient {
    devotee: {
        _id: string; // MongoDB ID for fetching full profile
        devotee_id: string;
        name: string;
        age: number;
        gender: string;
        phone: string;
        photo?: string;
    };
    medicalRecord: {
        chronic_conditions: string;
        blood_group?: string;
        allergies?: string;
    };
    riskScore: number;
    riskLevel: string;
    riskColor: string;
    breakdown: {
        age: number;
        medical: number;
        environmental: number;
        crowd: number;
    };
    recommendations: string[];
}

interface RiskStats {
    critical: number;
    high: number;
    moderate: number;
    low: number;
}

interface HighRiskDashboardProps {
    onSelectDevotee?: (devotee: any) => void;
}

export default function HighRiskDashboard({ onSelectDevotee }: HighRiskDashboardProps) {
    const { t } = useI18n();
    const [patients, setPatients] = useState<RiskPatient[]>([]);
    const [stats, setStats] = useState<RiskStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
    const [weatherData, setWeatherData] = useState<any>(null);

    useEffect(() => {
        fetchData();
        // Refresh every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, [filter]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch risk stats
            const statsRes = await fetch('/api/high-risk/stats');
            const statsData = await statsRes.json();
            setStats(statsData);

            // Fetch patients based on filter
            let endpoint = '/api/high-risk/list?limit=100';
            if (filter === 'critical') {
                endpoint = '/api/high-risk/critical';
            } else if (filter === 'high') {
                endpoint = '/api/high-risk/list?minScore=50';
            }

            const patientsRes = await fetch(endpoint);
            const patientsData = await patientsRes.json();

            setPatients(patientsData.patients || []);
            if (patientsData.weatherData) {
                setWeatherData(patientsData.weatherData);
            }

        } catch (error) {
            console.error('Failed to fetch high-risk data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleViewProfile = async (devoteeId: string) => {
        if (!onSelectDevotee) return;

        try {
            // Fetch full devotee details with medical records
            const response = await fetch(`/api/devotees/${devoteeId}`);
            if (!response.ok) throw new Error('Failed to fetch devotee details');

            const devoteeData = await response.json();
            onSelectDevotee(devoteeData);
        } catch (error) {
            console.error('Failed to fetch devotee details:', error);
        }
    };

    const getRiskBadge = (riskLevel: string, score: number) => {
        const colors = {
            'Critical': 'bg-red-100 text-red-800 border-red-300',
            'High': 'bg-orange-100 text-orange-800 border-orange-300',
            'Moderate': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'Low': 'bg-green-100 text-green-800 border-green-300'
        };

        const icons = {
            'Critical': '🔴',
            'High': '🟠',
            'Moderate': '🟡',
            'Low': '🟢'
        };

        return (
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colors[riskLevel as keyof typeof colors]}`}>
                <span>{icons[riskLevel as keyof typeof icons]}</span>
                <span className="font-bold">{score}</span>
                <span className="text-xs font-semibold uppercase">{riskLevel}</span>
            </div>
        );
    };

    if (loading && patients.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="w-7 h-7 text-red-600" />
                        {t('highRisk.title') || 'High-Risk Patients Monitor'}
                    </h2>
                    <p className="text-gray-600">{t('highRisk.desc') || 'AI-powered risk assessment for proactive medical intervention'}</p>
                </div>
                <div className="flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Live Monitoring
                </div>
            </div>

            {/* Weather Alert */}
            {weatherData && weatherData.temp > 35 && (
                <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-r-lg">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600" />
                        <p className="text-orange-800 font-semibold">
                            ⚠️ High Temperature Alert: {weatherData.temp.toFixed(1)}°C - Increased heat stroke risk
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        title="Critical"
                        value={stats.critical}
                        icon="🔴"
                        bgColor="bg-red-50"
                        textColor="text-red-800"
                    />
                    <StatCard
                        title="High Risk"
                        value={stats.high}
                        icon="🟠"
                        bgColor="bg-orange-50"
                        textColor="text-orange-800"
                    />
                    <StatCard
                        title="Moderate"
                        value={stats.moderate}
                        icon="🟡"
                        bgColor="bg-yellow-50"
                        textColor="text-yellow-800"
                    />
                    <StatCard
                        title="Low Risk"
                        value={stats.low}
                        icon="🟢"
                        bgColor="bg-green-50"
                        textColor="text-green-800"
                    />
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 font-semibold transition-colors ${filter === 'all'
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-gray-600 hover:text-blue-600'
                        }`}
                >
                    All Patients ({patients.length})
                </button>
                <button
                    onClick={() => setFilter('critical')}
                    className={`px-4 py-2 font-semibold transition-colors ${filter === 'critical'
                        ? 'border-b-2 border-red-600 text-red-600'
                        : 'text-gray-600 hover:text-red-600'
                        }`}
                >
                    Critical Only ({stats?.critical || 0})
                </button>
                <button
                    onClick={() => setFilter('high')}
                    className={`px-4 py-2 font-semibold transition-colors ${filter === 'high'
                        ? 'border-b-2 border-orange-600 text-orange-600'
                        : 'text-gray-600 hover:text-orange-600'
                        }`}
                >
                    High+ ({(stats?.critical || 0) + (stats?.high || 0)})
                </button>
            </div>

            {/* Patients List */}
            {patients.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No high-risk patients found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {patients.map((patient) => (
                        <PatientCard
                            key={patient.devotee._id}
                            patient={patient}
                            onViewProfile={handleViewProfile}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon, bgColor, textColor }: any) {
    return (
        <div className={`${bgColor} p-4 rounded-xl border border-gray-200 shadow-sm`}>
            <div className="text-2xl mb-1">{icon}</div>
            <div className={`text-3xl font-bold ${textColor}`}>{value}</div>
            <div className="text-sm text-gray-600 font-medium">{title}</div>
        </div>
    );
}

function PatientCard({ patient, onViewProfile }: { patient: RiskPatient; onViewProfile: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="p-4">
                <div className="flex items-start gap-4">
                    {/* Photo */}
                    <div className="flex-shrink-0">
                        {patient.devotee.photo ? (
                            <img
                                src={patient.devotee.photo}
                                alt={patient.devotee.name}
                                className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                            />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                                <Users className="w-8 h-8 text-gray-400" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">{patient.devotee.name}</h3>
                                <p className="text-sm text-gray-600">
                                    ID: {patient.devotee.devotee_id} • {patient.devotee.age}y • {patient.devotee.gender}
                                </p>
                            </div>
                            {getRiskBadge(patient.riskLevel, patient.riskScore)}
                        </div>

                        {/* Risk Breakdown */}
                        <div className="grid grid-cols-4 gap-2 mb-3">
                            <RiskBar label="Age" value={patient.breakdown.age} max={30} color="purple" />
                            <RiskBar label="Medical" value={patient.breakdown.medical} max={40} color="red" />
                            <RiskBar label="Weather" value={patient.breakdown.environmental} max={20} color="orange" />
                            <RiskBar label="Crowd" value={patient.breakdown.crowd} max={10} color="blue" />
                        </div>

                        {/* Medical Info */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                🩸 {patient.medicalRecord.blood_group || 'Unknown'}
                            </span>
                            <span className="bg-red-50 text-red-700 px-2 py-1 rounded text-xs font-medium">
                                💊 {patient.medicalRecord.chronic_conditions}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <a
                                href={`tel:${patient.devotee.phone}`}
                                className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                                <Phone className="w-4 h-4" />
                                Call
                            </a>
                            <button
                                onClick={() => onViewProfile(patient.devotee._id)}
                                className="inline-flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                                <Users className="w-4 h-4" />
                                View Profile
                            </button>
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                            >
                                <Activity className="w-4 h-4" />
                                {expanded ? 'Hide' : 'Show'} Details
                            </button>
                        </div>
                    </div>
                </div>

                {/* Expanded Recommendations */}
                {expanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-semibold text-gray-900 mb-2">📋 Recommendations:</h4>
                        <ul className="space-y-1">
                            {patient.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-gray-700">
                                    • {rec}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function RiskBar({ label, value, max, color }: any) {
    const percentage = (value / max) * 100;
    const colors = {
        purple: 'bg-purple-500',
        red: 'bg-red-500',
        orange: 'bg-orange-500',
        blue: 'bg-blue-500'
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-600 font-medium">{label}</span>
                <span className="text-xs text-gray-900 font-bold">{value}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className={`${colors[color as keyof typeof colors]} h-2 rounded-full transition-all`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
}

function getRiskBadge(riskLevel: string, score: number) {
    const colors = {
        'Critical': 'bg-red-100 text-red-800 border-red-300',
        'High': 'bg-orange-100 text-orange-800 border-orange-300',
        'Moderate': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'Low': 'bg-green-100 text-green-800 border-green-300'
    };

    const icons = {
        'Critical': '🔴',
        'High': '🟠',
        'Moderate': '🟡',
        'Low': '🟢'
    };

    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${colors[riskLevel as keyof typeof colors]}`}>
            <span>{icons[riskLevel as keyof typeof icons]}</span>
            <span className="font-bold">{score}</span>
            <span className="text-xs font-semibold uppercase">{riskLevel}</span>
        </div>
    );
}

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, Activity, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

interface AnalyticsData {
    totalDevotees: number;
    recentRegistrations: number;
    demographics: {
        age: { _id: string; count: number }[];
        gender: { _id: string; count: number }[];
    };
    analysis: {
        highRiskAge: number; // Age > 60
        highRiskMedical: number; // Has chronic conditions
        topConditions: { name: string; count: number }[];
    };
    alerts?: { condition: string; count: number; severity: string }[];
}

export default function AnalyticsDashboard() {
    const { t } = useI18n();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/analytics/stats');
                if (!response.ok) throw new Error('Failed to fetch analytics');
                const result = await response.json();
                setData(result);
            } catch (err) {
                console.error('Analytics load error:', err);
                setError('Failed to load analytics data');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Poll every 30 seconds for real-time updates
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                {error || 'No data available'}
            </div>
        );
    }

    // Prepare chart data
    const ageData = data.demographics.age.map(g => ({ name: g._id, count: g.count }));

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const genderData = data.demographics.gender.map(g => ({ name: g._id, value: g.count }));

    const conditionData = data.analysis.topConditions.map(c => ({ name: c.name, count: c.count }));

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">{t('analytics.title') || 'Health Analytics Dashboard'}</h2>
                    <p className="text-gray-600">{t('analytics.desc') || 'Real-time insights on pilgrim health and crowd demographics'}</p>
                </div>
                <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live Data
                </div>
            </div>

            {/* Government Alert Section */}
            {data.alerts && data.alerts.length > 0 && (
                <div className="bg-red-100 border-l-4 border-red-600 p-4 rounded-r-lg shadow-sm animate-pulse-slow">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-red-800 font-bold text-lg uppercase tracking-wide">
                                {t('analytics.alert.title')}
                            </h3>
                            <div className="space-y-1 mt-1">
                                {data.alerts.map((alert, idx) => (
                                    <p key={idx} className="text-red-700 font-medium">
                                        {t('analytics.alert.desc', { condition: alert.condition, count: alert.count })}
                                    </p>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card
                    title={t('analytics.totalYatris') || 'Total Pilgrims'}
                    value={data.totalDevotees}
                    icon={<Users className="w-6 h-6 text-blue-600" />}
                    trend={`+${data.recentRegistrations} in last 24h`}
                    bgColor="bg-blue-50"
                />
                <Card
                    title={t('analytics.highRisk') || 'High Risk (Medical)'}
                    value={data.analysis.highRiskMedical}
                    icon={<Activity className="w-6 h-6 text-red-600" />}
                    subtext="Chronic Conditions"
                    bgColor="bg-red-50"
                />
                <Card
                    title={t('analytics.seniorCitizens') || 'Senior Citizens (60+)'}
                    value={data.analysis.highRiskAge}
                    icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
                    bgColor="bg-orange-50"
                />
                <Card
                    title={t('analytics.recentActivity') || 'Recent Registrations'}
                    value={data.recentRegistrations}
                    icon={<TrendingUp className="w-6 h-6 text-green-600" />}
                    subtext="Last 24 Hours"
                    bgColor="bg-green-50"
                />
            </div>

            {/* Charts Section 1: Demographics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('analytics.ageDist') || 'Age Distribution'}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('analytics.genderDist') || 'Gender Ratio'}</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={genderData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {genderData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Section 2: Medical Risks */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">{t('analytics.conditions') || 'Prevalent Medical Conditions'}</h3>
                <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={conditionData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                            <XAxis type="number" />
                            <YAxis dataKey="name" type="category" width={100} />
                            <Tooltip />
                            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}

function Card({ title, value, icon, trend, subtext, bgColor }: any) {
    return (
        <div className={`${bgColor} p-6 rounded-xl border border-transparent hover:border-gray-200 transition-all shadow-sm`}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h4 className="text-gray-600 text-sm font-medium uppercase tracking-wide">{title}</h4>
                    <span className="text-3xl font-bold text-gray-900 mt-1 block">{value}</span>
                </div>
                <div className="p-2 bg-white rounded-lg shadow-sm">
                    {icon}
                </div>
            </div>
            {(trend || subtext) && (
                <div className="flex items-center gap-1 text-sm">
                    {trend && <span className="text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded-full">{trend}</span>}
                    {subtext && <span className="text-gray-500">{subtext}</span>}
                </div>
            )}
        </div>
    );
}

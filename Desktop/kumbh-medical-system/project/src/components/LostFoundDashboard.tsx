import { useState, useEffect } from 'react';
import { Camera, Search, User, Phone, MapPin, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import { reportLostFound, matchFace, getLostFoundList, LostPerson } from '../lib/api';
import { useI18n } from '../i18n/i18n';

export default function LostFoundDashboard() {
    const { t } = useI18n();
    const [view, setView] = useState<'home' | 'report' | 'found' | 'list'>('home');
    const [recentMissing, setRecentMissing] = useState<LostPerson[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [scanMode, setScanMode] = useState<'report' | 'match'>('report');

    // Form state for reporting
    const [formData, setFormData] = useState<Partial<LostPerson>>({
        name: '',
        age: undefined,
        gender: 'Unknown',
        status: 'missing'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Match state
    const [matches, setMatches] = useState<any[]>([]);

    useEffect(() => {
        loadRecent();
    }, []);

    const loadRecent = async () => {
        try {
            const data = await getLostFoundList('missing');
            setRecentMissing(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleCapture = async (imageData: string, descriptor: Float32Array | null, demographics?: any) => {
        setShowCamera(false);

        if (!descriptor) {
            alert(t('search.face.noDescriptor'));
            return;
        }

        const descriptorArray = Array.from(descriptor);

        if (scanMode === 'match') {
            // Find Match
            try {
                const results = await matchFace(descriptorArray, 'missing');
                setMatches(results.matches);
                setView('found'); // Show results
            } catch (e) {
                alert('Matching failed');
            }
        } else {
            // Report Form population
            setFormData(prev => ({
                ...prev,
                photo_url: imageData,
                // @ts-ignore - storing descriptor temporarily to send later
                face_descriptor: descriptorArray,
                age: demographics?.age,
                gender: demographics?.gender || 'Unknown'
            }));
            setView('report');
        }
    };

    const submitReport = async () => {
        setIsSubmitting(true);
        try {
            await reportLostFound({
                ...formData,
                // Ensure descriptor is present
                // @ts-ignore
                face_descriptor: formData.face_descriptor
            });
            alert('Report submitted successfully');
            setView('home');
            loadRecent();
        } catch (e) {
            console.error(e);
            alert('Failed to submit report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">AI Lost & Found</h1>
                    <p className="text-gray-500">Reuniting families with Facial Recognition</p>
                </div>
                {view !== 'home' && (
                    <button onClick={() => setView('home')} className="text-blue-600 font-medium">
                        Back to Home
                    </button>
                )}
            </header>

            {view === 'home' && (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Report Missing Card */}
                        <div
                            onClick={() => {
                                setFormData({ status: 'missing' });
                                setScanMode('report');
                                setShowCamera(true);
                            }}
                            className="bg-red-50 border-2 border-red-100 p-6 rounded-xl cursor-pointer hover:border-red-300 hover:shadow-md transition-all text-center space-y-3"
                        >
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-red-900">Report Missing Person</h3>
                            <p className="text-red-700">Upload photo & details of lost family member</p>
                        </div>

                        {/* Found Someone Card */}
                        <div
                            onClick={() => {
                                setScanMode('match');
                                setShowCamera(true);
                            }}
                            className="bg-green-50 border-2 border-green-100 p-6 rounded-xl cursor-pointer hover:border-green-300 hover:shadow-md transition-all text-center space-y-3"
                        >
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-green-900">I Found Someone</h3>
                            <p className="text-green-700">Scan face to check if they are reported missing</p>
                        </div>
                    </div>

                    {/* Recent Missing List */}
                    <div>
                        <h2 className="text-lg font-semibold mb-3">Recently Reported Missing</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recentMissing.map((person) => (
                                <div key={person._id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <img src={person.photo_url} alt={person.name} className="w-full h-40 object-cover" />
                                    <div className="p-3">
                                        <h4 className="font-bold truncate">{person.name || 'Unknown'}</h4>
                                        <p className="text-xs text-gray-500">{person.gender}, {person.age}y</p>
                                        <p className="text-xs text-red-500 font-medium mt-1 uppercase">{person.status}</p>
                                    </div>
                                </div>
                            ))}
                            {recentMissing.length === 0 && (
                                <p className="text-gray-500 italic col-span-full">No active reports.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'report' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 max-w-lg mx-auto">
                    <h2 className="text-xl font-bold">Report Details</h2>
                    <div className="flex justify-center">
                        <img src={formData.photo_url} alt="To Report" className="w-32 h-32 rounded-lg object-cover border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Age (Approx)</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded"
                                value={formData.age || ''}
                                onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Gender</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">Your Contact Name/Phone</label>
                        <input
                            type="text"
                            placeholder="e.g. Rahul - 9876543210"
                            className="w-full border p-2 rounded"
                            value={formData.contact_info?.phone || ''} // Simplified for demo
                            onChange={e => setFormData({
                                ...formData,
                                contact_info: { ...formData.contact_info, phone: e.target.value, name: 'Reporter', relationship: 'Family' }
                            })}
                        />
                    </div>

                    <button
                        onClick={submitReport}
                        disabled={isSubmitting}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 disabled:bg-gray-400"
                    >
                        {isSubmitting ? 'Submitting...' : 'Submit Report'}
                    </button>
                </div>
            )}

            {view === 'found' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-center">Match Results</h2>

                    {matches.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-lg border">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold">No Match Found</h3>
                            <p className="text-gray-600">This person has not been reported missing yet.</p>
                            <button
                                onClick={() => {
                                    setFormData({ status: 'found' }); // Start a "Found" report
                                    setView('report');
                                }}
                                className="mt-4 text-blue-600 font-medium underline"
                            >
                                Report as Found Person instead
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-center text-green-700 font-medium">Found {matches.length} possible matches!</p>
                            {matches.map((m, i) => (
                                <div key={i} className="bg-white border-2 border-green-100 p-4 rounded-lg flex gap-4 shadow-sm">
                                    <img src={m.person.photo_url} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{m.person.name}</h3>
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-bold">
                                                {(m.similarity * 100).toFixed(0)}% Match
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            Reported by: <span className="font-medium">{m.person.contact_info?.phone || 'Unknown'}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Missing since: {new Date(m.person.created_at).toLocaleDateString()}
                                        </p>
                                        <button className="mt-2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                                            <Phone className="w-4 h-4" /> Call Reporter
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {showCamera && (
                <SelfieCapture
                    onCapture={handleCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
        </div>
    );
}

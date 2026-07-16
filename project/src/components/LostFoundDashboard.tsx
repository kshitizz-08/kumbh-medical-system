import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Phone, QrCode, Printer } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import { reportLostFound, matchFace, getLostFoundList, LostPerson } from '../lib/api';
import { useI18n } from '../i18n/i18n';
import QRCodeDisplay from './QRCodeDisplay';
import { generateQRDataURL, printQRWristband } from '../utils/qrUtils';

export default function LostFoundDashboard() {
    const { t } = useI18n();
    const [view, setView] = useState<'home' | 'report' | 'found' | 'list' | 'wristband'>('home');
    const [recentMissing, setRecentMissing] = useState<LostPerson[]>([]);
    const [showCamera, setShowCamera] = useState(false);
    const [scanMode, setScanMode] = useState<'report' | 'match'>('report');
    const [submittedCase, setSubmittedCase] = useState<{ id: string; name: string; age?: number; gender?: string; photoUrl?: string; emergency?: string } | null>(null);
    const [wristbandQR, setWristbandQR] = useState<string | null>(null);

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

    const handleCapture = async (imageData: string, descriptor: number[] | null, demographics?: any) => {
        setShowCamera(false);

        if (!descriptor) {
            alert(t('search.face.noDescriptor'));
            return;
        }

        const descriptorArray = descriptor; // Already number[]

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
                // storing descriptor temporarily to send later
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
            const response = await reportLostFound({
                ...formData,
                // Ensure descriptor is present
                face_descriptor: formData.face_descriptor
            });
            // Transition to wristband view with the submitted data
            const caseId = (response as any)?._id || (response as any)?.id || `CASE-${Date.now()}`;
            setSubmittedCase({
                id: caseId,
                name: formData.name || 'Unknown',
                age: formData.age,
                gender: formData.gender,
                photoUrl: formData.photo_url,
                emergency: formData.contact_info?.phone ? `${formData.contact_info?.name || ''} ${formData.contact_info?.phone}`.trim() : undefined,
            });
            setWristbandQR(null);
            setView('wristband');
            loadRecent();
        } catch (e: any) {
            console.error(e);
            alert(`Failed to submit report: ${e.message} `);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{t('lost.title')}</h1>
                    <p className="text-gray-500">{t('lost.subtitle')}</p>
                </div>
                {view !== 'home' && (
                    <button onClick={() => setView('home')} className="text-blue-600 font-medium">
                        {t('lost.backHome')}
                    </button>
                )}
            </header>

            {/* QR Wristband View — shown after successful report */}
            {view === 'wristband' && submittedCase && (
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 text-center">
                        <div className="w-14 h-14 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                            <CheckCircle className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-green-900 mb-1">Report Submitted!</h2>
                        <p className="text-green-700 text-sm">Case ID: <span className="font-mono font-bold">{submittedCase.id}</span></p>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <QrCode className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-bold text-gray-900">QR Wristband</h3>
                        </div>
                        <p className="text-sm text-gray-500 mb-5">
                            Generate a printable QR wristband for <strong>{submittedCase.name}</strong>. Attach it to the missing person so medical staff can quickly identify them by scanning.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div className="flex-shrink-0">
                                <QRCodeDisplay
                                    value={JSON.stringify({ caseId: submittedCase.id, name: submittedCase.name, status: 'missing' })}
                                    size={170}
                                    label={`Case: ${submittedCase.id}`}
                                    downloadable
                                    downloadFilename={`wristband-${submittedCase.id}`}
                                    onQRReady={setWristbandQR}
                                />
                            </div>
                            <div className="flex-1 space-y-3">
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm space-y-1">
                                    <div className="font-bold text-red-900 text-base">{submittedCase.name}</div>
                                    {submittedCase.age && <div className="text-red-700">Age: {submittedCase.age}</div>}
                                    {submittedCase.gender && <div className="text-red-700">Gender: {submittedCase.gender}</div>}
                                    {submittedCase.emergency && (
                                        <div className="text-red-700 font-medium">📞 {submittedCase.emergency}</div>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={async () => {
                                        const qrURL = wristbandQR || await generateQRDataURL(
                                            JSON.stringify({ caseId: submittedCase.id, name: submittedCase.name, status: 'missing' })
                                        );
                                        printQRWristband({
                                            name: submittedCase.name,
                                            caseId: submittedCase.id,
                                            age: submittedCase.age,
                                            gender: submittedCase.gender,
                                            emergencyContact: submittedCase.emergency,
                                            photoUrl: submittedCase.photoUrl,
                                            qrDataURL: qrURL,
                                        });
                                    }}
                                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg text-sm"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print QR Wristband
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setView('home'); setSubmittedCase(null); }}
                                    className="w-full text-center text-gray-500 hover:text-gray-700 text-sm py-2 transition-colors"
                                >
                                    Done — Back to Home
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                            <h3 className="text-xl font-bold text-red-900">{t('lost.reportMissing')}</h3>
                            <p className="text-red-700">{t('lost.reportMissingDesc')}</p>
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
                            <h3 className="text-xl font-bold text-green-900">{t('lost.foundSomeone')}</h3>
                            <p className="text-green-700">{t('lost.foundSomeoneDesc')}</p>
                        </div>
                    </div>

                    {/* Recent Missing List */}
                    <div>
                        <h2 className="text-lg font-semibold mb-3">{t('lost.recent')}</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {recentMissing.map((person) => (
                                <div key={person._id} className="bg-white border rounded-lg overflow-hidden shadow-sm">
                                    <img src={person.photo_url} alt={person.name} className="w-full h-40 object-cover" />
                                    <div className="p-3">
                                        <h4 className="font-bold truncate">{person.name || 'Unknown'}</h4>
                                        <p className="text-xs text-gray-500">{person.gender}, {person.age}y</p>
                                        <p className="text-xs text-red-500 font-medium mt-1 uppercase">{t('lost.badge.missing')}</p>
                                    </div>
                                </div>
                            ))}
                            {recentMissing.length === 0 && (
                                <p className="text-gray-500 italic col-span-full">{t('lost.noActive')}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {view === 'report' && (
                <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4 max-w-lg mx-auto">
                    <h2 className="text-xl font-bold">{t('lost.reportDetails')}</h2>
                    <div className="flex justify-center">
                        <img src={formData.photo_url} alt="To Report" className="w-32 h-32 rounded-lg object-cover border" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('lost.form.name')}</label>
                        <input
                            type="text"
                            className="w-full border p-2 rounded"
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('lost.form.age')}</label>
                            <input
                                type="number"
                                className="w-full border p-2 rounded"
                                value={formData.age || ''}
                                onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">{t('lost.form.gender')}</label>
                            <select
                                className="w-full border p-2 rounded"
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                            >
                                <option value="Male">{t('reg.gender.male')}</option>
                                <option value="Female">{t('reg.gender.female')}</option>
                                <option value="Other">{t('reg.gender.other')}</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">{t('lost.form.contact')}</label>
                        <input
                            type="text"
                            placeholder={t('lost.form.contactPlaceholder')}
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
                        {isSubmitting ? t('lost.submitting') : t('lost.submit')}
                    </button>
                </div>
            )}

            {view === 'found' && (
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-center">{t('lost.match.title')}</h2>

                    {matches.length === 0 ? (
                        <div className="text-center py-10 bg-white rounded-lg border">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold">{t('lost.match.none')}</h3>
                            <p className="text-gray-600">{t('lost.match.noneDesc')}</p>
                            <button
                                onClick={() => {
                                    setFormData({ status: 'found' }); // Start a "Found" report
                                    setView('report');
                                }}
                                className="mt-4 text-blue-600 font-medium underline"
                            >
                                {t('lost.match.reportAsFound')}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-center text-green-700 font-medium">{t('lost.match.foundCount', { count: matches.length })}</p>
                            {matches.map((m, i) => (
                                <div key={i} className="bg-white border-2 border-green-100 p-4 rounded-lg flex gap-4 shadow-sm">
                                    <img src={m.person.photo_url} className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-lg">{m.person.name}</h3>
                                            <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-bold">
                                                {t('lost.match.matchPct', { pct: (m.similarity * 100).toFixed(0) })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            {t('lost.match.reportedBy')} <span className="font-medium">{m.person.contact_info?.phone || 'Unknown'}</span>
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {t('lost.match.missingSince')} {new Date(m.person.created_at).toLocaleDateString()}
                                        </p>
                                        <button className="mt-2 bg-green-600 text-white text-sm px-4 py-2 rounded-lg flex items-center gap-2">
                                            <Phone className="w-4 h-4" /> {t('lost.match.call')}
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

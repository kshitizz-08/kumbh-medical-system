import { useState } from 'react';
import { Camera, Save, User, AlertCircle } from 'lucide-react';
import { registerDevotee, CreateDevoteePayload } from '../lib/api';
import { useI18n } from '../i18n/i18n';
import SelfieCapture from './SelfieCapture';
import VoiceInput from './VoiceInput';

type RegistrationFormProps = {
    onSuccess: (regNumber: string) => void;
};

export default function RegistrationForm({ onSuccess }: RegistrationFormProps) {
    const { t, lang } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSelfieCapture, setShowSelfieCapture] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otherCondition, setOtherCondition] = useState('');
    const [showOtherCondition, setShowOtherCondition] = useState(false);
    const [medicationInput, setMedicationInput] = useState('');
    const [surgeryInput, setSurgeryInput] = useState('');

    const [formData, setFormData] = useState<CreateDevoteePayload>({
        full_name: '',
        age: 0,
        gender: 'Male', // Default
        phone: '',

        emergency_contact_name: '',
        emergency_contact_phone: '',
        blood_group: null,
        height_cm: null,
        weight_kg: null,
        allergies: '',
        chronic_conditions: '',
        current_medications: '',
        past_surgeries: '',
        vaccination_status: 'Fully Vaccinated',
        special_notes: '',
        photo_url: null,
        face_descriptor: null,
    });

    // Handle voice updates
    const handleVoiceInput = (field: keyof CreateDevoteePayload, text: string) => {
        setFormData(prev => ({
            ...prev,
            [field]: text
        }));
    };

    const handleCapture = (image: string, descriptor: number[] | null, demographics?: any) => {
        setFormData(prev => ({
            ...prev,
            photo_url: image, // In a real app, upload this first and get a URL
            face_descriptor: descriptor,
            // Auto-populate demographics if available and not already set manually? 
            // Or just overwrite? Let's overwrite for convenience but allow edit.
            age: demographics?.age || prev.age,
            gender: demographics?.gender === 'male' ? 'Male' : demographics?.gender === 'female' ? 'Female' : prev.gender,
            height_cm: demographics?.estimatedHeight || prev.height_cm,
            weight_kg: demographics?.estimatedWeight || prev.weight_kg,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            // Validate mandatory fields
            if (!formData.full_name || !formData.phone || !formData.photo_url || !formData.face_descriptor ||
                !formData.emergency_contact_name || !formData.emergency_contact_phone) {
                throw new Error(t('reg.fail', { message: 'Please fill required fields and take a photo.' }));
            }

            // Merge "Other" condition if pending
            const finalData = { ...formData };
            if (showOtherCondition && otherCondition.trim()) {
                const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                finalData.chronic_conditions = [...current, otherCondition.trim()].join(', ');
            }

            const result = await registerDevotee(finalData);
            onSuccess(result.registration_number);
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-orange-100 overflow-hidden">
            {showSelfieCapture && (
                <SelfieCapture
                    onCapture={handleCapture}
                    onClose={() => setShowSelfieCapture(false)}
                />
            )}

            <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-orange-900 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('register.pageTitle')}
                </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {/* Photo Section */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-orange-200 rounded-xl bg-orange-50/30">
                    {formData.photo_url ? (
                        <div className="relative">
                            <img
                                src={formData.photo_url}
                                alt="Devotee"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                            <button
                                type="button"
                                onClick={() => setShowSelfieCapture(true)}
                                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
                                title={t('selfie.retake')}
                            >
                                <Camera className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-400">
                                <Camera className="w-10 h-10" />
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowSelfieCapture(true)}
                                className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
                            >
                                {t('reg.takeSelfie')}
                            </button>
                            <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                                {t('reg.selfieHint')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">
                            {t('reg.personalInfo')}
                        </h4>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.fullName')} <span className="text-red-500 font-bold">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                                <VoiceInput onTranscript={(text) => handleVoiceInput('full_name', text)} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.age')} <span className="text-red-500 font-bold">*</span></label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    max="120"
                                    value={formData.age || ''}
                                    onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.gender')} <span className="text-red-500 font-bold">*</span></label>
                                <select
                                    value={formData.gender}
                                    onChange={e => setFormData({ ...formData, gender: e.target.value as any })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                >
                                    <option value="Male">{t('reg.gender.male')}</option>
                                    <option value="Female">{t('reg.gender.female')}</option>
                                    <option value="Other">{t('reg.gender.other')}</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.phone')} <span className="text-red-500 font-bold">*</span></label>
                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                                <VoiceInput onTranscript={(text) => handleVoiceInput('phone', text)} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                            </div>
                        </div>



                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.emergencyName')} <span className="text-red-500 font-bold">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        required
                                        value={formData.emergency_contact_name}
                                        onChange={e => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    />
                                    <VoiceInput onTranscript={(text) => handleVoiceInput('emergency_contact_name', text)} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.emergencyPhone')} <span className="text-red-500 font-bold">*</span></label>
                                <div className="flex gap-2">
                                    <input
                                        type="tel"
                                        required
                                        value={formData.emergency_contact_phone}
                                        onChange={e => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    />
                                    <VoiceInput onTranscript={(text) => handleVoiceInput('emergency_contact_phone', text)} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">
                            {t('reg.medicalInfo')}
                        </h4>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.height')} (cm)</label>
                                <input
                                    type="number"
                                    value={formData.height_cm || ''}
                                    onChange={e => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || null })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    placeholder="Est. by AI"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.weight')} (kg)</label>
                                <input
                                    type="number"
                                    value={formData.weight_kg || ''}
                                    onChange={e => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || null })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    placeholder="Est. by AI"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.bloodGroup')}</label>
                            <select
                                value={formData.blood_group || ''}
                                onChange={e => setFormData({ ...formData, blood_group: (e.target.value || null) as any })}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                            >
                                <option value="">{t('reg.selectBloodGroup')}</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.chronic')}</label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {formData.chronic_conditions.split(', ').filter(c => c && c !== 'None').map((condition, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-sm">
                                            {condition}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                                                    const newConditions = current.filter(c => c !== condition);
                                                    setFormData({ ...formData, chronic_conditions: newConditions.length ? newConditions.join(', ') : 'None' });
                                                }}
                                                className="hover:text-orange-900"
                                            >
                                                <AlertCircle className="w-4 h-4 rotate-45" />
                                            </button>
                                        </span>
                                    ))}
                                </div>

                                <select
                                    value=""
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!val) return;

                                        if (val === 'Other') {
                                            setShowOtherCondition(true);
                                            setOtherCondition('');
                                        } else if (val === 'None') {
                                            setFormData({ ...formData, chronic_conditions: 'None' });
                                            setShowOtherCondition(false);
                                        } else {
                                            const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                                            if (!current.includes(val)) {
                                                setFormData({ ...formData, chronic_conditions: [...current, val].join(', ') });
                                            }
                                            setShowOtherCondition(false);
                                        }
                                    }}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                >
                                    <option value="">{t('reg.chronicPlaceholder') || "Select..."}</option>
                                    <option value="None">{t('condition.none')}</option>
                                    <option value="Diabetes">{t('condition.diabetes')}</option>
                                    <option value="Hypertension">{t('condition.hypertension')}</option>
                                    <option value="Asthma">{t('condition.asthma')}</option>
                                    <option value="Arthritis">{t('condition.arthritis')}</option>
                                    <option value="Other">{t('condition.other')}</option>
                                </select>

                                {showOtherCondition && (
                                    <div className="flex gap-2 animate-fade-in-down">
                                        <input
                                            type="text"
                                            value={otherCondition}
                                            onChange={e => setOtherCondition(e.target.value)}
                                            placeholder={t('reg.chronicPlaceholder') || "Please specify condition..."}
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (otherCondition.trim()) {
                                                        const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                                                        setFormData({ ...formData, chronic_conditions: [...current, otherCondition.trim()].join(', ') });
                                                        setOtherCondition('');
                                                        setShowOtherCondition(false);
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (otherCondition.trim()) {
                                                    const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                                                    setFormData({ ...formData, chronic_conditions: [...current, otherCondition.trim()].join(', ') });
                                                    setOtherCondition('');
                                                    setShowOtherCondition(false);
                                                }
                                            }}
                                            className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm"
                                        >
                                            {t('common.add')}
                                        </button>
                                        <VoiceInput onTranscript={setOtherCondition} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.allergies')}</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.allergies}
                                    onChange={e => setFormData({ ...formData, allergies: e.target.value })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                />
                                <VoiceInput onTranscript={(text) => handleVoiceInput('allergies', text)} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                            </div>
                        </div>

                        {/* Medications */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.meds')}</label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {formData.current_medications.split(', ').filter(c => c).map((med, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-sm">
                                            {med}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.current_medications.split(', ').filter(c => c);
                                                    const newMeds = current.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, current_medications: newMeds.join(', ') });
                                                }}
                                                className="hover:text-blue-900"
                                            >
                                                <AlertCircle className="w-4 h-4 rotate-45" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={medicationInput}
                                        onChange={e => setMedicationInput(e.target.value)}
                                        placeholder={t('reg.medsPlaceholder')}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (medicationInput.trim()) {
                                                    const current = formData.current_medications.split(', ').filter(c => c);
                                                    setFormData({ ...formData, current_medications: [...current, medicationInput.trim()].join(', ') });
                                                    setMedicationInput('');
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (medicationInput.trim()) {
                                                const current = formData.current_medications.split(', ').filter(c => c);
                                                setFormData({ ...formData, current_medications: [...current, medicationInput.trim()].join(', ') });
                                                setMedicationInput('');
                                            }
                                        }}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm whitespace-nowrap"
                                    >
                                        {t('common.add')}
                                    </button>
                                    <VoiceInput onTranscript={setMedicationInput} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                </div>
                            </div>
                        </div>

                        {/* Surgeries */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.surgeries')}</label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2">
                                    {formData.past_surgeries.split(', ').filter(c => c).map((surg, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-800 text-sm">
                                            {surg}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = formData.past_surgeries.split(', ').filter(c => c);
                                                    const newSurgs = current.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, past_surgeries: newSurgs.join(', ') });
                                                }}
                                                className="hover:text-red-900"
                                            >
                                                <AlertCircle className="w-4 h-4 rotate-45" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={surgeryInput}
                                        onChange={e => setSurgeryInput(e.target.value)}
                                        placeholder={t('reg.surgeriesPlaceholder')}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (surgeryInput.trim()) {
                                                    const current = formData.past_surgeries.split(', ').filter(c => c);
                                                    setFormData({ ...formData, past_surgeries: [...current, surgeryInput.trim()].join(', ') });
                                                    setSurgeryInput('');
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (surgeryInput.trim()) {
                                                const current = formData.past_surgeries.split(', ').filter(c => c);
                                                setFormData({ ...formData, past_surgeries: [...current, surgeryInput.trim()].join(', ') });
                                                setSurgeryInput('');
                                            }
                                        }}
                                        className="px-3 py-2 bg-red-600 text-white rounded-md text-sm whitespace-nowrap"
                                    >
                                        {t('common.add')}
                                    </button>
                                    <VoiceInput onTranscript={setSurgeryInput} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-end">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-orange-700 hover:to-red-700 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                {t('reg.submitting')}
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {t('reg.submit')}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

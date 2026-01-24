import { useState } from 'react';
import { Camera, Save, User, AlertCircle, Scissors, Activity, Droplet, Stethoscope, Pill, Users, Phone, UserCircle } from 'lucide-react';
import { registerDevotee, updateDevotee, CreateDevoteePayload, DevoteeWithRecord } from '../lib/api';
import { useI18n } from '../i18n/i18n';
import SelfieCapture from './SelfieCapture';
import VoiceInput from './VoiceInput';
import { parseSpokenPhoneNumber } from '../utils/textUtils';

type RegistrationFormProps = {
    onSuccess: (data: DevoteeWithRecord) => void;
    initialData?: any;
    isEditing?: boolean;
    devoteeId?: string;
};

export default function RegistrationForm({ onSuccess, initialData, isEditing = false, devoteeId }: RegistrationFormProps) {
    const { t, lang } = useI18n();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSelfieCapture, setShowSelfieCapture] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [otherCondition, setOtherCondition] = useState('');
    const [showOtherCondition, setShowOtherCondition] = useState(false);
    const [medicationInput, setMedicationInput] = useState('');
    const [surgeryInput, setSurgeryInput] = useState('');
    const [otherAllergy, setOtherAllergy] = useState('');
    const [showOtherAllergy, setShowOtherAllergy] = useState(false);

    const [formData, setFormData] = useState<CreateDevoteePayload>(() => {
        if (initialData) {
            return {
                full_name: initialData.full_name || '',
                age: initialData.age || 0,
                gender: initialData.gender || 'Male', // Default
                phone: initialData.phone || '',

                emergency_contact_name: initialData.emergency_contact_name || '',
                emergency_contact_phone: initialData.emergency_contact_phone || '',
                blood_group: initialData.medical_records?.blood_group || null,
                height_cm: initialData.medical_records?.height_cm || null,
                weight_kg: initialData.medical_records?.weight_kg || null,
                allergies: initialData.medical_records?.allergies || '',
                chronic_conditions: initialData.medical_records?.chronic_conditions || '',
                current_medications: initialData.medical_records?.current_medications || '',
                past_surgeries: initialData.medical_records?.past_surgeries || '',

                special_notes: initialData.medical_records?.special_notes || '',
                photo_url: initialData.photo_url || null,
                face_descriptor: initialData.face_descriptor || null,
            };
        }
        return {
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

            special_notes: '',
            photo_url: null,
            face_descriptor: null,
        };
    });

    // Handle voice updates
    const handleVoiceInput = (field: keyof CreateDevoteePayload, text: string) => {
        setFormData(prev => {
            let newValue = text;

            // field-specific processing
            if (field === 'phone' || field === 'emergency_contact_phone') {
                newValue = parseSpokenPhoneNumber(text);
            } else if (['chronic_conditions', 'current_medications', 'past_surgeries', 'allergies'].includes(field)) {
                // For list fields, APPEND to existing value instead of replacing
                const currentValue = prev[field] as string;
                if (currentValue && currentValue !== 'None') {
                    // Check if text already exists to prevent duplicates (simple check)
                    if (!currentValue.toLowerCase().includes(text.toLowerCase())) {
                        newValue = `${currentValue}, ${text}`;
                    } else {
                        newValue = currentValue; // No change if duplicate
                    }
                }
            }

            return {
                ...prev,
                [field]: newValue
            };
        });
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
            // Validate mandatory fields
            // In editing mode, we might be more lenient or strict, but let's keep consistency.
            // Photo URL must exist.
            if (!formData.full_name || !formData.phone || !formData.photo_url ||
                !formData.emergency_contact_name || !formData.emergency_contact_phone) {
                throw new Error(t('reg.fail', { message: 'Please fill required fields.' }));
            }

            // Merge "Other" condition if pending
            const finalData = { ...formData };
            if (showOtherCondition && otherCondition.trim()) {
                const current = formData.chronic_conditions.split(', ').filter(c => c && c !== 'None');
                finalData.chronic_conditions = [...current, otherCondition.trim()].join(', ');
            }

            let result;
            if (isEditing && devoteeId) {
                // Update existing
                result = await updateDevotee(devoteeId, finalData);
            } else {
                // Register new
                if (!formData.face_descriptor) {
                    // Start of registration must have face descriptor potentially?
                    // Actually, let's keep it safe.
                }
                result = await registerDevotee(finalData);
            }

            onSuccess(result);
        } catch (err: any) {
            console.error('Registration failed:', err);
            setError(err.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            <form onSubmit={handleSubmit} className="bg-gradient-to-br from-amber-50/95 via-orange-50/90 to-kumbh-sand/95 backdrop-blur shadow-2xl rounded-3xl p-8 space-y-8 border border-orange-200/50">
                {error && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p>{error}</p>
                    </div>
                )}

                {showSelfieCapture && (
                    <SelfieCapture
                        onCapture={handleCapture}
                        onClose={() => setShowSelfieCapture(false)}
                    />
                )}

                {/* Photo Section */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-orange-300 rounded-xl bg-gradient-to-br from-orange-50 to-amber-50">
                    {formData.photo_url ? (
                        <div className="relative">
                            <img
                                src={formData.photo_url}
                                alt="Devotee"
                                className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                            {!isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setShowSelfieCapture(true)}
                                    className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 shadow-md transition-transform hover:scale-105"
                                    title={t('selfie.retake')}
                                >
                                    <Camera className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ) : (
                        !isEditing ? (
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
                        ) : (
                            <div className="text-center text-gray-400">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <User className="w-10 h-10" />
                                </div>
                                <p className="text-sm">{t('profile.noPhoto') || 'No photo available'}</p>
                            </div>
                        )
                    )}
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b-2 border-blue-300">
                            <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl shadow-sm">
                                <Users className="w-7 h-7 text-blue-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {t('reg.personalInfo')}
                            </h2>
                        </div>

                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <UserCircle className="w-4 h-4 text-blue-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.fullName')} <span className="text-red-500 font-bold">*</span></label>
                            </div>
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
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-blue-500 font-bold">#</span>
                                    <label className="text-base font-semibold text-gray-800">{t('reg.age')} <span className="text-red-500 font-bold">*</span></label>
                                </div>
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
                                <div className="flex items-center gap-2 mb-2">
                                    <User className="w-4 h-4 text-blue-500" />
                                    <label className="text-base font-semibold text-gray-800">{t('reg.gender')} <span className="text-red-500 font-bold">*</span></label>
                                </div>
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

                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Phone className="w-4 h-4 text-blue-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.phone')} <span className="text-red-500 font-bold">*</span></label>
                            </div>
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



                        <div className="grid grid-cols-2 gap-4">
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <UserCircle className="w-4 h-4 text-blue-500" />
                                    <label className="text-base font-semibold text-gray-800">{t('reg.emergencyName')} <span className="text-red-500 font-bold">*</span></label>
                                </div>
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
                            <div className="relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <Phone className="w-4 h-4 text-blue-500" />
                                    <label className="text-base font-semibold text-gray-800">{t('reg.emergencyPhone')} <span className="text-red-500 font-bold">*</span></label>
                                </div>
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

                    {/* Medical Information */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 pb-4 border-b-2 border-orange-300">
                            <div className="p-3 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl shadow-sm">
                                <Stethoscope className="w-7 h-7 text-orange-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                {t('reg.medicalInfo')}
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.height')}</label>
                                <input
                                    type="number"
                                    value={formData.height_cm || ''}
                                    onChange={e => setFormData({ ...formData, height_cm: parseFloat(e.target.value) || null })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    placeholder="Est. by AI"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.weight')}</label>
                                <input
                                    type="number"
                                    value={formData.weight_kg || ''}
                                    onChange={e => setFormData({ ...formData, weight_kg: parseFloat(e.target.value) || null })}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                    placeholder="Est. by AI"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center gap-2 mb-3">
                                <Droplet className="w-5 h-5 text-red-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.bloodGroup')}</label>
                            </div>
                            <div className="grid grid-cols-4 gap-3">
                                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                                    <label
                                        key={bg}
                                        className={`
                                            relative flex items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all font-medium text-base
                                            ${formData.blood_group === bg
                                                ? 'border-red-500 bg-gradient-to-br from-red-50 to-red-100 text-red-700 shadow-md scale-105'
                                                : 'border-gray-200 hover:border-red-300 hover:bg-red-50 text-gray-600 hover:scale-102'
                                            }
                                        `}
                                    >
                                        <input
                                            type="radio"
                                            name="blood_group"
                                            value={bg}
                                            checked={formData.blood_group === bg}
                                            onChange={() => setFormData({ ...formData, blood_group: bg as any })}
                                            className="sr-only"
                                        />
                                        <span>{bg}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Activity className="w-5 h-5 text-orange-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.chronic')}</label>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {(() => {
                                        const conditionKeys = ['hypertension', 'diabetes', 'arthritis', 'asthma', 'heartDisease', 'thyroid', 'kidneyDisease', 'liverDisease', 'cancer', 'stroke', 'depression', 'none', 'other'];
                                        return conditionKeys.map((key) => {
                                            const conditionLabel = t(`condition.${key}`);
                                            const conditionList = formData.chronic_conditions.split(', ').filter(c => c);
                                            const isSelected = conditionList.includes(conditionLabel);
                                            const isNone = key === 'none';

                                            return (
                                                <label
                                                    key={key}
                                                    className={`
                                                        relative flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                                        ${isSelected
                                                            ? isNone
                                                                ? 'border-gray-400 bg-gray-50 text-gray-700 font-medium'
                                                                : 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                                                            : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50 text-gray-600'
                                                        }
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            let newConditions = conditionList.filter(c => c !== t('condition.none'));

                                                            if (key === 'none') {
                                                                newConditions = isSelected ? [] : [conditionLabel];
                                                                setShowOtherCondition(false);
                                                            } else if (key === 'other') {
                                                                if (isSelected) {
                                                                    newConditions = newConditions.filter(c => c !== conditionLabel);
                                                                    setShowOtherCondition(false);
                                                                    setOtherCondition('');
                                                                } else {
                                                                    newConditions = [...newConditions, conditionLabel];
                                                                    setShowOtherCondition(true);
                                                                }
                                                            } else {
                                                                if (isSelected) {
                                                                    newConditions = newConditions.filter(c => c !== conditionLabel);
                                                                } else {
                                                                    newConditions = [...newConditions, conditionLabel];
                                                                }
                                                            }

                                                            setFormData({ ...formData, chronic_conditions: newConditions.length ? newConditions.join(', ') : '' });
                                                        }}
                                                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                                    />
                                                    <span className="text-sm">{conditionLabel}</span>
                                                </label>
                                            );
                                        });
                                    })()}
                                </div>

                                {showOtherCondition && (
                                    <div className="flex gap-2 animate-fade-in-down">
                                        <input
                                            type="text"
                                            value={otherCondition}
                                            onChange={e => setOtherCondition(e.target.value)}
                                            placeholder="Specify other condition..."
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (otherCondition.trim()) {
                                                        const current = formData.chronic_conditions.split(', ').filter(c => c && c !== t('condition.other') && c !== t('condition.none'));
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
                                                    const current = formData.chronic_conditions.split(', ').filter(c => c && c !== t('condition.other') && c !== t('condition.none'));
                                                    setFormData({ ...formData, chronic_conditions: [...current, otherCondition.trim()].join(', ') });
                                                    setOtherCondition('');
                                                    setShowOtherCondition(false);
                                                }
                                            }}
                                            className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm whitespace-nowrap"
                                        >
                                            {t('common.add')}
                                        </button>
                                        <VoiceInput onTranscript={setOtherCondition} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <AlertCircle className="w-5 h-5 text-yellow-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.allergies')}</label>
                            </div>
                            <div className="space-y-3">
                                <div className="grid grid-cols-3 gap-2">
                                    {(() => {
                                        const allergyKeys = ['dust', 'pollen', 'peanuts', 'dairy', 'shellfish', 'treeNuts', 'eggs', 'wheat', 'soy', 'animalDander', 'mold', 'insectStings', 'medications', 'none', 'other'];
                                        return allergyKeys.map((key) => {
                                            const allergyLabel = t(`allergy.${key}`);
                                            const allergyList = formData.allergies.split(', ').filter(a => a);
                                            const isSelected = allergyList.includes(allergyLabel);
                                            const isNone = key === 'none';

                                            return (
                                                <label
                                                    key={key}
                                                    className={`
                                                        relative flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-all text-sm
                                                        ${isSelected
                                                            ? isNone
                                                                ? 'border-gray-400 bg-gray-50 text-gray-700 font-medium'
                                                                : 'border-orange-500 bg-orange-50 text-orange-700 font-medium'
                                                            : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50 text-gray-600'
                                                        }
                                                    `}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {
                                                            let newAllergies = allergyList.filter(a => a !== t('allergy.none'));

                                                            if (key === 'none') {
                                                                newAllergies = isSelected ? [] : [allergyLabel];
                                                                setShowOtherAllergy(false);
                                                            } else if (key === 'other') {
                                                                if (isSelected) {
                                                                    newAllergies = newAllergies.filter(a => a !== allergyLabel);
                                                                    setShowOtherAllergy(false);
                                                                    setOtherAllergy('');
                                                                } else {
                                                                    newAllergies = [...newAllergies, allergyLabel];
                                                                    setShowOtherAllergy(true);
                                                                }
                                                            } else {
                                                                if (isSelected) {
                                                                    newAllergies = newAllergies.filter(a => a !== allergyLabel);
                                                                } else {
                                                                    newAllergies = [...newAllergies, allergyLabel];
                                                                }
                                                            }

                                                            setFormData({ ...formData, allergies: newAllergies.length ? newAllergies.join(', ') : '' });
                                                        }}
                                                        className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                                                    />
                                                    <span className="text-sm">{allergyLabel}</span>
                                                </label>
                                            );
                                        });
                                    })()}
                                </div>

                                {showOtherAllergy && (
                                    <div className="flex gap-2 animate-fade-in-down">
                                        <input
                                            type="text"
                                            value={otherAllergy}
                                            onChange={e => setOtherAllergy(e.target.value)}
                                            placeholder="Specify other allergy..."
                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    if (otherAllergy.trim()) {
                                                        const current = formData.allergies.split(', ').filter(a => a && a !== 'Other');
                                                        setFormData({ ...formData, allergies: [...current, otherAllergy.trim()].join(', ') });
                                                        setOtherAllergy('');
                                                        setShowOtherAllergy(false);
                                                    }
                                                }
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (otherAllergy.trim()) {
                                                    const current = formData.allergies.split(', ').filter(a => a && a !== 'Other');
                                                    setFormData({ ...formData, allergies: [...current, otherAllergy.trim()].join(', ') });
                                                    setOtherAllergy('');
                                                    setShowOtherAllergy(false);
                                                }
                                            }}
                                            className="px-3 py-2 bg-orange-600 text-white rounded-md text-sm whitespace-nowrap"
                                        >
                                            {t('common.add')}
                                        </button>
                                        <VoiceInput onTranscript={setOtherAllergy} language={lang === 'en' ? 'en-US' : lang === 'hi' ? 'hi-IN' : 'mr-IN'} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Medications */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Pill className="w-5 h-5 text-blue-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.meds')}</label>
                            </div>
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
                            <div className="flex items-center gap-2 mb-3">
                                <Scissors className="w-5 h-5 text-purple-500" />
                                <label className="text-base font-semibold text-gray-800">{t('reg.surgeries')}</label>
                            </div>
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
        </div >
    );
}

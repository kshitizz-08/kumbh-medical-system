import { useState } from 'react';
import { registerDevotee } from '../lib/api';
import { UserPlus, Loader2, Camera, X, Eye, Edit, CheckCircle, Heart, Sparkles, ChevronRight, Scan } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import MedicalRecommendations from './MedicalRecommendations';
import { useI18n } from '../i18n/i18n';

type FormData = {
  full_name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
  camp_location: string;
  id_proof_type: string;
  id_proof_number: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  blood_group: string;
  height_cm: string;
  weight_kg: string;
  allergies: string;
  chronic_conditions: string;
  current_medications: string;
  past_surgeries: string;
  vaccination_status: string;
  special_notes: string;
};

export default function RegistrationForm({ onSuccess }: { onSuccess: (regNumber: string) => void }) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [showSelfieCapture, setShowSelfieCapture] = useState(false);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  // Track which fields were auto-filled
  const [autoFilledFields, setAutoFilledFields] = useState<string[]>([]);

  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    age: '',
    gender: 'Male',
    phone: '',
    address: '',
    camp_location: '',
    id_proof_type: 'Aadhar',
    id_proof_number: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    blood_group: '',
    height_cm: '',
    weight_kg: '',
    allergies: '',
    chronic_conditions: '',
    current_medications: '',
    past_surgeries: '',
    vaccination_status: '',
    special_notes: '',
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSummary(true);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);

    try {
      const devotee = await registerDevotee({
        full_name: formData.full_name,
        age: parseInt(formData.age, 10),
        gender: formData.gender as 'Male' | 'Female' | 'Other',
        phone: formData.phone,
        address: formData.address,
        camp_location: formData.camp_location || null,
        id_proof_type: formData.id_proof_type,
        id_proof_number: formData.id_proof_number,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        blood_group: formData.blood_group as any,
        height_cm: formData.height_cm ? parseFloat(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        allergies: formData.allergies,
        chronic_conditions: formData.chronic_conditions,
        current_medications: formData.current_medications,
        past_surgeries: formData.past_surgeries,
        vaccination_status: formData.vaccination_status,
        special_notes: formData.special_notes,
        photo_url: selfieImage || null,
        face_descriptor: faceDescriptor,
      });

      onSuccess(devotee.registration_number);
    } catch (error) {
      alert(t('reg.fail', { message: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Remove field from auto-filled list if user manually edits it
    if (autoFilledFields.includes(e.target.name)) {
      setAutoFilledFields(prev => prev.filter(f => f !== e.target.name));
    }
  };

  const SummaryField = ({ label, value }: { label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="group">
        <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
          {label}
        </dt>
        <dd className="text-base font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md group-hover:bg-gray-100 transition-colors">
          {value}
        </dd>
      </div>
    );
  };

  if (showSummary) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl shadow-2xl">
          <div className="relative p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{t('reg.reviewTitle')}</h2>
                <p className="text-blue-100 text-sm max-w-2xl">{t('reg.reviewDesc')}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-white" />
              </div>
              {t('reg.personalInfo')}
            </h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryField label={t('reg.fullName')} value={formData.full_name} />
              <SummaryField label={t('reg.age')} value={`${formData.age} years`} />
              <SummaryField label={t('reg.gender')} value={formData.gender} />
              <SummaryField label={t('reg.phone')} value={formData.phone} />
              <div className="md:col-span-2">
                <SummaryField label={t('reg.address')} value={formData.address} />
              </div>
              <SummaryField label={t('reg.campLocation')} value={formData.camp_location || 'Not specified'} />
              <SummaryField label={t('reg.idProofType')} value={formData.id_proof_type} />
              <SummaryField label={t('reg.idProofNumber')} value={formData.id_proof_number} />
              <SummaryField label={t('reg.emergencyName')} value={formData.emergency_contact_name} />
              <SummaryField label={t('reg.emergencyPhone')} value={formData.emergency_contact_phone} />

              {selfieImage && (
                <div className="md:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{t('reg.selfie')}</dt>
                  <dd className="flex gap-4 items-center">
                    <div className="relative group">
                      <img
                        src={selfieImage}
                        alt="Selfie preview"
                        className="w-24 h-24 object-cover rounded-xl border-2 border-blue-200 shadow-md group-hover:shadow-xl transition-all"
                      />
                      <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 rounded-xl transition-colors"></div>
                    </div>
                    <span className="text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Photo captured
                    </span>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white" />
              </div>
              {t('reg.medicalInfo')}
            </h3>
          </div>
          <div className="p-6">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SummaryField label={t('reg.bloodGroup')} value={formData.blood_group || 'Not specified'} />
              <SummaryField label={t('reg.height')} value={formData.height_cm ? `${formData.height_cm} cm` : 'Not specified'} />
              <SummaryField label={t('reg.weight')} value={formData.weight_kg ? `${formData.weight_kg} kg` : 'Not specified'} />
              <SummaryField label={t('reg.vaccination')} value={formData.vaccination_status || 'Not specified'} />
              <SummaryField label={t('reg.allergies')} value={formData.allergies || 'None reported'} />
              <SummaryField label={t('reg.chronic')} value={formData.chronic_conditions || 'None reported'} />
              <SummaryField label={t('reg.meds')} value={formData.current_medications || 'None reported'} />
              <SummaryField label={t('reg.surgeries')} value={formData.past_surgeries || 'None reported'} />
              <SummaryField label={t('reg.notes')} value={formData.special_notes || 'None'} />
            </dl>
          </div>
        </div>

        <MedicalRecommendations
          formData={{
            allergies: formData.allergies,
            chronic_conditions: formData.chronic_conditions,
            current_medications: formData.current_medications,
            blood_group: formData.blood_group
          }}
        />

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={() => setShowSummary(false)}
            className="flex-1 bg-white text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 font-semibold flex items-center justify-center gap-2 transition-all border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
          >
            <Edit className="w-5 h-5" />
            {t('reg.editInfo')}
          </button>
          <button
            type="button"
            onClick={handleFinalSubmit}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('reg.submitting')}
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                {t('reg.confirmSubmit')}
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* 🚀 PHOTO FIRST WORKFLOW - Prominent Call to Action */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-2 flex items-center justify-center md:justify-start gap-2">
              <Scan className="w-6 h-6" />
              Take Full Body Photo (Auto-fill)
            </h2>
            <p className="text-blue-100 mb-4">AI will estimate your Height, Weight, Age & Gender</p>

            {!selfieImage ? (
              <button
                type="button"
                onClick={() => setShowSelfieCapture(true)}
                className="w-full md:w-auto bg-white text-blue-600 py-3 px-6 rounded-xl font-bold shadow-lg hover:bg-blue-50 hover:scale-105 transition-all flex items-center justify-center gap-2 text-lg"
              >
                <Camera className="w-6 h-6" />
                {t('reg.takeSelfie')}
              </button>
            ) : (
              <div className="flex items-center gap-4 bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/30">
                <img
                  src={selfieImage}
                  alt="Captured"
                  className="w-16 h-16 rounded-lg object-cover border-2 border-white"
                />
                <div className="text-left">
                  <p className="font-semibold flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-300" />
                    Photo Captured
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieImage(null);
                      setFaceDescriptor(null);
                      // Optional: Clear auto-filled fields if photo is removed? 
                      // Maybe better to keep them unless user changes.
                    }}
                    className="text-xs text-blue-100 hover:text-white underline mt-1"
                  >
                    Retake Photo
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:block">
            <Sparkles className="w-24 h-24 text-white/10" />
          </div>
        </div>

        {/* Decorative background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
      </div>


      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
          <UserPlus className="w-6 h-6 text-blue-600" />
          {t('reg.personalInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.fullName')}</label>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.age')}</label>
            <div className="relative">
              <input
                type="number"
                name="age"
                required
                min="1"
                max="150"
                value={formData.age}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-lg ${autoFilledFields.includes('age')
                  ? 'border-green-300 bg-green-50 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
              />
              {autoFilledFields.includes('age') && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-700 font-medium bg-white px-2 py-1 rounded-full shadow-sm border border-green-200">
                  <Sparkles className="w-3 h-3" />
                  {t('reg.autoFilled')}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.gender')}</label>
            <div className="relative">
              <select
                name="gender"
                required
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-lg appearance-none ${autoFilledFields.includes('gender')
                  ? 'border-green-300 bg-green-50 focus:ring-green-500'
                  : 'border-gray-300 focus:ring-blue-500'
                  }`}
              >
                <option value="Male">{t('reg.gender.male')}</option>
                <option value="Female">{t('reg.gender.female')}</option>
                <option value="Other">{t('reg.gender.other')}</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronRight className="w-5 h-5 rotate-90" />
              </div>
              {autoFilledFields.includes('gender') && (
                <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-700 font-medium bg-white px-2 py-1 rounded-full shadow-sm border border-green-200 pointer-events-none">
                  <Sparkles className="w-3 h-3" />
                  {t('reg.autoFilled')}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.phone')}</label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.address')}</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.campLocation')}</label>
            <input
              type="text"
              name="camp_location"
              value={formData.camp_location}
              onChange={handleChange}
              placeholder={t('reg.campPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.idProofType')}</label>
              <select
                name="id_proof_type"
                required
                value={formData.id_proof_type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              >
                <option value="Aadhar">{t('reg.id.aadhar')}</option>
                <option value="Passport">{t('reg.id.passport')}</option>
                <option value="Voter ID">{t('reg.id.voter')}</option>
                <option value="Driving License">{t('reg.id.dl')}</option>
                <option value="Other">{t('reg.id.other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.idProofNumber')}</label>
              <input
                type="text"
                name="id_proof_number"
                required
                value={formData.id_proof_number}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
              />
            </div>
          </div>

          <div>
            {/* Empty column placeholder or used if needed */}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.emergencyName')}</label>
            <input
              type="text"
              name="emergency_contact_name"
              required
              value={formData.emergency_contact_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.emergencyPhone')}</label>
            <input
              type="tel"
              name="emergency_contact_phone"
              required
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2 border-b pb-4">
          <Heart className="w-6 h-6 text-red-600" />
          {t('reg.medicalInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.bloodGroup')}</label>
            <select
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            >
              <option value="">{t('reg.selectBloodGroup')}</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.height')}</label>
              <div className="relative">
                <input
                  type="number"
                  name="height_cm"
                  step="0.1"
                  value={formData.height_cm}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-lg ${autoFilledFields.includes('height_cm')
                      ? 'border-green-300 bg-green-50 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }`}
                />
                {autoFilledFields.includes('height_cm') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-700 font-medium bg-white px-2 py-1 rounded-full shadow-sm border border-green-200">
                    <Sparkles className="w-3 h-3" />
                    {t('reg.autoFilled')}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.weight')}</label>
              <div className="relative">
                <input
                  type="number"
                  name="weight_kg"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:border-transparent transition-all text-lg ${autoFilledFields.includes('weight_kg')
                      ? 'border-green-300 bg-green-50 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-blue-500'
                    }`}
                />
                {autoFilledFields.includes('weight_kg') && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-xs text-green-700 font-medium bg-white px-2 py-1 rounded-full shadow-sm border border-green-200">
                    <Sparkles className="w-3 h-3" />
                    {t('reg.autoFilled')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.vaccination')}</label>
            <input
              type="text"
              name="vaccination_status"
              value={formData.vaccination_status}
              onChange={handleChange}
              placeholder={t('reg.vaccinationPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.allergies')}</label>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.allergiesPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.chronic')}</label>
            <textarea
              name="chronic_conditions"
              value={formData.chronic_conditions}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.chronicPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.meds')}</label>
            <textarea
              name="current_medications"
              value={formData.current_medications}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.medsPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.surgeries')}</label>
            <textarea
              name="past_surgeries"
              value={formData.past_surgeries}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.surgeriesPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reg.notes')}</label>
            <textarea
              name="special_notes"
              value={formData.special_notes}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.notesPlaceholder')}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-lg"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !selfieImage}
        className="w-full bg-blue-600 text-white py-4 px-6 rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold text-xl flex items-center justify-center gap-3 transition-colors shadow-lg hover:shadow-xl"
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            {t('reg.submitting')}
          </>
        ) : (
          <>
            <Eye className="w-6 h-6" />
            {t('reg.reviewSubmit')}
          </>
        )}
      </button>

      {showSelfieCapture && (
        <SelfieCapture
          onCapture={(imageData, descriptor, estimate) => {
            setSelfieImage(imageData);
            setFaceDescriptor(descriptor);

            // Auto-fill logic for ALL 4 fields
            const newFilledFields: string[] = [];
            const updates: Partial<FormData> = {};

            if (estimate?.age) {
              updates.age = estimate.age.toString();
              newFilledFields.push('age');
            }
            if (estimate?.gender) {
              // Map to form gender values
              const g = estimate.gender.toLowerCase();
              if (g === 'male') updates.gender = 'Male';
              else if (g === 'female') updates.gender = 'Female';
              else updates.gender = 'Other';
              newFilledFields.push('gender');
            }
            if (estimate?.height) {
              updates.height_cm = estimate.height.toString();
              newFilledFields.push('height_cm');
            }
            if (estimate?.weight) {
              updates.weight_kg = estimate.weight.toString();
              newFilledFields.push('weight_kg');
            }

            if (Object.keys(updates).length > 0) {
              setFormData(prev => ({ ...prev, ...updates }));
              setAutoFilledFields(newFilledFields);
            }

            setShowSelfieCapture(false);
          }}
          onClose={() => setShowSelfieCapture(false)}
        />
      )}
    </form>
  );
}

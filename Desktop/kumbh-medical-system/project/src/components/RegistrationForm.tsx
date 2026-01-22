import { useState } from 'react';
import { registerDevotee } from '../lib/api';
import { UserPlus, Loader2, Camera, X, Eye, Edit, CheckCircle, Heart, ScanLine } from 'lucide-react';
import SelfieCapture from './SelfieCapture';
import IDScanner from './IDCardScanner';
import VoiceInput from './VoiceInput';
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
  const [showIDScanner, setShowIDScanner] = useState(false);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [showSummary, setShowSummary] = useState(false); // New state for summary view
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
    // Show summary instead of submitting directly
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
        blood_group: formData.blood_group as
          | 'A+'
          | 'A-'
          | 'B+'
          | 'B-'
          | 'AB+'
          | 'AB-'
          | 'O+'
          | 'O-'
          | null,
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
  };

  const handleVoiceInput = (field: keyof FormData, text: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field] ? `${prev[field]} ${text}` : text
    }));
  };

  const handleIDScan = (data: any) => {
    setFormData(prev => ({
      ...prev,
      full_name: data.name || prev.full_name,
      // age: data.age || prev.age, // Be careful with age overwriting
      // gender: data.gender || prev.gender,
      id_proof_number: data.idNumber || prev.id_proof_number,
      special_notes: prev.special_notes + (data.address ? ` [Addr from ID: ${data.address}]` : '')
    }));
    // Try to set age if reasonable
    if (data.age) setFormData(prev => ({ ...prev, age: data.age }));
    if (data.gender) setFormData(prev => ({ ...prev, gender: data.gender }));

    setShowIDScanner(false);
    alert("ID Scanned! Verification details updated.");
  };

  // Component for displaying a summary field with modern design
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

  // If showing summary, render the summary view with modern UI
  if (showSummary) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white rounded-2xl shadow-2xl">
          <div className="relative p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-8 h-8" />
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{t('reg.reviewTitle') || 'Review Your Information'}</h2>
                <p className="text-blue-100 text-sm max-w-2xl">{t('reg.reviewDesc') || 'Please review all information before submitting. You can go back and edit if needed.'}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        </div>

        {/* Personal Information Card */}
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

        {/* Medical Information Card */}
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
              <div className="md:col-span-2">
                <SummaryField label={t('reg.allergies')} value={formData.allergies || 'None reported'} />
              </div>
              <div className="md:col-span-2">
                <SummaryField label={t('reg.chronic')} value={formData.chronic_conditions || 'None reported'} />
              </div>
              <div className="md:col-span-2">
                <SummaryField label={t('reg.meds')} value={formData.current_medications || 'None reported'} />
              </div>
              <div className="md:col-span-2">
                <SummaryField label={t('reg.surgeries')} value={formData.past_surgeries || 'None reported'} />
              </div>
              <div className="md:col-span-2">
                <SummaryField label={t('reg.notes')} value={formData.special_notes || 'None'} />
              </div>
            </dl>
          </div>
        </div>

        {/* Medical Recommendations based on health data */}
        <MedicalRecommendations
          formData={{
            allergies: formData.allergies,
            chronic_conditions: formData.chronic_conditions,
            current_medications: formData.current_medications,
            blood_group: formData.blood_group
          }}
        />

        {/* Action Buttons with Modern Design */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            type="button"
            onClick={() => setShowSummary(false)}
            className="flex-1 bg-white text-gray-700 py-4 px-6 rounded-xl hover:bg-gray-50 font-semibold flex items-center justify-center gap-2 transition-all border-2 border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md"
          >
            <Edit className="w-5 h-5" />
            {t('reg.editInfo') || 'Go Back & Edit'}
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
                {t('reg.confirmSubmit') || 'Submit Registration'}
              </>
            )}
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-blue-800">
            By submitting this registration, you confirm that all the information provided is accurate and complete.
          </p>
        </div>
      </div>
    );
  }

  // Otherwise, render the form
  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            {t('reg.personalInfo')}
          </div>
          <button
            type="button"
            onClick={() => setShowIDScanner(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 border border-indigo-200 text-sm font-medium transition-colors"
          >
            <ScanLine className="w-4 h-4" />
            Scan ID Card
          </button>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.fullName')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('full_name', text)} label={t('reg.fullName')} />
            </div>
            <input
              type="text"
              name="full_name"
              required
              value={formData.full_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.age')}</label>
            <input
              type="number"
              name="age"
              required
              min="1"
              max="150"
              value={formData.age}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.gender')}</label>
            <select
              name="gender"
              required
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Male">{t('reg.gender.male')}</option>
              <option value="Female">{t('reg.gender.female')}</option>
              <option value="Other">{t('reg.gender.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.phone')}</label>
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.address')}</label>
            <input
              type="text"
              name="address"
              required
              value={formData.address}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.campLocation')}</label>
            <input
              type="text"
              name="camp_location"
              value={formData.camp_location}
              onChange={handleChange}
              placeholder={t('reg.campPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.idProofType')}</label>
            <select
              name="id_proof_type"
              required
              value={formData.id_proof_type}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Aadhar">{t('reg.id.aadhar')}</option>
              <option value="Passport">{t('reg.id.passport')}</option>
              <option value="Voter ID">{t('reg.id.voter')}</option>
              <option value="Driving License">{t('reg.id.dl')}</option>
              <option value="Other">{t('reg.id.other')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.idProofNumber')}</label>
            <input
              type="text"
              name="id_proof_number"
              required
              value={formData.id_proof_number}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.emergencyName')}</label>
            <input
              type="text"
              name="emergency_contact_name"
              required
              value={formData.emergency_contact_name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.emergencyPhone')}</label>
            <input
              type="tel"
              name="emergency_contact_phone"
              required
              value={formData.emergency_contact_phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.selfie')}</label>
            <div className="space-y-2">
              {selfieImage ? (
                <div className="relative inline-block">
                  <img
                    src={selfieImage}
                    alt="Selfie preview"
                    className="w-32 h-32 object-cover rounded-md border-2 border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieImage(null);
                      setFaceDescriptor(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSelfieCapture(true)}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 text-gray-700 transition-colors"
                >
                  <Camera className="w-5 h-5" />
                  <span>{t('reg.takeSelfie')}</span>
                </button>
              )}
              <p className="text-xs text-gray-500">
                {t('reg.selfieHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reg.medicalInfo')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.bloodGroup')}</label>
            <select
              name="blood_group"
              value={formData.blood_group}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.height')}</label>
            <input
              type="number"
              name="height_cm"
              step="0.1"
              value={formData.height_cm}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.weight')}</label>
            <input
              type="number"
              name="weight_kg"
              step="0.1"
              value={formData.weight_kg}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg.vaccination')}</label>
            <input
              type="text"
              name="vaccination_status"
              value={formData.vaccination_status}
              onChange={handleChange}
              placeholder={t('reg.vaccinationPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.allergies')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('allergies', text)} label={t('reg.allergies')} />
            </div>
            <textarea
              name="allergies"
              value={formData.allergies}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.allergiesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.chronic')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('chronic_conditions', text)} label={t('reg.chronic')} />
            </div>
            <textarea
              name="chronic_conditions"
              value={formData.chronic_conditions}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.chronicPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.meds')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('current_medications', text)} label={t('reg.meds')} />
            </div>
            <textarea
              name="current_medications"
              value={formData.current_medications}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.medsPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.surgeries')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('past_surgeries', text)} label={t('reg.surgeries')} />
            </div>
            <textarea
              name="past_surgeries"
              value={formData.past_surgeries}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.surgeriesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">{t('reg.notes')}</label>
              <VoiceInput onTranscript={(text) => handleVoiceInput('special_notes', text)} label={t('reg.notes')} />
            </div>
            <textarea
              name="special_notes"
              value={formData.special_notes}
              onChange={handleChange}
              rows={2}
              placeholder={t('reg.notesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !selfieImage}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            {t('reg.submitting')}
          </>
        ) : (
          <>
            <Eye className="w-5 h-5" />
            {t('reg.reviewSubmit') || 'Continue to Review'}
          </>
        )}
      </button>

      {showSelfieCapture && (
        <SelfieCapture
          onCapture={(imageData, descriptor) => {
            setSelfieImage(imageData);
            setFaceDescriptor(descriptor);
            setShowSelfieCapture(false);
          }}
          onClose={() => setShowSelfieCapture(false)}
        />
      )}

      {showIDScanner && (
        <IDScanner
          onScanComplete={handleIDScan}
          onClose={() => setShowIDScanner(false)}
        />
      )}
    </form>
  );
}

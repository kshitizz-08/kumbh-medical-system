import { useState } from 'react';
import { createIncident } from '../lib/api';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n/i18n';

type IncidentFormProps = {
  devoteeId: string;
  devoteeName: string;
  onClose: () => void;
  onSuccess: () => void;
};

type FormData = {
  incident_type: string;
  symptoms: string;
  diagnosis: string;
  treatment_given: string;
  medications_prescribed: string;
  attending_doctor: string;
  medical_center: string;
  follow_up_required: boolean;
  follow_up_notes: string;
};

export default function IncidentForm({ devoteeId, devoteeName, onClose, onSuccess }: IncidentFormProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    incident_type: 'Emergency',
    symptoms: '',
    diagnosis: '',
    treatment_given: '',
    medications_prescribed: '',
    attending_doctor: '',
    medical_center: '',
    follow_up_required: false,
    follow_up_notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await createIncident({
        devotee_id: devoteeId,
        incident_type: formData.incident_type as 'Emergency' | 'Consultation' | 'Follow-up',
        symptoms: formData.symptoms,
        diagnosis: formData.diagnosis,
        treatment_given: formData.treatment_given,
        medications_prescribed: formData.medications_prescribed,
        attending_doctor: formData.attending_doctor,
        medical_center: formData.medical_center,
        follow_up_required: formData.follow_up_required,
        follow_up_notes: formData.follow_up_notes,
      });

      onSuccess();
    } catch (error) {
      alert(t('incident.fail', { message: (error as Error).message }));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              {t('incident.title')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('incident.for')} {devoteeName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-6 h-6 text-gray-600" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.type')}</label>
              <select
                name="incident_type"
                required
                value={formData.incident_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Emergency">{t('incident.type.emergency')}</option>
                <option value="Consultation">{t('incident.type.consultation')}</option>
                <option value="Follow-up">{t('incident.type.followup')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.doctor')}</label>
              <input
                type="text"
                name="attending_doctor"
                required
                value={formData.attending_doctor}
                onChange={handleChange}
                placeholder={t('incident.doctorPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.center')}</label>
              <input
                type="text"
                name="medical_center"
                required
                value={formData.medical_center}
                onChange={handleChange}
                placeholder={t('incident.centerPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.symptoms')}</label>
            <textarea
              name="symptoms"
              required
              value={formData.symptoms}
              onChange={handleChange}
              rows={3}
              placeholder={t('incident.symptomsPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.diagnosis')}</label>
            <textarea
              name="diagnosis"
              value={formData.diagnosis}
              onChange={handleChange}
              rows={2}
              placeholder={t('incident.diagnosisPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.treatment')}</label>
            <textarea
              name="treatment_given"
              value={formData.treatment_given}
              onChange={handleChange}
              rows={2}
              placeholder={t('incident.treatmentPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.meds')}</label>
            <textarea
              name="medications_prescribed"
              value={formData.medications_prescribed}
              onChange={handleChange}
              rows={2}
              placeholder={t('incident.medsPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-md">
            <input
              type="checkbox"
              name="follow_up_required"
              checked={formData.follow_up_required}
              onChange={handleChange}
              className="mt-1"
            />
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 cursor-pointer">
                {t('incident.followUpRequired')}
              </label>
              <p className="text-xs text-gray-600">{t('incident.followUpHelp')}</p>
            </div>
          </div>

          {formData.follow_up_required && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('incident.followUpNotes')}</label>
              <textarea
                name="follow_up_notes"
                value={formData.follow_up_notes}
                onChange={handleChange}
                rows={2}
                placeholder={t('incident.followUpNotesPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
            >
              {t('incident.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('incident.saving')}
                </>
              ) : (
                t('incident.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

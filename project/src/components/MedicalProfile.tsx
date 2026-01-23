import { useState, useEffect } from 'react';
import { MedicalIncident, getIncidents, DevoteeWithRecord } from '../lib/api';
import { X, AlertCircle, User, Heart, Activity, FileText, Clock, Edit, ArrowLeft } from 'lucide-react';
import RegistrationForm from './RegistrationForm';
import { useI18n } from '../i18n/i18n';

type ProfileProps = {
  devotee: DevoteeWithRecord;
  refreshToken?: number;
  onClose: () => void;
  onRecordIncident: (devoteeId: string, devoteeName: string) => void;
  onDevoteeUpdate?: (updatedDevotee: DevoteeWithRecord) => void;
};

export default function MedicalProfile({ devotee, refreshToken, onClose, onRecordIncident, onDevoteeUpdate }: ProfileProps) {
  const { t } = useI18n();
  const [incidents, setIncidents] = useState<MedicalIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setLoading(true);
    loadIncidents();
  }, [devotee.id, refreshToken]);

  const loadIncidents = async () => {
    try {
      const data = await getIncidents(devotee.id);
      setIncidents(data || []);
    } catch (error) {
      console.error('Failed to load incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const medicalRecord = devotee.medical_records;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-1"
                aria-label={t('common.back')}
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {isEditing ? t('register.editProfile') : devotee.full_name}
              </h2>
              {!isEditing && (
                <p className="text-sm text-gray-600">
                  {t('profile.registration')} {devotee.registration_number}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && onDevoteeUpdate && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors text-blue-600"
                aria-label={t('common.edit')}
                title={t('common.edit')}
              >
                <Edit className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label={t('common.close')}
            >
              <X className="w-6 h-6 text-gray-600" aria-hidden="true" />
            </button>
          </div>
        </div>

        {isEditing ? (
          <div className="p-6">
            <RegistrationForm
              initialData={devotee}
              isEditing={true}
              devoteeId={devotee.id}
              onSuccess={(updatedData) => {
                if (onDevoteeUpdate) onDevoteeUpdate(updatedData);
                setIsEditing(false);
              }}
            />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t('profile.emergencyContact')}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-red-700 font-medium">{t('profile.name')}</span>
                  <span className="ml-2 text-red-900">{devotee.emergency_contact_name}</span>
                </div>
                <div>
                  <span className="text-red-700 font-medium">{t('profile.phone')}</span>
                  <span className="ml-2 text-red-900">{devotee.emergency_contact_phone}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  {t('profile.personalDetails')}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('search.age')}</dt>
                    <dd className="font-medium text-gray-900">{t('profile.ageYears', { years: devotee.age })}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('profile.gender')}</dt>
                    <dd className="font-medium text-gray-900">{devotee.gender}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('profile.phone')}</dt>
                    <dd className="font-medium text-gray-900">{devotee.phone}</dd>
                  </div>

                </dl>


              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  {t('profile.vitalInfo')}
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('profile.bloodGroup')}</dt>
                    <dd className="font-medium text-gray-900">
                      {medicalRecord?.blood_group || t('profile.notSpecified')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('profile.height')}</dt>
                    <dd className="font-medium text-gray-900">
                      {medicalRecord?.height_cm ? `${medicalRecord.height_cm} cm` : t('profile.notSpecified')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">{t('profile.weight')}</dt>
                    <dd className="font-medium text-gray-900">
                      {medicalRecord?.weight_kg ? `${medicalRecord.weight_kg} kg` : t('profile.notSpecified')}
                    </dd>
                  </div>

                </dl>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                {t('profile.medicalHistory')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-yellow-700 font-medium mb-1">{t('profile.allergies')}</dt>
                  <dd className="text-yellow-900">{medicalRecord?.allergies || t('profile.noneReported')}</dd>
                </div>
                <div>
                  <dt className="text-yellow-700 font-medium mb-1">{t('profile.chronic')}</dt>
                  <dd className="text-yellow-900">{medicalRecord?.chronic_conditions || t('profile.noneReported')}</dd>
                </div>
                <div>
                  <dt className="text-yellow-700 font-medium mb-1">{t('profile.meds')}</dt>
                  <dd className="text-yellow-900">{medicalRecord?.current_medications || t('profile.none')}</dd>
                </div>
                <div>
                  <dt className="text-yellow-700 font-medium mb-1">{t('profile.surgeries')}</dt>
                  <dd className="text-yellow-900">{medicalRecord?.past_surgeries || t('profile.none')}</dd>
                </div>
                {medicalRecord?.special_notes && (
                  <div className="md:col-span-2">
                    <dt className="text-yellow-700 font-medium mb-1">{t('profile.specialNotes')}</dt>
                    <dd className="text-yellow-900">{medicalRecord.special_notes}</dd>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  {t('profile.incidentsHistory')}
                </h3>
                <button
                  onClick={() => onRecordIncident(devotee.id, devotee.full_name)}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-sm font-medium transition-colors"
                >
                  {t('profile.recordIncident')}
                </button>
              </div>

              {loading ? (
                <p className="text-gray-500 text-sm">{t('profile.loadingIncidents')}</p>
              ) : incidents.length === 0 ? (
                <p className="text-gray-500 text-sm">{t('profile.noIncidents')}</p>
              ) : (
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${incident.incident_type === 'Emergency'
                            ? 'bg-red-100 text-red-700'
                            : incident.incident_type === 'Follow-up'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                            }`}>
                            {incident.incident_type}
                          </span>
                          {incident.follow_up_required && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
                              {t('profile.followUpRequired')}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="w-3 h-3" />
                          {new Date(incident.incident_date).toLocaleString()}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">{t('profile.symptoms')}</span>
                          <span className="ml-2 text-gray-900">{incident.symptoms}</span>
                        </div>
                        {incident.diagnosis && (
                          <div>
                            <span className="font-medium text-gray-700">{t('profile.diagnosis')}</span>
                            <span className="ml-2 text-gray-900">{incident.diagnosis}</span>
                          </div>
                        )}
                        {incident.treatment_given && (
                          <div>
                            <span className="font-medium text-gray-700">{t('profile.treatment')}</span>
                            <span className="ml-2 text-gray-900">{incident.treatment_given}</span>
                          </div>
                        )}
                        {incident.medications_prescribed && (
                          <div>
                            <span className="font-medium text-gray-700">{t('profile.medications')}</span>
                            <span className="ml-2 text-gray-900">{incident.medications_prescribed}</span>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-gray-600 pt-1 border-t border-gray-200 mt-2">
                          <span>
                            {t('profile.doctor')} {incident.attending_doctor}
                          </span>
                          <span>
                            {t('profile.center')} {incident.medical_center}
                          </span>
                        </div>
                        {incident.follow_up_notes && (
                          <div className="mt-2 pt-2 border-t border-gray-200">
                            <span className="font-medium text-gray-700 text-xs">{t('profile.followUpNotes')}</span>
                            <p className="text-xs text-gray-900 mt-1">{incident.follow_up_notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

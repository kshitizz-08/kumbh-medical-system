import mongoose from 'mongoose';

const medicalIncidentSchema = new mongoose.Schema(
  {
    devotee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Devotee', required: true, index: true },
    incident_date: { type: Date, default: Date.now },
    incident_type: { type: String, required: true, enum: ['Emergency', 'Consultation', 'Follow-up'] },
    symptoms: { type: String, required: true },
    diagnosis: { type: String, default: '' },
    treatment_given: { type: String, default: '' },
    medications_prescribed: { type: String, default: '' },
    attending_doctor: { type: String, required: true },
    medical_center: { type: String, required: true },
    follow_up_required: { type: Boolean, default: false },
    follow_up_notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false } }
);

medicalIncidentSchema.index({ incident_date: -1 });

export const MedicalIncident = mongoose.model('MedicalIncident', medicalIncidentSchema);


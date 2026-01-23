import mongoose from 'mongoose';

const medicalRecordSchema = new mongoose.Schema(
  {
    devotee_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Devotee', required: true, unique: true, index: true },
    blood_group: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    height_cm: { type: Number, min: 0 },
    weight_kg: { type: Number, min: 0 },
    allergies: { type: String, default: '' },
    chronic_conditions: { type: String, default: '' },
    current_medications: { type: String, default: '' },
    past_surgeries: { type: String, default: '' },

    special_notes: { type: String, default: '' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);


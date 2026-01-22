import mongoose from 'mongoose';

const devoteeSchema = new mongoose.Schema(
  {
    registration_number: { type: String, required: true, unique: true },
    full_name: { type: String, required: true },
    age: { type: Number, required: true, min: 1, max: 150 },
    gender: { type: String, required: true, enum: ['Male', 'Female', 'Other'] },
    phone: { type: String, required: true, index: true },

    emergency_contact_name: { type: String, required: true },
    emergency_contact_phone: { type: String, required: true },
    photo_url: { type: String },
    // 128-d face descriptor for face-based search (from face-api.js)
    face_descriptor: { type: [Number], default: undefined },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

devoteeSchema.index({ full_name: 'text' });

export const Devotee = mongoose.model('Devotee', devoteeSchema);


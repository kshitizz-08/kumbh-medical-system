import mongoose from 'mongoose';

const lostPersonSchema = new mongoose.Schema({
    name: {
        type: String,
        required: false, // Might be unknown if found
        default: 'Unknown'
    },
    age: {
        type: Number,
        required: false
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Other', 'Unknown'],
        default: 'Unknown'
    },
    photo_url: {
        type: String,
        required: true
    },
    // We store the 128-float vector from face-api.js
    face_descriptor: {
        type: [Number],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['missing', 'found', 'reunited'],
        default: 'missing',
        required: true
    },
    contact_info: {
        name: String,
        phone: String,
        relationship: String
    },
    last_seen_location: {
        type: String,
        default: 'Not specified'
    },
    // If status is 'found', where they are currently
    current_location: {
        type: String
    },
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

export const LostPerson = mongoose.model('LostPerson', lostPersonSchema);

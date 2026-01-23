// test-medical-storage.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Devotee } from './models/Devotee.js';
import { MedicalRecord } from './models/MedicalRecord.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI is missing');
    process.exit(1);
}

async function testStorage() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // mimic the payload from frontend
        const payload = {
            full_name: 'Test Patient ' + Date.now(),
            age: 30,
            gender: 'Male',
            phone: '1234567890',
            emergency_contact_name: 'Contact',
            emergency_contact_phone: '0987654321',

            // Medical info
            allergies: 'Peanuts',
            chronic_conditions: 'Asthma',
            current_medications: 'Inhaler',
            past_surgeries: 'Appendectomy',
            special_notes: 'Testing storage',

            blood_group: 'O+',
            height_cm: 180,
            weight_kg: 75
        };

        // Simulate what the route handler does
        const session = await mongoose.startSession();
        session.startTransaction();

        let savedDevotee;
        let savedRecord;

        try {
            const registration_number = 'REG-' + Date.now(); // Mock generator

            const devoteeDoc = await Devotee.create([{
                registration_number,
                full_name: payload.full_name,
                age: payload.age,
                gender: payload.gender,
                phone: payload.phone,
                emergency_contact_name: payload.emergency_contact_name,
                emergency_contact_phone: payload.emergency_contact_phone
            }], { session });

            savedDevotee = devoteeDoc[0];

            const medicalRecordDoc = await MedicalRecord.create([{
                devotee_id: savedDevotee._id,
                allergies: payload.allergies,
                chronic_conditions: payload.chronic_conditions,
                current_medications: payload.current_medications,
                past_surgeries: payload.past_surgeries,
                special_notes: payload.special_notes,
                blood_group: payload.blood_group,
                height_cm: payload.height_cm,
                weight_kg: payload.weight_kg
            }], { session });

            savedRecord = medicalRecordDoc[0];

            await session.commitTransaction();
            console.log('Transaction committed');

        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }

        // Now VERIFY by fetching back
        const fetchedRecord = await MedicalRecord.findOne({ devotee_id: savedDevotee._id });

        console.log('Fetched Record:', fetchedRecord);

        if (fetchedRecord.allergies !== payload.allergies) console.error('FAIL: allergies mismatch');
        else console.log('PASS: allergies matched');

        if (fetchedRecord.chronic_conditions !== payload.chronic_conditions) console.error('FAIL: chronic_conditions mismatch');
        else console.log('PASS: chronic_conditions matched');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

testStorage();

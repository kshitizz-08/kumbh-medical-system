import express from 'express';
import mongoose from 'mongoose';
import { Devotee } from '../models/Devotee.js';
import { MedicalRecord } from '../models/MedicalRecord.js';
import { generateRegistrationNumber } from '../utils/generateRegistrationNumber.js';

const router = express.Router();

const formatRecord = (record) => {
  if (!record) return null;
  return {
    ...record,
    id: record._id.toString(),
    devotee_id: record.devotee_id.toString(),
    _id: undefined,
    __v: undefined,
  };
};

const formatDevotee = (devotee, record) => ({
  ...devotee,
  id: devotee._id.toString(),
  _id: undefined,
  __v: undefined,
  medical_records: formatRecord(record),
});

router.post('/', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const registration_number = generateRegistrationNumber();

    const devoteeDoc = await Devotee.create(
      [
        {
          registration_number,
          full_name: req.body.full_name,
          age: req.body.age,
          gender: req.body.gender,
          phone: req.body.phone,

          emergency_contact_name: req.body.emergency_contact_name,
          emergency_contact_phone: req.body.emergency_contact_phone,
          photo_url: req.body.photo_url || null,
          face_descriptor: Array.isArray(req.body.face_descriptor) ? req.body.face_descriptor : undefined,
        },
      ],
      { session }
    );

    const devotee = devoteeDoc[0];

    const medicalRecordDoc = await MedicalRecord.create(
      [
        {
          devotee_id: devotee._id,
          blood_group: req.body.blood_group || null,
          height_cm: req.body.height_cm || null,
          weight_kg: req.body.weight_kg || null,
          allergies: req.body.allergies || '',
          chronic_conditions: req.body.chronic_conditions || '',
          current_medications: req.body.current_medications || '',
          past_surgeries: req.body.past_surgeries || '',

          special_notes: req.body.special_notes || '',
        },
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(formatDevotee(devotee.toObject(), medicalRecordDoc[0].toObject()));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Failed to create devotee', error);
    return res.status(500).json({ message: 'Failed to create devotee', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { q = '', type = 'name' } = req.query;
    const filter = {};

    if (q) {
      const regex = new RegExp(q, 'i');
      if (type === 'phone') {
        filter.phone = regex;
      } else if (type === 'registration') {
        filter.registration_number = regex;
      } else {
        filter.full_name = regex;
      }
    }

    const devotees = await Devotee.find(filter).sort({ created_at: -1 }).limit(20).lean();
    const devoteeIds = devotees.map((d) => d._id);

    const records = await MedicalRecord.find({ devotee_id: { $in: devoteeIds } }).lean();
    const recordMap = new Map(records.map((record) => [record.devotee_id.toString(), record]));

    const formatted = devotees.map((devotee) => formatDevotee(devotee, recordMap.get(devotee._id.toString())));
    return res.json(formatted);
  } catch (error) {
    console.error('Failed to search devotees', error);
    return res.status(500).json({ message: 'Failed to search devotees', details: error.message });
  }
});

// POST /api/devotees/search-by-face
// Body: { face_descriptor: number[], maxDistance?: number }
router.post('/search-by-face', async (req, res) => {
  try {
    const { face_descriptor: queryDescriptor, maxDistance = 0.6 } = req.body;

    if (!Array.isArray(queryDescriptor) || queryDescriptor.length === 0) {
      return res.status(400).json({ message: 'face_descriptor array is required' });
    }

    const devotees = await Devotee.find({ face_descriptor: { $exists: true, $ne: null } })
      .sort({ created_at: -1 })
      .lean();

    if (!devotees.length) {
      return res.json([]);
    }

    const euclideanDistance = (a, b) => {
      if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return Number.MAX_VALUE;
      let sum = 0;
      for (let i = 0; i < a.length; i += 1) {
        const diff = (a[i] || 0) - (b[i] || 0);
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    };

    // Compute distance for each devotee
    const scored = devotees
      .map((d) => ({
        devotee: d,
        distance: euclideanDistance(queryDescriptor, d.face_descriptor || []),
      }))
      .filter((item) => item.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    if (!scored.length) {
      return res.json([]);
    }

    const devoteeIds = scored.map((s) => s.devotee._id);
    const records = await MedicalRecord.find({ devotee_id: { $in: devoteeIds } }).lean();
    const recordMap = new Map(records.map((record) => [record.devotee_id.toString(), record]));

    const formatted = scored.map(({ devotee, distance }) =>
      formatDevotee(
        {
          ...devotee,
          match_distance: distance,
        },
        recordMap.get(devotee._id.toString())
      )
    );

    return res.json(formatted);
  } catch (error) {
    console.error('Failed to search devotees by face', error);
    return res.status(500).json({ message: 'Failed to search devotees by face', details: error.message });
  }
});

export default router;


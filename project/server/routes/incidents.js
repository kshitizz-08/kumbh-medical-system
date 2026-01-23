import express from 'express';
import { MedicalIncident } from '../models/MedicalIncident.js';

const router = express.Router();

const formatIncident = (incident) => ({
  ...incident,
  id: incident._id.toString(),
  devotee_id: incident.devotee_id.toString(),
  _id: undefined,
  __v: undefined,
});

router.post('/', async (req, res) => {
  try {
    const incident = await MedicalIncident.create({
      devotee_id: req.body.devotee_id,
      incident_type: req.body.incident_type,
      symptoms: req.body.symptoms,
      diagnosis: req.body.diagnosis || '',
      treatment_given: req.body.treatment_given || '',
      medications_prescribed: req.body.medications_prescribed || '',
      attending_doctor: req.body.attending_doctor,
      medical_center: req.body.medical_center,
      follow_up_required: Boolean(req.body.follow_up_required),
      follow_up_notes: req.body.follow_up_notes || '',
    });

    return res.status(201).json(formatIncident(incident.toObject()));
  } catch (error) {
    console.error('Failed to record incident', error);
    return res.status(500).json({ message: 'Failed to record incident', details: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { devoteeId } = req.query;
    if (!devoteeId) {
      return res.status(400).json({ message: 'devoteeId is required' });
    }

    const incidents = await MedicalIncident.find({ devotee_id: devoteeId }).sort({ incident_date: -1 }).lean();
    return res.json(incidents.map((incident) => formatIncident(incident)));
  } catch (error) {
    console.error('Failed to fetch incidents', error);
    return res.status(500).json({ message: 'Failed to fetch incidents', details: error.message });
  }
});

export default router;


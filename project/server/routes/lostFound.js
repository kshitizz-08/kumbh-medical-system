import express from 'express';
import { LostPerson } from '../models/LostPerson.js';

const router = express.Router();

// Helper: Calculate Euclidean distance between two vectors
function euclideanDistance(descriptor1, descriptor2) {
    if (descriptor1.length !== descriptor2.length) return 1.0;
    return Math.sqrt(
        descriptor1
            .map((val, i) => Math.pow(val - descriptor2[i], 2))
            .reduce((sum, sq) => sum + sq, 0)
    );
}

// POST /api/lost-found/report
// Register a new missing or found person
router.post('/report', async (req, res) => {
    try {
        const {
            name,
            age,
            gender,
            photo_url,
            face_descriptor, // Array of 128 numbers
            status, // 'missing' or 'found'
            contact_info,
            last_seen_location,
            current_location
        } = req.body;

        if (!face_descriptor || face_descriptor.length !== 128) {
            return res.status(400).json({ error: 'Valid face descriptor required (128 values)' });
        }

        const person = new LostPerson({
            name,
            age,
            gender: gender ? gender.charAt(0).toUpperCase() + gender.slice(1).toLowerCase() : 'Unknown',
            photo_url,
            face_descriptor: Object.values(face_descriptor), // Ensure array
            status,
            contact_info,
            last_seen_location,
            current_location
        });

        await person.save();
        res.status(201).json(person);
    } catch (error) {
        console.error('Report Error:', error);
        res.status(500).json({ error: `Failed to report person: ${error.message}` });
    }
});

// POST /api/lost-found/match
// Find matching faces in the database
router.post('/match', async (req, res) => {
    try {
        const { face_descriptor, status_filter } = req.body;
        // If we are reporting a 'found' person, we want to look for 'missing' people (status_filter='missing')
        // If we are looking for a 'missing' person, we might check 'found' people (status_filter='found')

        if (!face_descriptor || face_descriptor.length !== 128) {
            return res.status(400).json({ error: 'Valid face descriptor required' });
        }

        const targetDescriptor = Object.values(face_descriptor);
        const threshold = 0.6; // face-api.js default threshold for 128D vectors

        // Fetch candidates (optimize by date/location in prod, but fetch all for now)
        const query = status_filter ? { status: status_filter } : { status: { $ne: 'reunited' } };
        const candidates = await LostPerson.find(query);

        const matches = candidates
            .map(person => {
                const distance = euclideanDistance(targetDescriptor, person.face_descriptor);
                return {
                    person,
                    distance,
                    similarity: Math.max(0, 1 - distance) // Rough similarity score
                };
            })
            .filter(match => match.distance < threshold)
            .sort((a, b) => a.distance - b.distance) // Closest first
            .slice(0, 5); // Top 5

        res.json({ matches });
    } catch (error) {
        console.error('Match Error:', error);
        res.status(500).json({ error: 'Failed to match face' });
    }
});

// GET /api/lost-found/list
// Get recent reports
router.get('/list', async (req, res) => {
    try {
        const { status } = req.query;
        const query = status ? { status } : {};

        const people = await LostPerson.find(query)
            .sort({ created_at: -1 })
            .limit(20)
            .select('-face_descriptor'); // Don't send heavy vector list

        res.json(people);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch list' });
    }
});

export const lostFoundRouter = router;

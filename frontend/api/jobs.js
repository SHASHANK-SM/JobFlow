const { MongoClient } = require('mongodb');

const defaultJobs = [
    {
        id: '1',
        company: 'Microsoft',
        role: 'Frontend Engineer',
        status: 'Interviewing',
        location: 'Remote',
        source: 'LinkedIn',
        salary: '$130k - $160k',
        priority: 'High',
        appliedDate: '2026-08-28',
        notes: 'Panel round scheduled for Friday. Review React/TypeScript portfolio.'
    },
    {
        id: '2',
        company: 'Stripe',
        role: 'Product Designer',
        status: 'Applied',
        location: 'San Francisco, CA',
        source: 'Company Site',
        salary: '$150k - $180k',
        priority: 'Medium',
        appliedDate: '2026-08-25',
        notes: 'Strong product-focused role; customize portfolio to highlight case studies.'
    },
    {
        id: '3',
        company: 'Notion',
        role: 'Full Stack Developer',
        status: 'Offer',
        location: 'New York, NY',
        source: 'Referral',
        salary: '$170k - $210k',
        priority: 'High',
        appliedDate: '2026-08-16',
        notes: 'Offer received. Need to compare benefits and final compensation package.'
    },
    {
        id: '4',
        company: 'Airbnb',
        role: 'UX Researcher',
        status: 'Rejected',
        location: 'Remote',
        source: 'Wellfound',
        salary: '$120k - $145k',
        priority: 'Low',
        appliedDate: '2026-08-10',
        notes: 'Good experience, but they preferred candidates with e-commerce research background.'
    }
];

let mongoClient = null;
let memoryJobs = defaultJobs.map(job => ({ ...job }));

function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (!body) {
                resolve({});
                return;
            }

            try {
                resolve(JSON.parse(body));
            } catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

async function getJobsCollection() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        return null;
    }

    if (!mongoClient) {
        mongoClient = new MongoClient(mongoUri);
        await mongoClient.connect();
    }

    const dbName = process.env.MONGODB_DB || 'job_tracker';
    return mongoClient.db(dbName).collection('jobs');
}

function getJobIdFromUrl(reqUrl) {
    try {
        const url = new URL(reqUrl, 'http://localhost');
        const segments = url.pathname.split('/').filter(Boolean);
        return segments[segments.length - 1] || null;
    } catch {
        return null;
    }
}

module.exports = async function handler(req, res) {
    setCors(res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const collection = await getJobsCollection();

        if (req.method === 'GET') {
            const jobs = collection ? await collection.find({}).sort({ appliedDate: -1 }).toArray() : memoryJobs;
            res.status(200).json(jobs);
            return;
        }

        if (req.method === 'POST') {
            const body = await parseJsonBody(req);
            const newJob = {
                id: String(Date.now()),
                company: body.company || 'Unknown Company',
                role: body.role || 'New Role',
                status: body.status || 'Applied',
                location: body.location || 'Remote',
                source: body.source || 'Unknown',
                salary: body.salary || 'Negotiable',
                priority: body.priority || 'Medium',
                appliedDate: body.appliedDate || new Date().toISOString().slice(0, 10),
                notes: body.notes || '',
                resumeName: body.resumeName || '',
                resumeData: body.resumeData || ''
            };

            if (collection) {
                await collection.insertOne(newJob);
            } else {
                memoryJobs = [newJob, ...memoryJobs];
            }

            res.status(201).json(newJob);
            return;
        }

        if (req.method === 'PUT') {
            const jobId = getJobIdFromUrl(req.url);
            const body = await parseJsonBody(req);

            if (!jobId) {
                res.status(400).json({ message: 'Job id is required' });
                return;
            }

            if (collection) {
                const existing = await collection.findOne({ id: jobId });
                if (!existing) {
                    res.status(404).json({ message: 'Job not found' });
                    return;
                }

                const updated = { ...existing, ...body };
                await collection.updateOne({ id: jobId }, { $set: updated });
                res.status(200).json(updated);
                return;
            }

            const index = memoryJobs.findIndex(job => job.id === jobId);
            if (index === -1) {
                res.status(404).json({ message: 'Job not found' });
                return;
            }

            memoryJobs[index] = { ...memoryJobs[index], ...body };
            res.status(200).json(memoryJobs[index]);
            return;
        }

        if (req.method === 'DELETE') {
            const jobId = getJobIdFromUrl(req.url);

            if (!jobId) {
                res.status(400).json({ message: 'Job id is required' });
                return;
            }

            if (collection) {
                const result = await collection.deleteOne({ id: jobId });
                if (result.deletedCount === 0) {
                    res.status(404).json({ message: 'Job not found' });
                    return;
                }
            } else {
                const previousCount = memoryJobs.length;
                memoryJobs = memoryJobs.filter(job => job.id !== jobId);
                if (memoryJobs.length === previousCount) {
                    res.status(404).json({ message: 'Job not found' });
                    return;
                }
            }

            res.status(200).json({ message: 'Job deleted successfully' });
            return;
        }

        res.status(405).json({ message: 'Method not allowed' });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Something went wrong' });
    }
};

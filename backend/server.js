const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 5000;
const ROOT_DIR = path.resolve(__dirname, '..');
const FRONTEND_DIR = path.join(ROOT_DIR, 'frontend');
const DATA_FILE = path.join(__dirname, 'data', 'jobs.json');
const MONGODB_URI = process.env.MONGODB_URI || '';
const MONGODB_DB = process.env.MONGODB_DB || 'job_tracker';

let mongoClient = null;

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

function ensureDataFile() {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify(defaultJobs, null, 2));
    }
}

function readJobsFromFile() {
    ensureDataFile();
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw || '[]');
}

function writeJobsToFile(jobs) {
    ensureDataFile();
    fs.writeFileSync(DATA_FILE, JSON.stringify(jobs, null, 2));
}

async function getJobsCollection() {
    if (!MONGODB_URI) {
        return null;
    }

    try {
        if (!mongoClient) {
            mongoClient = new MongoClient(MONGODB_URI);
            await mongoClient.connect();
        }

        const db = mongoClient.db(MONGODB_DB);
        return db.collection('jobs');
    } catch (error) {
        console.warn('MongoDB connection failed, falling back to local JSON storage:', error.message);
        return null;
    }
}

async function listJobs() {
    const collection = await getJobsCollection();
    if (!collection) {
        return readJobsFromFile();
    }

    return collection.find({}).sort({ appliedDate: -1 }).toArray();
}

async function createJobRecord(body) {
    const collection = await getJobsCollection();
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
        notes: body.notes || ''
    };

    if (!collection) {
        const jobs = readJobsFromFile();
        jobs.unshift(newJob);
        writeJobsToFile(jobs);
        return newJob;
    }

    await collection.insertOne(newJob);
    return newJob;
}

async function updateJobRecord(jobId, body) {
    const collection = await getJobsCollection();

    if (!collection) {
        const jobs = readJobsFromFile();
        const index = jobs.findIndex(job => job.id === jobId);
        if (index === -1) {
            return null;
        }

        jobs[index] = { ...jobs[index], ...body };
        writeJobsToFile(jobs);
        return jobs[index];
    }

    const existing = await collection.findOne({ id: jobId });
    if (!existing) {
        return null;
    }

    const updated = { ...existing, ...body };
    await collection.updateOne({ id: jobId }, { $set: updated });
    return updated;
}

async function deleteJobRecord(jobId) {
    const collection = await getJobsCollection();

    if (!collection) {
        const jobs = readJobsFromFile();
        const nextJobs = jobs.filter(job => job.id !== jobId);
        writeJobsToFile(nextJobs);
        return true;
    }

    const result = await collection.deleteOne({ id: jobId });
    return result.deletedCount > 0;
}

function sendJson(res, statusCode, payload) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(payload));
}

function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml'
    };

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Not found');
            return;
        }

        res.writeHead(200, {
            'Content-Type': mimeTypes[ext] || 'application/octet-stream',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(content);
    });
}

function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(new Error('Invalid JSON body'));
            }
        });
        req.on('error', reject);
    });
}

const server = http.createServer(async (req, res) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const { pathname } = requestUrl;

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        });
        res.end();
        return;
    }

    if (pathname === '/api/jobs' && req.method === 'GET') {
        try {
            const jobs = await listJobs();
            sendJson(res, 200, jobs);
        } catch (error) {
            sendJson(res, 500, { message: error.message });
        }
        return;
    }

    if (pathname === '/api/jobs' && req.method === 'POST') {
        try {
            const body = await parseBody(req);
            const newJob = await createJobRecord(body);
            sendJson(res, 201, newJob);
        } catch (error) {
            sendJson(res, 400, { message: error.message });
        }
        return;
    }

    if (pathname.startsWith('/api/jobs/') && req.method === 'PUT') {
        try {
            const jobId = pathname.split('/').pop();
            const body = await parseBody(req);
            const updatedJob = await updateJobRecord(jobId, body);

            if (!updatedJob) {
                sendJson(res, 404, { message: 'Job not found' });
                return;
            }

            sendJson(res, 200, updatedJob);
        } catch (error) {
            sendJson(res, 400, { message: error.message });
        }
        return;
    }

    if (pathname.startsWith('/api/jobs/') && req.method === 'DELETE') {
        try {
            const jobId = pathname.split('/').pop();
            const isDeleted = await deleteJobRecord(jobId);
            if (!isDeleted) {
                sendJson(res, 404, { message: 'Job not found' });
                return;
            }

            sendJson(res, 200, { message: 'Job deleted successfully' });
        } catch (error) {
            sendJson(res, 500, { message: error.message });
        }
        return;
    }

    const safePath = pathname === '/' ? '/index.html' : pathname;
    const assetPath = path.join(FRONTEND_DIR, safePath);

    if (assetPath.startsWith(FRONTEND_DIR)) {
        serveStaticFile(res, assetPath);
        return;
    }

    sendJson(res, 404, { message: 'Route not found' });
});

server.listen(PORT, () => {
    console.log(`Job tracker server running at http://localhost:${PORT}`);
    if (!MONGODB_URI) {
        console.log('No MongoDB URI configured. App is using local JSON file storage.');
    } else {
        console.log('MongoDB connection enabled.');
    }
});

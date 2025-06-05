const express = require('express');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

global.__TEST__ = process.env.NODE_ENV === 'test';

const PRIORITY_MAP = { HIGH: 1, MEDIUM: 2, LOW: 3 };
const ingestionStore = {}; // In-memory store of ingestion requests
const batchQueue = []; // Queue of batches to process
let processing = false;

// Batch class representing a batch of up to 3 ids
class Batch {
  constructor(ingestionId, ids) {
    this.batchId = uuidv4();
    this.ingestionId = ingestionId;
    this.ids = ids;
    this.status = 'yet_to_start'; // yet_to_start, triggered, completed
  }
}

// Simulate external API call delay and response
const simulateExternalAPICall = (id) =>
  new Promise((resolve) => setTimeout(() => resolve({ id, data: 'processed' }), 1000));

// Sleep helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Process batches asynchronously
const processBatches = async () => {
  if (processing) return;
  processing = true;

  while (batchQueue.length > 0) {
    // Sort batches by priority and createdAt time of ingestion
    batchQueue.sort((a, b) => {
      const aMeta = ingestionStore[a.ingestionId];
      const bMeta = ingestionStore[b.ingestionId];

      if (PRIORITY_MAP[aMeta.priority] !== PRIORITY_MAP[bMeta.priority]) {
        return PRIORITY_MAP[aMeta.priority] - PRIORITY_MAP[bMeta.priority];
      }
      return aMeta.createdAt - bMeta.createdAt;
    });

    const batch = batchQueue.shift();
    batch.status = 'triggered';

    const ingestData = ingestionStore[batch.ingestionId];
    ingestData.status = 'triggered';

    const batchRef = ingestData.batches.find((b) => b.batchId === batch.batchId);
    if (batchRef) batchRef.status = 'triggered';

    if (!global.__TEST__) {
      console.log(`Processing batch ${batch.batchId} with ids: ${batch.ids}`);
    }

    await Promise.all(batch.ids.map((id) => simulateExternalAPICall(id)));

    await sleep(global.__TEST__ ? 10 : 5000);

    batch.status = 'completed';
    if (batchRef) batchRef.status = 'completed';

    const statuses = ingestData.batches.map((b) => b.status);
    if (statuses.every((s) => s === 'completed')) {
      ingestData.status = 'completed';
    }
  }

  processing = false;
};

// POST /ingest - submit ingestion request
app.post('/ingest', (req, res) => {
  const { ids, priority } = req.body;

  if (
    !ids ||
    !Array.isArray(ids) ||
    ids.length === 0 ||
    !priority ||
    !['HIGH', 'MEDIUM', 'LOW'].includes(priority)
  ) {
    return res.status(400).json({ error: 'Invalid input. Provide ids (array) and priority (HIGH, MEDIUM, LOW).' });
  }

  for (const id of ids) {
    if (typeof id !== 'number' || id < 1 || id > 1e9 + 7) {
      return res.status(400).json({ error: `ID ${id} is invalid. IDs must be integers between 1 and 10^9+7.` });
    }
  }

  const ingestionId = uuidv4();
  const createdAt = Date.now();
  const batches = [];

  for (let i = 0; i < ids.length; i += 3) {
    const chunk = ids.slice(i, i + 3);
    const batch = new Batch(ingestionId, chunk);
    batches.push(batch);
    batchQueue.push(batch);
  }

  ingestionStore[ingestionId] = {
    status: 'yet_to_start',
    priority,
    createdAt,
    batches,
  };

  processBatches();

  res.json({ ingestion_id: ingestionId });
});

// GET /status/:ingestionId - get ingestion status
app.get('/status/:ingestionId', (req, res) => {
  const { ingestionId } = req.params;
  const ingestData = ingestionStore[ingestionId];

  if (!ingestData) return res.status(404).json({ error: 'Ingestion ID not found' });

  res.json({
    ingestion_id: ingestionId,
    status: ingestData.status,
    batches: ingestData.batches.map((b) => ({
      batch_id: b.batchId,
      ids: b.ids,
      status: b.status,
    })),
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = { app, processBatches };

const request = require('supertest');
const { app } = require('../server');

const waitForCompletion = async (ingestionId, retries = 15, delay = 200) => {
  for (let i = 0; i < retries; i++) {
    const res = await request(app).get(`/status/${ingestionId}`);
    if (res.body.status === 'completed') return res;
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error('Timed out waiting for ingestion to complete');
};

describe('Ingestion API', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  it('should submit an ingestion request and fetch its status', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [1, 2, 3],
      priority: 'HIGH',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.ingestion_id).toBeDefined();

    const statusRes = await waitForCompletion(res.body.ingestion_id);

    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.body.status).toBe('completed');
    expect(statusRes.body.batches.length).toBe(1);
    expect(statusRes.body.batches[0].ids).toEqual([1, 2, 3]);
    expect(statusRes.body.batches[0].status).toBe('completed');
  });

  it('should split into multiple batches for >3 IDs', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [4, 5, 6, 7, 8],
      priority: 'MEDIUM',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.ingestion_id).toBeDefined();

    const statusRes = await waitForCompletion(res.body.ingestion_id);

    expect(statusRes.body.status).toBe('completed');
    expect(statusRes.body.batches.length).toBe(2);
    expect(statusRes.body.batches[0].ids.length).toBeLessThanOrEqual(3);
    expect(statusRes.body.batches[1].ids.length).toBeLessThanOrEqual(3);
  });

  it('should handle LOW priority ingestion', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [9],
      priority: 'LOW',
    });

    expect(res.statusCode).toBe(200);
    const statusRes = await waitForCompletion(res.body.ingestion_id);
    expect(statusRes.body.status).toBe('completed');
    expect(statusRes.body.batches.length).toBe(1);
  });

  it('should reject invalid priorities', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [10],
      priority: 'INVALID',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid input/i);
  });

  it('should reject empty ID list', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [],
      priority: 'HIGH',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid input/i);
  });

  it('should return 404 for unknown ingestion ID', async () => {
    const res = await request(app).get('/status/nonexistent-id');

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('should reject IDs outside valid range', async () => {
    const res = await request(app).post('/ingest').send({
      ids: [-1, 10000000000],
      priority: 'MEDIUM',
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid/i);
  });
});

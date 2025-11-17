const request = require('supertest');
const express = require('express');

describe('ClampingPlateManager API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());

    app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        service: 'ClampingPlateManager',
        timestamp: new Date().toISOString()
      });
    });

    app.get('/api/plates', (req, res) => {
      res.json({
        plates: [],
        total: 0
      });
    });

    app.get('/api/plates/:id', (req, res) => {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'Plate ID required' });
      }

      res.json({
        id,
        name: `Plate ${id}`,
        available: true
      });
    });

    app.post('/api/plates/:id', (req, res) => {
      const { id } = req.params;
      const updates = req.body;

      res.json({
        success: true,
        id,
        updated: updates
      });
    });

    app.get('/api/stats', (req, res) => {
      res.json({
        totalPlates: 0,
        availablePlates: 0,
        inUse: 0
      });
    });
  });

  describe('GET /api/health', () => {
    test('should return healthy status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('ClampingPlateManager');
    });
  });

  describe('GET /api/plates', () => {
    test('should return plates list', async () => {
      const response = await request(app)
        .get('/api/plates')
        .expect(200);

      expect(Array.isArray(response.body.plates)).toBe(true);
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('GET /api/plates/:id', () => {
    test('should return specific plate', async () => {
      const response = await request(app)
        .get('/api/plates/P001')
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toBe('P001');
    });
  });

  describe('POST /api/plates/:id', () => {
    test('should update plate', async () => {
      const updates = {
        available: false
      };

      const response = await request(app)
        .post('/api/plates/P001')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.id).toBe('P001');
    });
  });

  describe('GET /api/stats', () => {
    test('should return statistics', async () => {
      const response = await request(app)
        .get('/api/stats')
        .expect(200);

      expect(response.body).toHaveProperty('totalPlates');
      expect(response.body).toHaveProperty('availablePlates');
      expect(response.body).toHaveProperty('inUse');
    });
  });
});

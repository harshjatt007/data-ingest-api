// frontend/src/App.js
import React, { useState } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  MenuItem,
  Box,
  CircularProgress,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
  Alert,
} from '@mui/material';

const PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];

function App() {
  const [idsInput, setIdsInput] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [ingestionId, setIngestionId] = useState('');
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5000'; // Adjust if hosted elsewhere

  // Convert string of ids to array of numbers
  const parseIds = (input) => {
    return input
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id !== '')
      .map(Number);
  };

  const handleSubmit = async () => {
    setError(null);
    const ids = parseIds(idsInput);

    if (ids.length === 0) {
      setError('Please enter at least one valid ID (comma separated).');
      return;
    }
    if (!PRIORITIES.includes(priority)) {
      setError('Please select a valid priority.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, priority }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit ingestion');
      }
      setIngestionId(data.ingestion_id);
      setStatusData(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!ingestionId) {
      setError('Please enter an ingestion ID');
      return;
    }
    setError(null);
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/status/${ingestionId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch status');
      }
      setStatusData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Data Ingestion System
      </Typography>

      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Submit Ingestion Request
        </Typography>
        <TextField
          label="IDs (comma separated)"
          fullWidth
          value={idsInput}
          onChange={(e) => setIdsInput(e.target.value)}
          placeholder="e.g. 1,2,3,4,5"
          margin="normal"
        />
        <TextField
          label="Priority"
          select
          fullWidth
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          margin="normal"
        >
          {PRIORITIES.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          Submit
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {ingestionId && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Ingestion ID: {ingestionId}
          </Typography>
          <Button variant="outlined" onClick={handleCheckStatus} disabled={loading}>
            Check Status
          </Button>
        </Paper>
      )}

      {loading && <CircularProgress />}

      {statusData && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Status: {statusData.status}
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Batch ID</TableCell>
                <TableCell>IDs</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {statusData.batches.map((batch) => (
                <TableRow key={batch.batch_id}>
                  <TableCell>{batch.batch_id}</TableCell>
                  <TableCell>{batch.ids.join(', ')}</TableCell>
                  <TableCell>{batch.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>
  );
}

export default App;

const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 80;

const teamName = process.env.TEAM_NAME || 'Bank IUS';
const teamBic = process.env.TEAM_BIC || 'BANKIUS1';
const teamMembers = (process.env.TEAM_MEMBERS || 'student1,student2')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

app.use(express.json());

app.get('/api/info/', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    res.status(200).json({
      ok: true,
      status: 200,
      code: 2000,
      message: 'OK',
      data: {
        team: teamName,
        bic: teamBic,
        members: teamMembers,
      },
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      status: 503,
      code: 5001,
      message: 'Database connection failed',
    });
  }
});

app.get('/api/accounts/', async (req, res) => {
  const [rows] = await pool.query(
    'SELECT iban, holder, balance, currency FROM accounts ORDER BY id'
  );

  res.json({
    ok: true,
    status: 200,
    code: 2000,
    message: 'OK',
    data: rows,
  });
});

app.get('/api/transactions/', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT from_bic, to_bic, from_iban, to_iban, amount, currency, status, created_at
     FROM transactions
     ORDER BY created_at DESC`
  );

  res.json({
    ok: true,
    status: 200,
    code: 2000,
    message: 'OK',
    data: rows,
  });
});

app.get('/', (req, res) => {
  res.json({
    ok: true,
    message: 'PingFin bank API is running. Use /api/info/ for the health check.',
  });
});

app.listen(port, () => {
  console.log(`PingFin bank API listening on port ${port}`);
});

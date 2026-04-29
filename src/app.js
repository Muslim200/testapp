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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

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
  res.redirect('/dashboard');
});

app.get('/dashboard', async (req, res) => {
  try {
    const [accounts] = await pool.query(
      'SELECT iban, holder, balance, currency FROM accounts ORDER BY id'
    );
    const [transactions] = await pool.query(
      `SELECT from_bic, to_bic, from_iban, to_iban, amount, currency, status, created_at
       FROM transactions
       ORDER BY created_at DESC
       LIMIT 10`
    );

    const accountRows = accounts
      .map(
        (account) => `
          <tr>
            <td>${escapeHtml(account.iban)}</td>
            <td>${escapeHtml(account.holder)}</td>
            <td>${escapeHtml(account.currency)} ${escapeHtml(account.balance)}</td>
          </tr>`
      )
      .join('');

    const transactionRows = transactions
      .map(
        (transaction) => `
          <tr>
            <td>${escapeHtml(transaction.from_bic)}</td>
            <td>${escapeHtml(transaction.to_bic)}</td>
            <td>${escapeHtml(transaction.currency)} ${escapeHtml(transaction.amount)}</td>
            <td>${escapeHtml(transaction.status)}</td>
          </tr>`
      )
      .join('');

    res.send(`<!doctype html>
      <html lang="nl">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(teamName)} dashboard</title>
          <style>
            body {
              margin: 0;
              font-family: Arial, sans-serif;
              background: #f4f6f8;
              color: #17202a;
            }
            main {
              max-width: 1100px;
              margin: 0 auto;
              padding: 32px 20px;
            }
            header {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              align-items: flex-start;
              margin-bottom: 24px;
            }
            h1 {
              margin: 0 0 8px;
              font-size: 28px;
            }
            h2 {
              margin: 0 0 12px;
              font-size: 20px;
            }
            .status {
              padding: 8px 12px;
              border-radius: 6px;
              background: #dff7e8;
              color: #176b35;
              font-weight: 700;
            }
            section {
              background: #ffffff;
              border: 1px solid #d9e1e8;
              border-radius: 8px;
              margin-bottom: 20px;
              padding: 18px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 10px;
              text-align: left;
              border-bottom: 1px solid #e6ebf0;
            }
            th {
              color: #52616f;
              font-size: 13px;
              text-transform: uppercase;
            }
            a {
              color: #0b63ce;
            }
          </style>
        </head>
        <body>
          <main>
            <header>
              <div>
                <h1>${escapeHtml(teamName)}</h1>
                <div>BIC: ${escapeHtml(teamBic)} | Members: ${escapeHtml(teamMembers.join(', '))}</div>
              </div>
              <div class="status">API en database verbonden</div>
            </header>

            <section>
              <h2>Rekeningen uit MySQL</h2>
              <table>
                <thead>
                  <tr><th>IBAN</th><th>Houder</th><th>Saldo</th></tr>
                </thead>
                <tbody>${accountRows}</tbody>
              </table>
            </section>

            <section>
              <h2>Laatste transacties uit MySQL</h2>
              <table>
                <thead>
                  <tr><th>Van BIC</th><th>Naar BIC</th><th>Bedrag</th><th>Status</th></tr>
                </thead>
                <tbody>${transactionRows}</tbody>
              </table>
            </section>

            <section>
              <h2>Links</h2>
              <p><a href="/api/info/">/api/info/</a> | <a href="/api/accounts/">/api/accounts/</a> | <a href="/api/transactions/">/api/transactions/</a></p>
              <p>Adminer draait apart op poort 8091.</p>
            </section>
          </main>
        </body>
      </html>`);
  } catch (error) {
    res.status(503).send('Database niet bereikbaar. Controleer docker compose ps en docker compose logs app.');
  }
});

app.listen(port, () => {
  console.log(`PingFin bank API listening on port ${port}`);
});

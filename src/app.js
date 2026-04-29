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

const defaultCounterparty = {
  name: process.env.DEFAULT_COUNTERPARTY_NAME || 'Bank KBC',
  bic: process.env.DEFAULT_COUNTERPARTY_BIC || 'BANKKBC1',
  url: process.env.DEFAULT_COUNTERPARTY_URL || 'http://bankkbc_app',
  iban: process.env.DEFAULT_COUNTERPARTY_IBAN || 'BE98000222223333',
};

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
app.use(express.urlencoded({ extended: false }));

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseAmount(value) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  return Math.round(amount * 100) / 100;
}

async function getDashboardData() {
  const [accounts] = await pool.query(
    'SELECT iban, holder, balance, currency FROM accounts ORDER BY id'
  );
  const [transactions] = await pool.query(
    `SELECT from_bic, to_bic, from_iban, to_iban, amount, currency, status, created_at
     FROM transactions
     ORDER BY created_at DESC
     LIMIT 10`
  );

  return { accounts, transactions };
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

app.post('/api/incoming-transfer', async (req, res) => {
  const amount = parseAmount(req.body.amount);
  const fromBic = req.body.from_bic;
  const toIban = req.body.to_iban;
  const fromIban = req.body.from_iban || null;
  const currency = req.body.currency || 'EUR';

  if (!amount || !fromBic || !toIban) {
    return res.status(400).json({
      ok: false,
      status: 400,
      code: 4001,
      message: 'Missing or invalid transfer fields',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [updateResult] = await connection.query(
      'UPDATE accounts SET balance = balance + ? WHERE iban = ?',
      [amount, toIban]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        status: 404,
        code: 4004,
        message: 'Destination account not found',
      });
    }

    await connection.query(
      `INSERT INTO transactions (from_bic, to_bic, from_iban, to_iban, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
      [fromBic, teamBic, fromIban, toIban, amount, currency]
    );

    await connection.commit();

    return res.status(200).json({
      ok: true,
      status: 200,
      code: 2000,
      message: 'Incoming transfer accepted',
      data: {
        receiving_bank: teamBic,
        to_iban: toIban,
        amount,
        currency,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      ok: false,
      status: 500,
      code: 5002,
      message: 'Incoming transfer failed',
    });
  } finally {
    connection.release();
  }
});

app.post('/api/transfer', async (req, res) => {
  const amount = parseAmount(req.body.amount);
  const fromIban = req.body.from_iban;
  const toIban = req.body.to_iban;
  const toBic = req.body.to_bic;
  const toBankUrl = String(req.body.to_bank_url || '').replace(/\/$/, '');
  const currency = req.body.currency || 'EUR';

  if (!amount || !fromIban || !toIban || !toBic || !toBankUrl) {
    return res.status(400).json({
      ok: false,
      status: 400,
      code: 4001,
      message: 'Missing or invalid transfer fields',
    });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [accounts] = await connection.query(
      'SELECT balance FROM accounts WHERE iban = ? FOR UPDATE',
      [fromIban]
    );

    if (accounts.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        ok: false,
        status: 404,
        code: 4004,
        message: 'Source account not found',
      });
    }

    const currentBalance = Number.parseFloat(accounts[0].balance);
    if (currentBalance < amount) {
      await connection.rollback();
      return res.status(400).json({
        ok: false,
        status: 400,
        code: 4002,
        message: 'Insufficient balance',
      });
    }

    const response = await fetch(`${toBankUrl}/api/incoming-transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_bic: teamBic,
        to_bic: toBic,
        from_iban: fromIban,
        to_iban: toIban,
        amount,
        currency,
      }),
    });

    const remoteResult = await response.json().catch(() => ({}));
    if (!response.ok || !remoteResult.ok) {
      await connection.rollback();
      return res.status(502).json({
        ok: false,
        status: 502,
        code: 5003,
        message: 'Remote bank rejected the transfer',
        data: remoteResult,
      });
    }

    await connection.query('UPDATE accounts SET balance = balance - ? WHERE iban = ?', [
      amount,
      fromIban,
    ]);
    await connection.query(
      `INSERT INTO transactions (from_bic, to_bic, from_iban, to_iban, amount, currency, status)
       VALUES (?, ?, ?, ?, ?, ?, 'completed')`,
      [teamBic, toBic, fromIban, toIban, amount, currency]
    );

    await connection.commit();

    return res.status(200).json({
      ok: true,
      status: 200,
      code: 2000,
      message: 'Transfer completed',
      data: {
        from_bic: teamBic,
        to_bic: toBic,
        from_iban: fromIban,
        to_iban: toIban,
        amount,
        currency,
      },
    });
  } catch (error) {
    await connection.rollback();
    return res.status(500).json({
      ok: false,
      status: 500,
      code: 5004,
      message: 'Transfer failed',
      detail: error.message,
    });
  } finally {
    connection.release();
  }
});

app.post('/transfer', async (req, res) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/transfer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  });
  const result = await response.json().catch(() => ({
    ok: false,
    message: 'Transfer response could not be parsed',
  }));
  const status = result.ok ? 'success' : 'error';
  const message = encodeURIComponent(result.message || 'Transfer verwerkt');

  res.redirect(`/dashboard?status=${status}&message=${message}`);
});

app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

app.get('/dashboard', async (req, res) => {
  try {
    const { accounts, transactions } = await getDashboardData();
    const message = req.query.message ? decodeURIComponent(req.query.message) : '';
    const status = req.query.status || '';

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
            <td>${escapeHtml(transaction.from_iban || '-')}</td>
            <td>${escapeHtml(transaction.to_iban || '-')}</td>
            <td>${escapeHtml(transaction.currency)} ${escapeHtml(transaction.amount)}</td>
            <td>${escapeHtml(transaction.status)}</td>
          </tr>`
      )
      .join('');

    const accountOptions = accounts
      .map(
        (account) =>
          `<option value="${escapeHtml(account.iban)}">${escapeHtml(account.iban)} - ${escapeHtml(account.holder)}</option>`
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
            .message {
              border-radius: 6px;
              margin-bottom: 20px;
              padding: 12px;
            }
            .message.success {
              background: #dff7e8;
              color: #176b35;
            }
            .message.error {
              background: #fde2e2;
              color: #8a1f1f;
            }
            section {
              background: #ffffff;
              border: 1px solid #d9e1e8;
              border-radius: 8px;
              margin-bottom: 20px;
              padding: 18px;
            }
            form {
              display: grid;
              gap: 12px;
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            label {
              display: grid;
              gap: 6px;
              color: #52616f;
              font-size: 13px;
              font-weight: 700;
            }
            input, select {
              border: 1px solid #c8d3dc;
              border-radius: 6px;
              font-size: 15px;
              padding: 9px 10px;
            }
            button {
              align-self: end;
              background: #0b63ce;
              border: 0;
              border-radius: 6px;
              color: #ffffff;
              cursor: pointer;
              font-size: 15px;
              font-weight: 700;
              padding: 10px 14px;
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
            @media (max-width: 760px) {
              header, form {
                display: block;
              }
              label, button {
                margin-top: 12px;
              }
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

            ${
              message
                ? `<div class="message ${escapeHtml(status)}">${escapeHtml(message)}</div>`
                : ''
            }

            <section>
              <h2>Transfer naar andere bank</h2>
              <form method="post" action="/transfer">
                <label>
                  Van rekening
                  <select name="from_iban" required>${accountOptions}</select>
                </label>
                <label>
                  Naar bank URL
                  <input name="to_bank_url" value="${escapeHtml(defaultCounterparty.url)}" required>
                </label>
                <label>
                  Naar BIC
                  <input name="to_bic" value="${escapeHtml(defaultCounterparty.bic)}" required>
                </label>
                <label>
                  Naar IBAN
                  <input name="to_iban" value="${escapeHtml(defaultCounterparty.iban)}" required>
                </label>
                <label>
                  Bedrag
                  <input name="amount" type="number" min="0.01" step="0.01" value="10.00" required>
                </label>
                <label>
                  Munt
                  <input name="currency" value="EUR" required>
                </label>
                <button type="submit">Verstuur transfer</button>
              </form>
            </section>

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
                  <tr><th>Van BIC</th><th>Naar BIC</th><th>Van IBAN</th><th>Naar IBAN</th><th>Bedrag</th><th>Status</th></tr>
                </thead>
                <tbody>${transactionRows}</tbody>
              </table>
            </section>

            <section>
              <h2>Links</h2>
              <p><a href="/api/info/">/api/info/</a> | <a href="/api/accounts/">/api/accounts/</a> | <a href="/api/transactions/">/api/transactions/</a></p>
              <p>Adminer draait apart op de poort die in docker-compose.yml staat.</p>
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

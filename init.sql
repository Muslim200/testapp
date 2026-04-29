CREATE DATABASE IF NOT EXISTS bankdb;
USE bankdb;

CREATE TABLE IF NOT EXISTS accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  iban VARCHAR(34) NOT NULL UNIQUE,
  holder VARCHAR(100) NOT NULL,
  balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_bic VARCHAR(20) NOT NULL,
  to_bic VARCHAR(20) NOT NULL,
  from_iban VARCHAR(34),
  to_iban VARCHAR(34),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO accounts (iban, holder, balance, currency)
VALUES
  ('BE12000123456789', 'Projectweek Demo', 1250.00, 'EUR'),
  ('BE34000987654321', 'PingFin Testrekening', 42.00, 'EUR')
ON DUPLICATE KEY UPDATE holder = VALUES(holder);

INSERT INTO transactions (from_bic, to_bic, from_iban, to_iban, amount, currency, status)
VALUES
  ('BANKIUS1', 'BANKKBC1', 'BE12000123456789', 'BE34000987654321', 25.50, 'EUR', 'pending')
ON DUPLICATE KEY UPDATE status = status;

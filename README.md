# PingFin Bank API Demo

Kleine Express.js testapplicatie voor de projectweek-deploy volgens de bankteam-guidelines.

- `app`: Bank IUS Node.js/Express API op poort `8081`
- `app_kbc`: Bank KBC Node.js/Express API op poort `8082`
- `db` en `db_kbc`: aparte MySQL databasecontainers
- `adminer` en `adminer_kbc`: webinterfaces voor MySQL op poort `8091` en `8092`
- verplicht health-check endpoint: `/api/info/`
- transferdemo: Bank IUS kan geld sturen naar Bank KBC en omgekeerd

Dit past bij het deployscript:

```bash
bash deploy.sh https://github.com/jouw-team/bank-api-demo netwerkteam
```

## Lokaal testen

De compose-file laadt standaard `.env.example`, zodat een verse clone meteen werkt met het deployscript.
Wil je lokaal eigen waarden testen, kopieer dan de voorbeeldvariabelen naar `.env`:

```bash
cp .env.example .env
```

Op de server bestaat `pingfin_net` al. Lokaal moet je dat netwerk eenmalig aanmaken:

```bash
docker network create pingfin_net
```

```bash
docker compose up -d --build
curl http://localhost:8081/api/info/
curl http://localhost:8081/api/accounts/
curl http://localhost:8081/api/transactions/
curl http://localhost:8082/api/info/
```

Open de app-dashboardpagina's:

```text
http://localhost:8081/dashboard
http://localhost:8082/dashboard
```

Open Adminer:

```text
http://localhost:8091
http://localhost:8092
```

Adminer login Bank IUS:

```text
System: MySQL
Server: db
Username: root
Password: password
Database: bankdb
```

Adminer login Bank KBC:

```text
System: MySQL
Server: db_kbc
Username: root
Password: password
Database: bankdb
```

Stoppen:

```bash
docker compose down
```

Alles verwijderen, inclusief databasevolume:

```bash
docker compose down -v
```

## Endpoints

- `GET /api/info/`: verplichte status met team, BIC en members
- `GET /api/accounts/`: voorbeeldrekeningen uit MySQL
- `GET /api/transactions/`: voorbeeldtransacties uit MySQL
- `POST /api/transfer`: uitgaande transfer naar een andere bank
- `POST /api/incoming-transfer`: inkomende transfer ontvangen van een andere bank
- `GET /dashboard`: eenvoudige pagina die data uit MySQL toont

## Transfer testen

Start alles:

```bash
docker compose up -d --build
```

Open Bank IUS:

```text
http://localhost:8081/dashboard
```

Klik op `Verstuur transfer`. Standaard staat het formulier al ingesteld om geld van Bank IUS naar Bank KBC te sturen via:

```text
http://bankkbc_app/api/incoming-transfer
```

Controleer daarna Bank KBC:

```text
http://localhost:8082/dashboard
```

Je ziet daar de inkomende transactie en het verhoogde saldo.

## Aanpassen per team

Pas in `docker-compose.yml` de containernamen en poort aan volgens de guidelines:

| Team | App container | DB container | Poort |
| --- | --- | --- | --- |
| Clearing Bank | `cb_app` | `cb_db` | `8080` |
| Bank IUS | `bankius_app` | `bankius_db` | `8081` |
| Bank KBC | `bankkbc_app` | `bankkbc_db` | `8082` |

Pas in `.env.example` ook `TEAM_NAME`, `TEAM_BIC` en `TEAM_MEMBERS` aan voordat je pusht.
Voor lokale tests mag je dezelfde waarden kopieren naar `.env`.

## Environment variables

Alle variabelen die de app nodig heeft staan in `.env.example`:

```bash
DB_HOST=db
DB_USER=root
DB_PASSWORD=password
DB_NAME=bankdb
DB_PORT=3306
TEAM_NAME=Bank IUS
TEAM_BIC=BANKIUS1
TEAM_MEMBERS=student1,student2
DEFAULT_COUNTERPARTY_NAME=Bank KBC
DEFAULT_COUNTERPARTY_BIC=BANKKBC1
DEFAULT_COUNTERPARTY_URL=http://bankkbc_app
DEFAULT_COUNTERPARTY_IBAN=BE98000222223333
```

Gebruik lokaal als je waarden wilt aanpassen zonder `.env.example` te wijzigen:

```bash
cp .env.example .env
```

# Prompt voor een ander bankteam

Kopieer deze prompt en geef hem aan Codex in jullie eigen projectmap.

```text
We werken aan PingFin26 tijdens de projectweek. Maak voor ons een complete Node.js/Express bank-app met Docker Compose, een aparte MySQL databasecontainer, Adminer als database-interface, en een werkende demo om transacties tussen banken te tonen.

Gebruik deze technische afspraken:

- Gebruik Node.js met Express.
- Gebruik MySQL met `mysql2`.
- De app moet draaien op containerpoort 80.
- De database moet in een aparte container draaien.
- Gebruik environment variables via `.env.example`.
- Voeg een `.dockerignore` toe.
- Voeg een `Dockerfile` toe.
- Voeg een `docker-compose.yml` toe.
- Voeg een `init.sql` toe om de database automatisch te initialiseren.
- Voeg een dashboard toe waarop je data uit de database ziet.
- Voeg Adminer toe zodat we de database via een browser kunnen bekijken.
- Voeg een verplicht endpoint toe:

GET /api/info/

Dat endpoint moet deze vorm teruggeven:

{
  "ok": true,
  "status": 200,
  "code": 2000,
  "message": "OK",
  "data": {
    "team": "Onze Banknaam",
    "bic": "ONZEBIC1",
    "members": ["naam1", "naam2"]
  }
}

Maak ook deze endpoints:

- GET /api/accounts/
- GET /api/transactions/
- POST /api/transfer
- POST /api/incoming-transfer
- GET /dashboard

De transferflow moet zo werken:

1. Op het dashboard kunnen we een bedrag kiezen en een andere bank selecteren.
2. Onze app trekt het bedrag af van onze eigen rekening in onze eigen database.
3. Onze app roept via HTTP de andere bank aan op `/api/incoming-transfer`.
4. De andere bank voegt het bedrag toe aan zijn eigen rekening in zijn eigen database.
5. Beide banken schrijven de transactie weg in hun eigen `transactions` tabel.
6. Op beide dashboards moet je kunnen zien dat de database aangepast is.

Gebruik Docker-netwerk `pingfin_net` voor communicatie tussen banken:

networks:
  pingfin_net:
    external: true

Maak de database zelf niet bereikbaar voor andere banken. Alleen de app moet op `pingfin_net`.

Gebruik deze structuur:

repo/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.example
├── init.sql
├── package.json
└── src/
    └── app.js

Gebruik deze variabelen in `.env.example`:

DB_HOST=db
DB_USER=root
DB_PASSWORD=password
DB_NAME=bankdb
DB_PORT=3306
TEAM_NAME=Onze Banknaam
TEAM_BIC=ONZEBIC1
TEAM_MEMBERS=naam1,naam2
DEFAULT_COUNTERPARTY_NAME=Andere Bank
DEFAULT_COUNTERPARTY_BIC=ANDERBIC1
DEFAULT_COUNTERPARTY_URL=http://anderebank_app
DEFAULT_COUNTERPARTY_IBAN=BE00000000000000

Maak in `init.sql` minstens deze tabellen:

- accounts
- transactions

Zorg dat er testdata in `accounts` staat, zodat we meteen een transfer kunnen uitvoeren.

Gebruik duidelijke container-namen en poorten volgens ons team. Vraag mij eerst naar:

- onze banknaam
- onze BIC
- onze teamleden
- onze app container name
- onze db container name
- onze externe app-poort
- onze Adminer-poort
- de containernaam/URL/BIC/IBAN van de bank waarmee we willen testen

Wanneer je klaar bent:

- valideer `docker compose config`
- valideer JavaScript met `node --check src/app.js`
- geef de exacte commands om te deployen
- geef de URLs om dashboard, API en Adminer te openen
```

## Voorbeeldwaarden voor PingFin26

Gebruik deze tabel als hulp bij de teamconfiguratie:

| Team | App container | DB container | App-poort |
| --- | --- | --- | --- |
| Clearing Bank | `cb_app` | `cb_db` | `8080` |
| Bank IUS | `bankius_app` | `bankius_db` | `8081` |
| Bank KBC | `bankkbc_app` | `bankkbc_db` | `8082` |

Voor communicatie tussen banken gebruik je in Docker de containernaam:

```text
http://cb_app
http://bankius_app
http://bankkbc_app
```

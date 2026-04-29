# PingFin Bank API Demo

Kleine Express.js testapplicatie voor de projectweek-deploy volgens de bankteam-guidelines.

- `app`: Node.js/Express API op containerpoort `80`
- `db`: MySQL database in een tweede container
- `adminer`: webinterface voor MySQL op poort `8091`
- verplicht health-check endpoint: `/api/info/`
- standaard Bank IUS instellingen: `bankius_app`, `bankius_db`, hostpoort `8081`

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
```

Open de app-dashboardpagina:

```text
http://localhost:8081/dashboard
```

Open Adminer:

```text
http://localhost:8091
```

Adminer login:

```text
System: MySQL
Server: db
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
- `GET /dashboard`: eenvoudige pagina die data uit MySQL toont

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
```

Gebruik lokaal als je waarden wilt aanpassen zonder `.env.example` te wijzigen:

```bash
cp .env.example .env
```

# PingFin Bank API Demo

Kleine Express.js testapplicatie voor de projectweek-deploy volgens de bankteam-guidelines.

- `app`: Node.js/Express API op containerpoort `80`
- `db`: MySQL database in een tweede container
- verplicht health-check endpoint: `/api/info/`
- standaard Bank IUS instellingen: `bankius_app`, `bankius_db`, hostpoort `8081`

Dit past bij het deployscript:

```bash
bash deploy.sh https://github.com/jouw-team/bank-api-demo netwerkteam
```

## Lokaal testen

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

## Aanpassen per team

Pas in `docker-compose.yml` deze waarden aan volgens de guidelines:

| Team | App container | DB container | Poort |
| --- | --- | --- | --- |
| Clearing Bank | `cb_app` | `cb_db` | `8080` |
| Bank IUS | `bankius_app` | `bankius_db` | `8081` |
| Bank KBC | `bankkbc_app` | `bankkbc_db` | `8082` |

Pas ook `TEAM_NAME`, `TEAM_BIC` en `TEAM_MEMBERS` aan.

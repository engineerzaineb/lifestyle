# Eventu

## Prérequis

- Python 3.11+
- Node.js 20+
- PostgreSQL 14+

## 1. Base de données

Dans `psql`, connecté en tant que `postgres` :

```sql
CREATE USER eventu_user WITH PASSWORD 'choisir_un_mot_de_passe';
CREATE DATABASE eventu OWNER eventu_user;
ALTER USER eventu_user WITH SUPERUSER;
```

## 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # macOS / Linux : source venv/bin/activate
pip install -r requirements.txt
copy .env.example .env         # macOS / Linux : cp .env.example .env
```

Remplir `SECRET_KEY`, `DB_USER` et `DB_PASSWORD` dans `backend/.env`. Pour générer une `SECRET_KEY` :

```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Puis :

```bash
python manage.py migrate
python manage.py seed_categories
python manage.py seed_interets
python manage.py seed_events
python manage.py createsuperuser
python manage.py runserver
```

Backend : http://127.0.0.1:8000

## 3. Frontend

Dans un deuxième terminal :

```bash
cd frontend
npm install
npm run dev
```

Application : http://localhost:5173
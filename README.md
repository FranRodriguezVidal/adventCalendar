# README.md
# Advent Calendar

Aplicaci�n web para crear y gestionar calendarios de Adviento personalizados.

## Requisitos

- Python 3.11+
- Node.js 20+
- npm 10+
- Git
- VS Code

## Instalaci�n

### 1) Clonar el proyecto

```powershell
cd C:\Users\franr\Proyectos\AdventCalendar
```

### 2) Crear entorno virtual Python

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 3) Instalar dependencias del backend

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4) Instalar dependencias del frontend

```powershell
cd ..\frontend
npm install
```

### 5) Configurar variables de entorno

```powershell
Copy-Item ..\.env.example ..\.env
```

Asegura que `DATABASE_URL` apunte a tu base de datos PostgreSQL/Supabase. Si no quieres usar Supabase en local, el proyecto sigue usando SQLite por defecto para pruebas y desarrollo local.

### 6) Base de datos

Para Supabase/PostgreSQL, no hace falta crear tablas a mano: la API las crea al arrancar con SQLAlchemy.

```powershell
cd ..\backend
python -m app.database.init_db
```

### 7) Ejecutar migraciones

```powershell
alembic upgrade head
```

### 8) Inicializar calendarios demo

```powershell
python -m app.seed_demo
```

### 9) Arrancar backend

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 10) Arrancar frontend

```powershell
cd ..\frontend
npm run dev -- --host 0.0.0.0
```

### 11) Acceso

- Panel admin: http://localhost:5173/admin
- Calendario p�blico: http://localhost:5173/calendar/:slug

## Pr�ximos pasos

- Crear calendarios nuevos desde el panel administrador.
- Importar y exportar JSON.
- Usar SQLite en local y preparar PostgreSQL para despliegue.

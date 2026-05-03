<p align="center">
  <img src="https://img.shields.io/badge/Noryx-AI%20Powered%20GRC-blueviolet?style=for-the-badge&logo=shield" alt="Noryx Badge"/>
</p>

<h1 align="center">🛡️ Noryx — AI-Powered GRC Platform</h1>

<p align="center">
  <b>Governance, Risk & Compliance re-imagined with Machine Learning</b><br/>
  Automated evidence validation · Cyber threat prediction · Smart risk management
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/Frontend-React%2019-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Database-PostgreSQL-4169E1?style=flat-square&logo=postgresql" />
  <img src="https://img.shields.io/badge/ML-scikit--learn%20%7C%20BERT-FF6F00?style=flat-square&logo=scikitlearn" />
  <img src="https://img.shields.io/badge/Build-Vite%208-646CFF?style=flat-square&logo=vite" />
</p>

---

## 📖 Overview

**Noryx** is a full-stack AI-powered Governance, Risk & Compliance (GRC) platform designed to automate cybersecurity compliance workflows. Instead of relying on manual reviews, Noryx uses trained Machine Learning models to validate evidence submissions, predict cyber threats from compliance gaps, and generate actionable risk insights — all in real time.

The platform is built around the **NCA (National Cybersecurity Authority)** controls framework and can be adapted to other regulatory standards.

---

## ✨ Key Features

### 🤖 AI Evidence Validation Engine
- **Multi-stage pipeline**: Screenshot → OCR (EasyOCR) → Category Classification (Model A) → Compliance Validation (Model B)
- Automatically determines whether uploaded evidence (screenshots) passes or fails a given control
- Smart category matching ensures firewall evidence isn't accepted for access-control requirements
- Confidence scoring with automatic escalation to manual review for borderline cases

### 🔮 Cyber Threat Prediction
- BERT-based semantic similarity model maps compliance failures to real-world MITRE ATT&CK techniques
- Multi-factor scoring: semantic similarity (50%) + category match (20%) + CVSS severity (20%) + prevalence (10%)
- Surfaces the most dangerous threats and the most-at-risk department

### 📊 Compliance Dashboard
- Real-time compliance percentage tracking (overall & per-department)
- Top failing controls breakdown
- Department-level analytics with pass/fail/review counts

### 🏢 Department & Role Management
- Admin and Employee portals with JWT-based authentication
- Department-scoped views — each department sees only its own controls, tasks, and metrics
- Employee management and assignment

### ✅ Task Management
- Create compliance tasks with due dates, assign to departments
- Track task lifecycle: Pending → In Progress → Completed
- Mock email alerts on task creation (FR3)

### ⚠️ Risk Register
- Automated risk creation when evidence validation fails
- Impact/likelihood classification (High/Medium/Low)
- Mitigation strategy tracking and risk closure workflow

### 📄 PDF Reporting
- One-click compliance report generation (ReportLab)
- Includes compliance metrics, open risks, and pending tasks

---

## 🏗️ Architecture

```
Noryx/
├── backend/                    # FastAPI Python backend
│   ├── main.py                 # API routes & app entry point
│   ├── models.py               # SQLAlchemy ORM models
│   ├── schemas.py              # Pydantic request/response schemas
│   ├── database.py             # PostgreSQL connection config
│   ├── auth.py                 # JWT authentication & password hashing
│   ├── ai_engine.py            # Multi-stage evidence validation engine
│   ├── threat_predictor.py     # BERT-based cyber threat prediction
│   ├── threat_intelligence.py  # MITRE ATT&CK threat database
│   ├── reporting.py            # PDF report generation
│   ├── generate_training_data.py  # Synthetic training data generator
│   ├── train_threat_model.py   # Threat model training script
│   ├── train_bert_models.py    # BERT fine-tuning script
│   └── seed_data.py            # Initial data seeding
│
├── frontend/                   # React 19 + Vite 8 frontend
│   └── src/
│       ├── App.jsx             # Main app with routing
│       ├── index.css           # Global styles
│       └── components/
│           ├── AdminDashboard.jsx
│           ├── EmployeePortal.jsx
│           ├── EmployeeDashboard.jsx
│           ├── ControlsPage.jsx
│           ├── DepartmentsPage.jsx
│           ├── TaskManagement.jsx
│           ├── RiskManagement.jsx
│           ├── ThreatPanel.jsx
│           └── Reporting.jsx
│
├── scripts/                    # Utility & migration scripts
│   ├── evaluate_models.py      # Model evaluation & metrics
│   ├── train_evidence_models.py # Evidence model training
│   ├── extract_controls.py     # NCA controls PDF parser
│   ├── migrate_to_postgres.py  # SQLite → PostgreSQL migration
│   └── nca_controls_dataset.json
│
└── NCAControls/                # NCA regulatory framework documents
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL** (running locally)

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/Noryx.git
cd Noryx
```

### 2. Set Up the Database

```bash
# Create the PostgreSQL database
createdb grc_db
```

> **Note:** The default connection string is `postgresql://<your-user>@localhost/grc_db`.
> Update `backend/database.py` if your PostgreSQL setup uses a different user or requires a password.

### 3. Set Up the Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS / Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install fastapi uvicorn sqlalchemy psycopg2-binary python-jose[cryptography] \
  passlib[bcrypt] python-multipart reportlab easyocr opencv-python-headless \
  joblib scikit-learn torch transformers numpy

# Start the backend server
uvicorn main:app --reload --port 8000
```

The backend will be available at **http://localhost:8000** and the API docs at **http://localhost:8000/docs**.

### 4. Set Up the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

### 5. Default Login Credentials

| Role     | Username   | Password  |
|----------|------------|-----------|
| Admin    | `admin`    | `admin123`|
| Employee | `employee` | `emp123`  |

---

## 🧠 Training the ML Models

The project includes scripts to train three ML models:

```bash
cd backend

# 1. Generate synthetic training data
python generate_training_data.py

# 2. Train the evidence classification models (Category + Compliance)
python -c "from scripts.train_evidence_models import *; train_models()"

# 3. Train the threat prediction model (BERT-based)
python train_threat_model.py
```

> **Note:** Trained model files (`.pkl`) and BERT model directories are excluded from Git due to their size. Each contributor must train models locally or download them separately.

---

## 🔌 API Endpoints

| Method   | Endpoint                          | Description                     |
|----------|-----------------------------------|---------------------------------|
| `POST`   | `/auth/login`                     | Login (returns JWT token)       |
| `POST`   | `/auth/register`                  | Register new user               |
| `GET`    | `/dashboard/stats`                | Overall compliance metrics      |
| `GET`    | `/dashboard/stats/{dept_id}`      | Department-specific stats       |
| `GET`    | `/dashboard/threats`              | AI threat predictions           |
| `POST`   | `/evidence/upload/`               | Upload & validate evidence      |
| `GET`    | `/evidence/`                      | List all evidence submissions   |
| `POST`   | `/controls/`                      | Create a new control            |
| `GET`    | `/controls/`                      | List all controls               |
| `POST`   | `/departments/`                   | Create a department             |
| `GET`    | `/departments/`                   | List departments                |
| `POST`   | `/tasks/`                         | Create a compliance task        |
| `GET`    | `/tasks/`                         | List all tasks                  |
| `POST`   | `/risks/`                         | Create a risk entry             |
| `GET`    | `/risks/`                         | List all risks                  |
| `GET`    | `/reports/generate`               | Download PDF compliance report  |

Full interactive API docs available at `/docs` (Swagger UI) when the backend is running.

---

## 🛠️ Tech Stack

| Layer      | Technology                                              |
|------------|--------------------------------------------------------|
| Frontend   | React 19, Vite 8, Vanilla CSS                          |
| Backend    | FastAPI, SQLAlchemy, Uvicorn                            |
| Database   | PostgreSQL                                              |
| AI/ML      | scikit-learn, EasyOCR, OpenCV, PyTorch, Transformers (BERT) |
| Auth       | JWT (python-jose), bcrypt (passlib)                     |
| Reporting  | ReportLab (PDF generation)                              |

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork** the repository
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Commit your changes**: `git commit -m "Add your feature"`
4. **Push to the branch**: `git push origin feature/your-feature`
5. **Open a Pull Request**

### Guidelines

- Keep commits atomic and well-described
- Follow the existing project structure
- Test your changes before pushing
- Update documentation when adding new features

---

## 📋 Project Status

This is an actively developed platform. Current focus areas:

- [x] AI-powered evidence validation (OCR + ML)
- [x] BERT-based cyber threat prediction
- [x] Role-based authentication (Admin/Employee)
- [x] Department-scoped compliance dashboards
- [x] Task management with alerts
- [x] Risk register with automated triggers
- [x] PDF compliance report generation
- [ ] Email notification integration (currently mocked)
- [ ] Audit trail logging
- [ ] Multi-framework support (ISO 27001, SOC 2)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with ❤️ by the Noryx Team
</p>

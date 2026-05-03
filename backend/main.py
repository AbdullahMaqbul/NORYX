from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os, shutil

import database, models, schemas, auth, reporting

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Noryx API")

@app.on_event("startup")
def seed_data():
    db = database.SessionLocal()
    try:
        # Create a default department
        dept = db.query(models.Department).filter(models.Department.name == "IT Security").first()
        if not dept:
            dept = models.Department(name="IT Security", description="Default IT Sec Dept")
            db.add(dept)
            db.commit()
            db.refresh(dept)

        # Seed Admin User
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            db.add(models.User(
                username="admin",
                password_hash=auth.get_password_hash("admin123"),
                role="admin"
            ))

        # Seed Employee User
        employee = db.query(models.User).filter(models.User.username == "employee").first()
        if not employee:
            db.add(models.User(
                username="employee",
                password_hash=auth.get_password_hash("emp123"),
                role="employee",
                department_id=dept.id
            ))
        db.commit()
    finally:
        db.close()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

os.makedirs("uploads", exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# DEPARTMENTS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/departments/", response_model=schemas.Department)
def create_department(dept: schemas.DepartmentCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Department).filter(models.Department.name == dept.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department already exists")
    db_dept = models.Department(**dept.dict())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@app.get("/departments/", response_model=List[schemas.Department])
def list_departments(db: Session = Depends(get_db)):
    return db.query(models.Department).all()

@app.delete("/departments/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Deleted"}

@app.get("/departments/{dept_id}/controls", response_model=List[schemas.Control])
def get_dept_controls(dept_id: int, db: Session = Depends(get_db)):
    return db.query(models.Control).filter(models.Control.department_id == dept_id).all()

@app.get("/departments/{dept_id}/employees", response_model=List[schemas.Employee])
def get_dept_employees(dept_id: int, db: Session = Depends(get_db)):
    return db.query(models.Employee).filter(models.Employee.department_id == dept_id).all()


# ═══════════════════════════════════════════════════════════════════════════════
# EMPLOYEES
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/employees/", response_model=schemas.Employee)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(get_db)):
    db_emp = models.Employee(**emp.dict())
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@app.get("/employees/", response_model=List[schemas.Employee])
def list_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()


# ═══════════════════════════════════════════════════════════════════════════════
# CONTROLS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/controls/", response_model=schemas.Control)
def create_control(control: schemas.ControlCreate, db: Session = Depends(get_db)):
    db_ctrl = models.Control(**control.dict())
    db.add(db_ctrl)
    db.commit()
    db.refresh(db_ctrl)
    return db_ctrl

@app.get("/controls/", response_model=List[schemas.Control])
def list_controls(db: Session = Depends(get_db)):
    return db.query(models.Control).all()

@app.patch("/controls/{control_id}", response_model=schemas.Control)
def update_control(control_id: int, update: schemas.ControlUpdate, db: Session = Depends(get_db)):
    ctrl = db.query(models.Control).filter(models.Control.id == control_id).first()
    if not ctrl:
        raise HTTPException(status_code=404, detail="Control not found")
    if update.department_id is not None:
        ctrl.department_id = update.department_id
    if update.category is not None:
        ctrl.category = update.category
    db.commit()
    db.refresh(ctrl)
    return ctrl


# ═══════════════════════════════════════════════════════════════════════════════
# EVIDENCE
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/evidence/upload/")
def upload_evidence(
    control_id:    int            = Form(...),
    department_id: Optional[int]  = Form(None),
    employee_name: Optional[str]  = Form("Unknown"),
    file:          UploadFile     = File(...),
    db:            Session        = Depends(get_db),
):
    import ai_engine

    ctrl = db.query(models.Control).filter(models.Control.id == control_id).first()
    if not ctrl:
        raise HTTPException(status_code=404, detail="Control not found")

    file_location = f"uploads/{file.filename}"
    with open(file_location, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Pass full context: criteria keywords + description so category detection
    # can match words like "firewall" that appear only in the description field
    full_context = f"{ctrl.criteria or ''} {ctrl.description or ''}".strip()
    status, extracted_text, confidence = ai_engine.validate_evidence(file_location, full_context)

    db_ev = models.Evidence(
        control_id=control_id,
        department_id=department_id,
        employee_name=employee_name,
        file_path=file_location,
        status=status,
        extracted_text=extracted_text,
        ai_confidence=confidence,
    )
    db.add(db_ev)
    db.commit()
    db.refresh(db_ev)

    # AUTOMATED RISK TRIGGER – create a risk entry when evidence fails
    if status.lower() == "fail":
        db_risk = models.Risk(
            title=f"AI Validation Failure: Control #{control_id}",
            description=f"Automated risk created due to invalid evidence upload by {employee_name}.",
            control_id=control_id,
            evidence_id=db_ev.id,
            impact="High",
            likelihood="Medium",
            status="Open"
        )
        db.add(db_risk)
        db.commit()

    return {
        "message": "File uploaded and validated",
        "evidence_id": db_ev.id,
        "status": status,
        "confidence": confidence,
        "extracted_text": extracted_text,
    }

@app.get("/evidence/", response_model=List[schemas.Evidence])
def list_evidence(db: Session = Depends(get_db)):
    return db.query(models.Evidence).order_by(models.Evidence.upload_time.desc()).all()

@app.post("/evidence/{evidence_id}/review")
def review_evidence(evidence_id: int, final_status: str = Form(...), db: Session = Depends(get_db)):
    ev = db.query(models.Evidence).filter(models.Evidence.id == evidence_id).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Evidence not found")
    ev.status = final_status
    db.commit()
    if final_status.lower() in ["pass", "fail"]:
        dataset_dir = f"dataset/train/{final_status.lower()}"
        os.makedirs(dataset_dir, exist_ok=True)
        shutil.copy(ev.file_path, os.path.join(dataset_dir, os.path.basename(ev.file_path)))
    return {"message": f"Evidence marked as {final_status}"}


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD STATS
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/dashboard/stats")
def dashboard_stats(db: Session = Depends(get_db)):
    evidences = db.query(models.Evidence).all()
    departments = db.query(models.Department).all()

    total   = len(evidences)
    passed  = sum(1 for e in evidences if e.status and e.status.lower() == "pass")
    failed  = sum(1 for e in evidences if e.status and e.status.lower() == "fail")
    review  = sum(1 for e in evidences if e.status and e.status.lower() == "need_review")
    overall = round((passed / total * 100) if total > 0 else 0, 1)

    dept_stats = []
    for dept in departments:
        d_ev = [e for e in evidences if e.department_id == dept.id]
        d_total  = len(d_ev)
        d_pass   = sum(1 for e in d_ev if e.status and e.status.lower() == "pass")
        d_fail   = sum(1 for e in d_ev if e.status and e.status.lower() == "fail")
        d_review = sum(1 for e in d_ev if e.status and e.status.lower() == "need_review")
        d_pct    = round((d_pass / d_total * 100) if d_total > 0 else 0, 1)
        dept_stats.append({
            "department": dept.name,
            "total": d_total,
            "passed": d_pass,
            "failed": d_fail,
            "review": d_review,
            "compliance_pct": d_pct,
        })

    # Top failing controls
    controls = db.query(models.Control).all()
    fail_map = {}
    for e in evidences:
        if e.status and e.status.lower() == "fail":
            fail_map[e.control_id] = fail_map.get(e.control_id, 0) + 1
    top_failing = sorted(
        [{"control": next((c.name for c in controls if c.id == cid), "Unknown"),
          "fails": cnt} for cid, cnt in fail_map.items()],
        key=lambda x: x["fails"], reverse=True
    )[:5]

    return {
        "overall_compliance": overall,
        "total_evidence": total,
        "total_pass": passed,
        "total_fail": failed,
        "total_review": review,
        "department_stats": dept_stats,
        "top_failing_controls": top_failing,
    }


@app.get("/dashboard/threats")
def dashboard_threats(db: Session = Depends(get_db)):
    """
    For every control that has at least one failed evidence submission,
    run the threat prediction model and return a ranked list of cyber threats
    (most dangerous first). Also returns per-severity counts and the
    most-at-risk department.
    """
    import threat_predictor

    evidences   = db.query(models.Evidence).filter(
        models.Evidence.status.ilike("fail")
    ).all()
    controls    = db.query(models.Control).all()
    departments = db.query(models.Department).all()

    # Build a map: control_id → fail count
    fail_counts: dict[int, int] = {}
    for ev in evidences:
        fail_counts[ev.control_id] = fail_counts.get(ev.control_id, 0) + 1

    if not fail_counts:
        return {
            "threats": [],
            "severity_counts": {"Critical": 0, "High": 0, "Medium": 0, "Low": 0},
            "total_failed_controls": 0,
            "most_at_risk_department": None,
        }

    ctrl_map = {c.id: c for c in controls}
    dept_map = {d.id: d for d in departments}

    # Dept → fail counts (for most-at-risk calculation)
    dept_fail: dict[int, int] = {}
    for ev in evidences:
        if ev.department_id:
            dept_fail[ev.department_id] = dept_fail.get(ev.department_id, 0) + 1

    most_at_risk_dept = None
    if dept_fail:
        worst_id = max(dept_fail, key=dept_fail.get)
        most_at_risk_dept = dept_map.get(worst_id, {}).name if worst_id in dept_map else None

    # Aggregate threats across all failed controls; deduplicate by technique_id,
    # keeping the highest combined_score seen for each technique.
    seen: dict[str, dict] = {}

    for ctrl_id, fail_count in fail_counts.items():
        ctrl = ctrl_map.get(ctrl_id)
        if not ctrl:
            continue

        dept_name = dept_map.get(ctrl.department_id).name if ctrl.department_id in dept_map else "Unassigned"

        preds = threat_predictor.predict_threats(
            control_name=ctrl.name or "",
            control_description=ctrl.description or "",
            control_category=ctrl.category or "",
            top_n=4,
        )

        for pred in preds:
            tid = pred["technique_id"]
            entry = {
                **pred,
                "triggered_by": ctrl.name,
                "department":   dept_name,
                "fail_count":   fail_count,
            }
            if tid not in seen or pred["combined_score"] > seen[tid]["combined_score"]:
                seen[tid] = entry

    # Sort all unique threats by combined_score descending
    threat_list = sorted(seen.values(), key=lambda x: x["combined_score"], reverse=True)

    # Severity counts
    sev_counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for t in threat_list:
        label = t.get("severity_label", "Low")
        if label in sev_counts:
            sev_counts[label] += 1

    return {
        "threats":                threat_list,
        "severity_counts":        sev_counts,
        "total_failed_controls":  len(fail_counts),
        "most_at_risk_department": most_at_risk_dept,
    }


@app.get("/dashboard/stats/{dept_id}")
def department_stats(dept_id: int, db: Session = Depends(get_db)):
    dept = db.query(models.Department).filter(models.Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    evidences = db.query(models.Evidence).filter(models.Evidence.department_id == dept_id).all()
    controls  = db.query(models.Control).filter(models.Control.department_id == dept_id).all()

    total   = len(evidences)
    passed  = sum(1 for e in evidences if e.status and e.status.lower() == "pass")
    failed  = sum(1 for e in evidences if e.status and e.status.lower() == "fail")
    review  = sum(1 for e in evidences if e.status and e.status.lower() == "need_review")
    overall = round((passed / total * 100) if total > 0 else 0, 1)

    fail_map = {}
    for e in evidences:
        if e.status and e.status.lower() == "fail":
            fail_map[e.control_id] = fail_map.get(e.control_id, 0) + 1
    top_failing = sorted(
        [{"control": next((c.name for c in controls if c.id == cid), "Unknown"),
          "fails": cnt} for cid, cnt in fail_map.items()],
        key=lambda x: x["fails"], reverse=True
    )[:5]

    return {
        "department": dept.name,
        "department_id": dept_id,
        "overall_compliance": overall,
        "total_evidence": total,
        "total_pass": passed,
        "total_fail": failed,
        "total_review": review,
        "total_controls": len(controls),
        "top_failing_controls": top_failing,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# AUTHENTICATION & USERS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = auth.get_password_hash(user.password)
    db_user = models.User(
        username=user.username,
        password_hash=hashed_password,
        role=user.role,
        department_id=user.department_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/auth/login", response_model=schemas.Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password", headers={"WWW-Authenticate": "Bearer"})

    access_token_expires = auth.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role, "username": user.username}

@app.get("/users/me", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


# ═══════════════════════════════════════════════════════════════════════════════
# TASKS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/tasks/", response_model=schemas.Task)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db)):
    db_task = models.Task(**task.dict())
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # MOCK EMAIL ALERT (FR3)
    dept = db.query(models.Department).filter(models.Department.id == db_task.department_id).first()
    dept_name = dept.name if dept else "Unknown"
    print("\n" + "="*60)
    print("📧 MOCK EMAIL ALERT TRIGGERED (FR3)")
    print(f"To: technical-staff@{dept_name.lower().replace(' ', '')}.company.com")
    print(f"Subject: New Compliance Task Assigned: TSK-{db_task.id}")
    print("Body:")
    print(f"A new task '{db_task.title}' has been assigned to your department.")
    print(f"Due Date: {db_task.due_date}")
    print("Please log in to the Noryx platform to submit your evidence.")
    print("="*60 + "\n")

    return db_task

@app.get("/tasks/", response_model=List[schemas.Task])
def list_tasks(db: Session = Depends(get_db)):
    return db.query(models.Task).all()

@app.get("/departments/{dept_id}/tasks", response_model=List[schemas.Task])
def get_dept_tasks(dept_id: int, db: Session = Depends(get_db)):
    return db.query(models.Task).filter(models.Task.department_id == dept_id).all()

@app.patch("/tasks/{task_id}", response_model=schemas.Task)
def update_task(task_id: int, status: str, db: Session = Depends(get_db)):
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    task.status = status
    db.commit()
    db.refresh(task)
    return task


# ═══════════════════════════════════════════════════════════════════════════════
# RISKS
# ═══════════════════════════════════════════════════════════════════════════════

@app.post("/risks/", response_model=schemas.Risk)
def create_risk(risk: schemas.RiskCreate, db: Session = Depends(get_db)):
    db_risk = models.Risk(**risk.dict())
    db.add(db_risk)
    db.commit()
    db.refresh(db_risk)
    return db_risk

@app.get("/risks/", response_model=List[schemas.Risk])
def list_risks(db: Session = Depends(get_db)):
    return db.query(models.Risk).all()

@app.patch("/risks/{risk_id}", response_model=schemas.Risk)
def update_risk(risk_id: int, mitigation_strategy: Optional[str] = None, status: Optional[str] = None, db: Session = Depends(get_db)):
    risk = db.query(models.Risk).filter(models.Risk.id == risk_id).first()
    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")
    if mitigation_strategy is not None:
        risk.mitigation_strategy = mitigation_strategy
    if status is not None:
        risk.status = status
    db.commit()
    db.refresh(risk)
    return risk


# ═══════════════════════════════════════════════════════════════════════════════
# REPORTING
# ═══════════════════════════════════════════════════════════════════════════════

@app.get("/reports/generate")
def generate_report(db: Session = Depends(get_db)):
    output_path = "uploads/Noryx_Compliance_Report.pdf"
    reporting.generate_pdf_report(db, output_path)
    return FileResponse(output_path, media_type="application/pdf", filename="Noryx_Compliance_Report.pdf")

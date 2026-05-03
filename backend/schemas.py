from pydantic import BaseModel
from typing import Optional, List
import datetime


# ── Department ────────────────────────────────────────────────────────────────

class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class Department(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""

    class Config:
        from_attributes = True


# ── Employee ──────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    name: str
    role: Optional[str] = "Analyst"
    department_id: int

class Employee(BaseModel):
    id: int
    name: str
    role: Optional[str] = "Analyst"
    department_id: int

    class Config:
        from_attributes = True


# ── Control ───────────────────────────────────────────────────────────────────

class ControlCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    criteria: str
    category: Optional[str] = "General"
    department_id: Optional[int] = None

class ControlUpdate(BaseModel):
    department_id: Optional[int] = None
    category: Optional[str] = None

class Control(BaseModel):
    id: int
    name: str
    description: Optional[str] = ""
    criteria: str
    category: Optional[str] = "General"
    department_id: Optional[int] = None

    class Config:
        from_attributes = True


# ── Evidence ──────────────────────────────────────────────────────────────────

class EvidenceCreate(BaseModel):
    control_id: int
    department_id: Optional[int] = None
    employee_name: Optional[str] = "Unknown"

class Evidence(BaseModel):
    id: int
    control_id: int
    department_id: Optional[int] = None
    employee_name: Optional[str] = "Unknown"
    file_path: str
    upload_time: datetime.datetime
    status: str
    extracted_text: Optional[str] = None
    ai_confidence: Optional[str] = None

    class Config:
        from_attributes = True


# ── Dashboard ─────────────────────────────────────────────────────────────────

class DeptStat(BaseModel):
    department: str
    total: int
    passed: int
    failed: int
    review: int
    compliance_pct: float

class DashboardStats(BaseModel):
    overall_compliance: float
    total_evidence: int
    total_pass: int
    total_fail: int
    total_review: int
    department_stats: List[DeptStat]
    top_failing_controls: List[dict]


# ── User & Auth ───────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "Staff"
    department_id: Optional[int] = None

class User(BaseModel):
    id: int
    username: str
    role: str
    department_id: Optional[int] = None

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str


# ── Task ──────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    department_id: int
    control_id: int
    due_date: datetime.datetime

class TaskUpdate(BaseModel):
    status: str

class Task(BaseModel):
    id: int
    title: str
    department_id: int
    control_id: int
    due_date: datetime.datetime
    status: str

    class Config:
        from_attributes = True


# ── Risk ──────────────────────────────────────────────────────────────────────

class RiskCreate(BaseModel):
    title: str
    description: str
    control_id: int
    evidence_id: Optional[int] = None
    impact: Optional[str] = "Medium"
    likelihood: Optional[str] = "Medium"

class RiskUpdate(BaseModel):
    status: Optional[str] = None
    mitigation_strategy: Optional[str] = None

class Risk(BaseModel):
    id: int
    title: str
    description: str
    control_id: int
    evidence_id: Optional[int] = None
    impact: str
    likelihood: str
    status: str
    mitigation_strategy: Optional[str] = None

    class Config:
        from_attributes = True


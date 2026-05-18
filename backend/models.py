from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime



class Department(Base):
    __tablename__ = "departments"

    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, unique=True, index=True)
    description = Column(Text, default="")

    controls   = relationship("Control",   back_populates="department")
    evidences  = relationship("Evidence",  back_populates="department")
    employees  = relationship("Employee",  back_populates="department")
    users      = relationship("User",      back_populates="department")
    tasks      = relationship("Task",      back_populates="department")


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, index=True)
    username      = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role          = Column(String, default="Staff") # Admin | Staff
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department = relationship("Department", back_populates="users")


class Employee(Base):
    __tablename__ = "employees"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, index=True)
    role          = Column(String, default="Analyst")   # Manager | Analyst | Engineer
    department_id = Column(Integer, ForeignKey("departments.id"))

    department = relationship("Department", back_populates="employees")


class Control(Base):
    __tablename__ = "controls"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, index=True)
    description   = Column(Text)
    criteria      = Column(Text)
    category      = Column(String, default="General")    # e.g. "Network", "Identity"
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    department           = relationship("Department", back_populates="controls")
    evidence_submissions = relationship("Evidence",   back_populates="control")
    tasks                = relationship("Task",       back_populates="control")
    risks                = relationship("Risk",       back_populates="control")


class Evidence(Base):
    __tablename__ = "evidence"

    id            = Column(Integer, primary_key=True, index=True)
    control_id    = Column(Integer, ForeignKey("controls.id"))
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    employee_name = Column(String, default="Unknown")
    file_path     = Column(String)
    upload_time   = Column(DateTime, default=datetime.datetime.utcnow)
    status        = Column(String, default="Pending")   # pass | fail | need_review | Pending
    extracted_text= Column(Text)
    ai_confidence = Column(String)

    # Multi-tier approval workflow
    ai_status            = Column(String, nullable=True)   # snapshot of AI verdict before manager override
    review_state         = Column(String, default="auto")  # auto | pending_manager | approved | sent_back
    manager_decision     = Column(String, nullable=True)   # approved | sent_back
    manager_comment      = Column(Text,   nullable=True)   # explanation for sent_back
    manager_justification= Column(Text,   nullable=True)   # justification for override approval
    reviewed_by          = Column(String, nullable=True)
    reviewed_at          = Column(DateTime, nullable=True)
    resubmitted_from     = Column(Integer, ForeignKey("evidence.id"), nullable=True)

    control    = relationship("Control",    back_populates="evidence_submissions")
    department = relationship("Department", back_populates="evidences")
    risks      = relationship("Risk",       back_populates="evidence")


class Task(Base):
    __tablename__ = "tasks"

    id            = Column(Integer, primary_key=True, index=True)
    title         = Column(String)
    department_id = Column(Integer, ForeignKey("departments.id"))
    control_id    = Column(Integer, ForeignKey("controls.id"))
    due_date      = Column(DateTime)
    status        = Column(String, default="Pending") # Pending | Overdue | Completed

    department = relationship("Department", back_populates="tasks")
    control    = relationship("Control",    back_populates="tasks")


class Risk(Base):
    __tablename__ = "risks"

    id                  = Column(Integer, primary_key=True, index=True)
    title               = Column(String)
    description         = Column(Text)
    control_id          = Column(Integer, ForeignKey("controls.id"))
    evidence_id         = Column(Integer, ForeignKey("evidence.id"), nullable=True)
    impact              = Column(String, default="Medium")     # High | Medium | Low
    likelihood          = Column(String, default="Medium") # High | Medium | Low
    status              = Column(String, default="Open")       # Open | Closed
    mitigation_strategy = Column(Text, nullable=True)

    control  = relationship("Control",  back_populates="risks")
    evidence = relationship("Evidence", back_populates="risks")


class TestingSchedule(Base):
    __tablename__ = "testing_schedules"

    id             = Column(Integer, primary_key=True, index=True)
    control_id     = Column(Integer, ForeignKey("controls.id"))
    frequency      = Column(String, default="quarterly")  # monthly | quarterly | biannually | annually
    last_tested_at = Column(DateTime, nullable=True)
    next_due_at    = Column(DateTime, nullable=True)
    owner          = Column(String, nullable=True)
    notes          = Column(Text, nullable=True)
    created_at     = Column(DateTime, default=datetime.datetime.utcnow)

    control = relationship("Control", backref="testing_schedule")


class ControlException(Base):
    __tablename__ = "control_exceptions"

    id                   = Column(Integer, primary_key=True, index=True)
    title                = Column(String)
    control_id           = Column(Integer, ForeignKey("controls.id"), nullable=True)
    reason               = Column(Text)
    compensating_control = Column(Text, nullable=True)
    risk_owner           = Column(String)
    approver             = Column(String, nullable=True)
    status               = Column(String, default="Pending")  # Pending | Approved | Rejected | Expired
    expiry_date          = Column(DateTime, nullable=True)
    created_at           = Column(DateTime, default=datetime.datetime.utcnow)

    control = relationship("Control", backref="exceptions")


class AuditFinding(Base):
    __tablename__ = "audit_findings"

    id                = Column(Integer, primary_key=True, index=True)
    title             = Column(String)
    description       = Column(Text)
    severity          = Column(String, default="Major")     # Critical | Major | Minor | Observation
    source            = Column(String, default="Internal")  # Internal | External | Regulatory
    framework_ref     = Column(String, nullable=True)
    owner             = Column(String, nullable=True)
    department_id     = Column(Integer, ForeignKey("departments.id"), nullable=True)
    status            = Column(String, default="Open")      # Open | In Progress | Closed
    due_date          = Column(DateTime, nullable=True)
    remediation_notes = Column(Text, nullable=True)
    created_at        = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department", backref="audit_findings")


class Vendor(Base):
    __tablename__ = "vendors"

    id                   = Column(Integer, primary_key=True, index=True)
    name                 = Column(String)
    service_type         = Column(String)
    criticality          = Column(String, default="Medium")  # High | Medium | Low
    handles_pii          = Column(Boolean, default=False)
    risk_rating          = Column(String, default="Medium")  # High | Medium | Low
    last_assessment_date = Column(DateTime, nullable=True)
    next_review_date     = Column(DateTime, nullable=True)
    contact_name         = Column(String, nullable=True)
    contact_email        = Column(String, nullable=True)
    status               = Column(String, default="Active")  # Active | Under Review | Inactive
    notes                = Column(Text, nullable=True)
    created_at           = Column(DateTime, default=datetime.datetime.utcnow)

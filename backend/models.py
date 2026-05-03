from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
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

from pathlib import Path
import datetime

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker


PROJECT_ROOT = Path(__file__).resolve().parents[1]
FRAMEWORK_DATA_DIR = PROJECT_ROOT / "data" / "frameworks"
FRAMEWORK_DB_PATH = FRAMEWORK_DATA_DIR / "framework_library.db"
POLICY_UPLOAD_DIR = PROJECT_ROOT / "data" / "company_policies"
POLICY_REPORT_DIR = POLICY_UPLOAD_DIR / "reports"

FRAMEWORK_DATA_DIR.mkdir(parents=True, exist_ok=True)
POLICY_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
POLICY_REPORT_DIR.mkdir(parents=True, exist_ok=True)

engine = create_engine(
    f"sqlite:///{FRAMEWORK_DB_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FrameworkSource(Base):
    __tablename__ = "framework_sources"

    id = Column(Integer, primary_key=True, index=True)
    framework_key = Column(String, index=True)
    framework_name = Column(String, index=True)
    version = Column(String, default="")
    owner = Column(String, default="")
    raw_format = Column(String, default="")
    source_filename = Column(String, default="")
    stored_path = Column(String, default="")
    original_path = Column(String, default="")
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)
    control_count = Column(Integer, default=0)
    mapping_count = Column(Integer, default=0)
    notes = Column(Text, default="")


class FrameworkControl(Base):
    __tablename__ = "framework_controls"

    id = Column(Integer, primary_key=True, index=True)
    framework_key = Column(String, index=True)
    framework_name = Column(String, index=True)
    version = Column(String, default="")
    control_id = Column(String, index=True)
    title = Column(String, default="")
    domain = Column(String, index=True, default="")
    category = Column(String, default="")
    control_text = Column(Text, default="")
    source_file = Column(String, default="")
    page = Column(Integer, nullable=True)
    extra_json = Column(Text, default="")
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)


class FrameworkMapping(Base):
    __tablename__ = "framework_mappings"

    id = Column(Integer, primary_key=True, index=True)
    source_framework = Column(String, index=True)
    source_control_id = Column(String, index=True)
    source_control_title = Column(String, default="")
    target_framework = Column(String, index=True)
    target_control_id = Column(String, index=True)
    scf_control_id = Column(String, index=True)
    scf_control_title = Column(String, default="")
    relationship_type = Column(String, default="mapped")
    match_score = Column(Float, nullable=True)
    notes = Column(Text, default="")
    imported_at = Column(DateTime, default=datetime.datetime.utcnow)


class PolicyDocument(Base):
    __tablename__ = "policy_documents"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String, index=True, default="")
    document_type = Column(String, default="Policy Pack")
    original_filename = Column(String, default="")
    stored_filename = Column(String, default="")
    stored_path = Column(String, default="")
    content_type = Column(String, default="")
    file_size = Column(Integer, default=0)
    notes = Column(Text, default="")
    uploaded_by = Column(String, default="Admin")
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)


def init_framework_library_db():
    Base.metadata.create_all(bind=engine)

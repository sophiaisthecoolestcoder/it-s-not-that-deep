from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from app.models.employee import EmployeeRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(EmployeeRole), nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Boolean, nullable=False, server_default="true")
    must_change_password = Column(Boolean, nullable=False, server_default="false")
    # Any JWT whose `iat` is earlier than this timestamp is rejected. Bumped on
    # password change so stolen tokens can't outlive the secret they were issued under.
    tokens_invalidated_before = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    employee = relationship("Employee", backref="user", uselist=False)

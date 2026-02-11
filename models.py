"""
Database Models and Schema
===========================
Uses SQLAlchemy ORM for database abstraction.
Switching from SQLite to PostgreSQL requires only changing the connection string.

Design Decision:
- SQLAlchemy provides database-agnostic ORM
- Easy migration path: SQLite (dev) → PostgreSQL (production)
- Type hints for IDE support
- Indexes on frequently queried columns
"""

from sqlalchemy import create_engine, Column, String, Float, Date, DateTime, Integer, Boolean, Index, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import enum

Base = declarative_base()


class CAGRType(enum.Enum):
    """
    Enum for CAGR calculation type classification
    
    - HISTORICAL: Calculated from sufficient NAV data (ideal case)
    - APPROX: Calculated but date gap > 10 trading days (less reliable)
    - ESTIMATED: Fallback to category average (no historical data)
    """
    HISTORICAL = "historical"
    APPROX = "approx"
    ESTIMATED = "estimated"


class Fund(Base):
    """
    Master table for mutual fund metadata
    
    Why separate fund metadata?
    - Fund info rarely changes
    - NAV data changes daily
    - Normalization reduces redundancy
    """
    __tablename__ = 'funds'
    
    # Primary identifier from MFAPI
    scheme_code = Column(String(20), primary_key=True, index=True)
    
    # Fund metadata
    fund_name = Column(String(500), nullable=False)
    category = Column(String(100))  # e.g., "Large Cap", "Debt", "Hybrid"
    amc = Column(String(200))  # Asset Management Company
    launch_date = Column(Date)
    
    # Metadata flags for quick filtering
    is_direct = Column(Boolean, default=False)
    is_growth = Column(Boolean, default=False)
    
    # Tracking
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Fund(scheme_code={self.scheme_code}, name={self.fund_name[:30]})>"


class NAVHistory(Base):
    """
    Daily NAV (Net Asset Value) time series
    
    Why separate table?
    - High volume (365 rows/fund/year)
    - Enables efficient time-series queries
    - Partitionable by date in PostgreSQL
    
    Composite primary key: (scheme_code, date)
    - Prevents duplicate NAV entries for same date
    - Natural key for time-series data
    """
    __tablename__ = 'nav_history'
    
    scheme_code = Column(String(20), primary_key=True, index=True)
    date = Column(Date, primary_key=True, index=True)
    nav = Column(Float, nullable=False)
    
    # Validation flags (populated during ingestion)
    is_suspicious = Column(Boolean, default=False)  # NAV jump > ±30%
    daily_change_pct = Column(Float)  # For anomaly detection
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Composite index for range queries (scheme_code, date)
    __table_args__ = (
        Index('idx_scheme_date', 'scheme_code', 'date'),
    )
    
    def __repr__(self):
        return f"<NAV({self.scheme_code}, {self.date}, ₹{self.nav})>"


class FundMetrics(Base):
    """
    Precomputed financial metrics
    
    Why precompute?
    - CAGR calculation is expensive (requires historical NAV lookup)
    - Frontend needs instant response (<100ms)
    - Metrics updated daily via batch job
    
    Why store metadata about calculations?
    - Transparency: Users should know data quality
    - Debugging: Easier to trace calculation issues
    - Compliance: Finance apps must disclose data limitations
    """
    __tablename__ = 'fund_metrics'
    
    scheme_code = Column(String(20), primary_key=True, index=True)
    
    # CAGR metrics with type classification
    cagr_1y = Column(Float)
    cagr_1y_type = Column(Enum(CAGRType))
    cagr_1y_date_gap_days = Column(Integer)  # Actual days between target and available NAV
    
    cagr_3y = Column(Float)
    cagr_3y_type = Column(Enum(CAGRType))
    cagr_3y_date_gap_days = Column(Integer)
    
    cagr_5y = Column(Float)
    cagr_5y_type = Column(Enum(CAGRType))
    cagr_5y_date_gap_days = Column(Integer)
    
    # Data quality flags
    has_sufficient_history_1y = Column(Boolean, default=False)
    has_sufficient_history_3y = Column(Boolean, default=False)
    has_sufficient_history_5y = Column(Boolean, default=False)
    
    missing_nav_streak_days = Column(Integer, default=0)  # Longest gap in NAV data
    suspicious_nav_count = Column(Integer, default=0)  # Count of NAV jumps > ±30%
    
    # Metadata
    last_calculated = Column(DateTime)
    calculation_errors = Column(String(500))  # Store any errors during calculation
    
    def __repr__(self):
        return f"<Metrics({self.scheme_code}, 1Y:{self.cagr_1y}, 3Y:{self.cagr_3y}, 5Y:{self.cagr_5y})>"


class DataIngestionLog(Base):
    """
    Audit trail for data pipeline runs
    
    Why log ingestion?
    - Debugging: Track when data was last updated
    - Monitoring: Detect API failures
    - Compliance: Audit trail for data lineage
    """
    __tablename__ = 'ingestion_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    scheme_code = Column(String(20), index=True)
    
    # Status tracking
    status = Column(String(20))  # 'success', 'failed', 'partial'
    records_fetched = Column(Integer)
    records_stored = Column(Integer)
    
    # Error tracking
    error_message = Column(String(1000))
    
    # Timestamps
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    def __repr__(self):
        return f"<IngestionLog({self.scheme_code}, {self.status}, {self.completed_at})>"


# Database connection factory
class DatabaseManager:
    """
    Manages database connections and sessions
    
    Design Decision:
    - Singleton pattern for connection pool
    - Session factory for thread-safe operations
    - Easy to swap SQLite → PostgreSQL
    """
    
    def __init__(self, database_url: str = "sqlite:///mutual_funds.db"):
        """
        Initialize database connection
        
        Args:
            database_url: SQLAlchemy connection string
                - SQLite: "sqlite:///mutual_funds.db"
                - PostgreSQL: "postgresql://user:pass@localhost/dbname"
        """
        self.engine = create_engine(
            database_url,
            # SQLite-specific optimization
            connect_args={"check_same_thread": False} if "sqlite" in database_url else {},
            # Connection pool settings (important for PostgreSQL)
            pool_pre_ping=True,  # Verify connections before use
            pool_size=10,
            max_overflow=20
        )
        self.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
    
    def create_tables(self):
        """Create all tables (idempotent)"""
        Base.metadata.create_all(bind=self.engine)
        print("✅ Database tables created successfully")
    
    def get_session(self):
        """Get a new database session"""
        return self.SessionLocal()
    
    def close(self):
        """Close all connections"""
        self.engine.dispose()


# Example usage
if __name__ == "__main__":
    # For development: SQLite
    db = DatabaseManager("sqlite:///mutual_funds.db")
    
    # For production: PostgreSQL (just change connection string!)
    # db = DatabaseManager("postgresql://user:password@localhost:5432/mutual_funds")
    
    db.create_tables()
    
    print("\n📊 Database Schema Created")
    print("=" * 50)
    print(f"Engine: {db.engine.url}")
    print(f"Tables: {', '.join(Base.metadata.tables.keys())}")
"""
Backend API
===========
FastAPI-based REST API for serving fund data to frontend.

Design Decisions:
- FastAPI for performance (async support, auto docs)
- Pydantic for response validation (type safety)
- Read-only endpoints (no mutations from frontend)
- CORS enabled for local development
- Pagination for large datasets
"""

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from sqlalchemy.orm import Session
from enum import Enum

from models import DatabaseManager, Fund, NAVHistory, FundMetrics, CAGRType

# Initialize database
db_manager = DatabaseManager("sqlite:///mutual_funds_demo.db")

# FastAPI app
app = FastAPI(
    title="Mutual Fund Data API",
    description="Finance-grade data API for Indian mutual funds",
    version="1.0.0"
)

# Enable CORS (for frontend development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET"],  # Read-only
    allow_headers=["*"],
)


# ============================================================================
# Pydantic Models (Response Schemas)
# ============================================================================

class CAGRTypeEnum(str, Enum):
    """CAGR type enum for API responses"""
    HISTORICAL = "historical"
    APPROX = "approx"
    ESTIMATED = "estimated"


class CAGRMetric(BaseModel):
    """Individual CAGR metric with metadata"""
    value: Optional[float] = Field(None, description="CAGR percentage (e.g., 12.5 for 12.5%)")
    type: CAGRTypeEnum = Field(..., description="Data quality: historical/approx/estimated")
    date_gap_days: int = Field(0, description="Days between target and actual NAV date")
    
    class Config:
        schema_extra = {
            "example": {
                "value": 12.5,
                "type": "historical",
                "date_gap_days": 2
            }
        }


class FundMetricsResponse(BaseModel):
    """Complete metrics for a fund"""
    scheme_code: str
    
    # CAGR metrics
    cagr_1y: Optional[CAGRMetric]
    cagr_3y: Optional[CAGRMetric]
    cagr_5y: Optional[CAGRMetric]
    
    # Data quality
    has_sufficient_history_1y: bool
    has_sufficient_history_3y: bool
    has_sufficient_history_5y: bool
    
    missing_nav_streak_days: int = Field(..., description="Longest gap in NAV data (days)")
    suspicious_nav_count: int = Field(..., description="Count of abnormal NAV jumps")
    
    last_calculated: Optional[datetime] = Field(None, description="When metrics were last computed")
    
    class Config:
        schema_extra = {
            "example": {
                "scheme_code": "119551",
                "cagr_1y": {"value": 8.5, "type": "historical", "date_gap_days": 1},
                "cagr_3y": {"value": 12.3, "type": "historical", "date_gap_days": 3},
                "cagr_5y": {"value": 14.7, "type": "approx", "date_gap_days": 12},
                "has_sufficient_history_1y": True,
                "has_sufficient_history_3y": True,
                "has_sufficient_history_5y": True,
                "missing_nav_streak_days": 5,
                "suspicious_nav_count": 0,
                "last_calculated": "2026-02-09T10:30:00"
            }
        }


class FundBasicInfo(BaseModel):
    """Basic fund information for list endpoints"""
    scheme_code: str
    fund_name: str
    category: Optional[str]
    amc: Optional[str]
    is_direct: bool
    is_growth: bool
    
    class Config:
        from_attributes = True  # Enable ORM mode


class FundDetailResponse(BaseModel):
    """Detailed fund information including latest NAV"""
    scheme_code: str
    fund_name: str
    category: Optional[str]
    amc: Optional[str]
    is_direct: bool
    is_growth: bool
    launch_date: Optional[date]
    
    # Latest NAV
    latest_nav: Optional[float]
    latest_nav_date: Optional[date]
    
    # Metrics summary
    cagr_1y: Optional[float]
    cagr_3y: Optional[float]
    cagr_5y: Optional[float]
    
    class Config:
        from_attributes = True


class NAVRecord(BaseModel):
    """Single NAV data point"""
    date: date
    nav: float
    is_suspicious: bool = False
    daily_change_pct: Optional[float] = None
    
    class Config:
        from_attributes = True


# ============================================================================
# Dependency Injection
# ============================================================================

def get_db():
    """
    Database session dependency
    
    Why dependency injection?
    - Automatic session management
    - Easy to mock in tests
    - Thread-safe per-request sessions
    """
    session = db_manager.get_session()
    try:
        yield session
    finally:
        session.close()


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/", tags=["Health"])
async def root():
    """API health check"""
    return {
        "status": "healthy",
        "service": "Mutual Fund Data API",
        "version": "1.0.0",
        "timestamp": datetime.utcnow()
    }


@app.get("/funds", response_model=List[FundBasicInfo], tags=["Funds"])
async def list_funds(
    category: Optional[str] = Query(None, description="Filter by category (e.g., 'Large Cap')"),
    is_direct: Optional[bool] = Query(None, description="Filter direct plans"),
    is_growth: Optional[bool] = Query(None, description="Filter growth plans"),
    limit: int = Query(100, ge=1, le=500, description="Max results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db)
):
    """
    List all funds with optional filtering
    
    Query Parameters:
    - category: Filter by fund category
    - is_direct: Filter direct/regular plans
    - is_growth: Filter growth/dividend plans
    - limit: Results per page (max 500)
    - offset: Skip first N results
    
    Returns:
    - List of funds with basic info
    """
    query = db.query(Fund)
    
    # Apply filters
    if category:
        query = query.filter(Fund.category == category)
    if is_direct is not None:
        query = query.filter(Fund.is_direct == is_direct)
    if is_growth is not None:
        query = query.filter(Fund.is_growth == is_growth)
    
    # Pagination
    funds = query.offset(offset).limit(limit).all()
    
    return funds


@app.get("/funds/{scheme_code}", response_model=FundDetailResponse, tags=["Funds"])
async def get_fund_details(
    scheme_code: str,
    db: Session = Depends(get_db)
):
    """
    Get detailed information for a specific fund
    
    Path Parameters:
    - scheme_code: MFAPI scheme code (e.g., "119551")
    
    Returns:
    - Fund metadata, latest NAV, and CAGR summary
    """
    # Get fund metadata
    fund = db.query(Fund).filter(Fund.scheme_code == scheme_code).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {scheme_code} not found")
    
    # Get latest NAV
    latest_nav = (
        db.query(NAVHistory)
        .filter(NAVHistory.scheme_code == scheme_code)
        .order_by(NAVHistory.date.desc())
        .first()
    )
    
    # Get metrics
    metrics = db.query(FundMetrics).filter(FundMetrics.scheme_code == scheme_code).first()
    
    return FundDetailResponse(
        scheme_code=fund.scheme_code,
        fund_name=fund.fund_name,
        category=fund.category,
        amc=fund.amc,
        is_direct=fund.is_direct,
        is_growth=fund.is_growth,
        launch_date=fund.launch_date,
        latest_nav=latest_nav.nav if latest_nav else None,
        latest_nav_date=latest_nav.date if latest_nav else None,
        cagr_1y=metrics.cagr_1y if metrics else None,
        cagr_3y=metrics.cagr_3y if metrics else None,
        cagr_5y=metrics.cagr_5y if metrics else None
    )


@app.get("/funds/{scheme_code}/metrics", response_model=FundMetricsResponse, tags=["Metrics"])
async def get_fund_metrics(
    scheme_code: str,
    db: Session = Depends(get_db)
):
    """
    Get complete calculated metrics for a fund
    
    Path Parameters:
    - scheme_code: MFAPI scheme code
    
    Returns:
    - CAGR (1Y, 3Y, 5Y) with data quality flags
    - Missing NAV streak
    - Suspicious NAV count
    
    This is the PRIMARY endpoint for frontend consumption.
    All CAGR calculations are pre-computed (fast response).
    """
    metrics = db.query(FundMetrics).filter(FundMetrics.scheme_code == scheme_code).first()
    if not metrics:
        raise HTTPException(
            status_code=404,
            detail=f"Metrics not found for {scheme_code}. Data may not be ingested yet."
        )
    
    return FundMetricsResponse(
        scheme_code=metrics.scheme_code,
        cagr_1y=CAGRMetric(
            value=metrics.cagr_1y,
            type=metrics.cagr_1y_type.value,
            date_gap_days=metrics.cagr_1y_date_gap_days
        ) if metrics.cagr_1y else None,
        cagr_3y=CAGRMetric(
            value=metrics.cagr_3y,
            type=metrics.cagr_3y_type.value,
            date_gap_days=metrics.cagr_3y_date_gap_days
        ) if metrics.cagr_3y else None,
        cagr_5y=CAGRMetric(
            value=metrics.cagr_5y,
            type=metrics.cagr_5y_type.value,
            date_gap_days=metrics.cagr_5y_date_gap_days
        ) if metrics.cagr_5y else None,
        has_sufficient_history_1y=metrics.has_sufficient_history_1y,
        has_sufficient_history_3y=metrics.has_sufficient_history_3y,
        has_sufficient_history_5y=metrics.has_sufficient_history_5y,
        missing_nav_streak_days=metrics.missing_nav_streak_days,
        suspicious_nav_count=metrics.suspicious_nav_count,
        last_calculated=metrics.last_calculated
    )


@app.get("/funds/{scheme_code}/nav", response_model=List[NAVRecord], tags=["NAV"])
async def get_nav_history(
    scheme_code: str,
    start_date: Optional[date] = Query(None, description="Filter NAV from this date"),
    end_date: Optional[date] = Query(None, description="Filter NAV until this date"),
    limit: int = Query(365, ge=1, le=5000, description="Max records"),
    db: Session = Depends(get_db)
):
    """
    Get historical NAV data for a fund
    
    Query Parameters:
    - start_date: Filter NAV >= this date
    - end_date: Filter NAV <= this date
    - limit: Max records (default: 365 days)
    
    Returns:
    - List of NAV records (date, nav, flags)
    
    Use Case:
    - Charting NAV performance
    - Custom CAGR calculations (not recommended, use /metrics instead)
    """
    query = db.query(NAVHistory).filter(NAVHistory.scheme_code == scheme_code)
    
    if start_date:
        query = query.filter(NAVHistory.date >= start_date)
    if end_date:
        query = query.filter(NAVHistory.date <= end_date)
    
    nav_records = query.order_by(NAVHistory.date.desc()).limit(limit).all()
    
    if not nav_records:
        raise HTTPException(
            status_code=404,
            detail=f"No NAV data found for {scheme_code}"
        )
    
    return nav_records


@app.get("/search", response_model=List[FundBasicInfo], tags=["Search"])
async def search_funds(
    q: str = Query(..., min_length=3, description="Search query (fund name, AMC)"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """
    Search funds by name or AMC
    
    Query Parameters:
    - q: Search term (min 3 characters)
    - limit: Max results (default 20)
    
    Returns:
    - List of matching funds
    
    Search is case-insensitive and matches fund_name or amc.
    """
    search_term = f"%{q}%"
    funds = (
        db.query(Fund)
        .filter(
            (Fund.fund_name.ilike(search_term)) | 
            (Fund.amc.ilike(search_term))
        )
        .limit(limit)
        .all()
    )
    
    return funds


# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    print("\n🚀 Starting Mutual Fund Data API")
    print("=" * 60)
    print("📖 API Docs: http://localhost:8000/docs")
    print("🔍 Example: http://localhost:8000/funds/119551/metrics")
    print("=" * 60)
    
    uvicorn.run(
        "api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload on code changes (dev only)
        log_level="info"
    )
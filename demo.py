"""
Complete End-to-End Demo
========================
Demonstrates the entire pipeline in one script.

Usage:
    python demo.py
    
This will:
1. Create database tables
2. Ingest sample fund data
3. Calculate metrics
4. Query and display results
"""

import time
from models import DatabaseManager, Fund, NAVHistory, FundMetrics
from ingestion import DataIngestion
from calculations import MetricsCalculator


def print_section(title):
    """Pretty print section headers"""
    print("\n" + "="*60)
    print(f"  {title}")
    print("="*60)


def demo():
    """Run complete demo"""
    
    print_section("🚀 Mutual Fund Data Pipeline Demo")
    
    # ========================================================================
    # Step 1: Initialize Database
    # ========================================================================
    print_section("Step 1: Initialize Database")
    
    db = DatabaseManager("sqlite:///mutual_funds_demo.db")
    db.create_tables()
    print("✅ Database tables created")
    
    # ========================================================================
    # Step 2: Ingest Fund Data
    # ========================================================================
    print_section("Step 2: Ingest NAV Data from MFAPI")
    
    # Sample funds (popular Direct Growth plans)
    SAMPLE_FUNDS = [
        ("119551", "HDFC Balanced Advantage Fund"),
        ("122639", "Parag Parikh Flexi Cap Fund"),
        ("120505", "ICICI Prudential Bluechip Fund"),
    ]
    
    ingestion = DataIngestion(db)
    
    print(f"\nIngesting {len(SAMPLE_FUNDS)} funds...")
    for code, name in SAMPLE_FUNDS:
        print(f"  📥 {name} ({code})")
    
    print("\n⏳ This may take 5-10 seconds (fetching from MFAPI)...")
    
    start_time = time.time()
    success = ingestion.ingest_multiple_funds([code for code, _ in SAMPLE_FUNDS])
    elapsed = time.time() - start_time
    
    print(f"\n✅ Ingestion complete in {elapsed:.2f}s")
    print(f"   Success: {success}/{len(SAMPLE_FUNDS)} funds")
    
    # ========================================================================
    # Step 3: Calculate Metrics
    # ========================================================================
    print_section("Step 3: Calculate CAGR Metrics")
    
    session = db.get_session()
    calculator = MetricsCalculator(session)
    
    print("\n🧮 Calculating 1Y, 3Y, 5Y CAGR for all funds...")
    metrics_count = calculator.calculate_all_fund_metrics()
    session.close()
    
    print(f"✅ Metrics calculated for {metrics_count} funds")
    
    # ========================================================================
    # Step 4: Query and Display Results
    # ========================================================================
    print_section("Step 4: Query Results (What Frontend Gets)")
    
    session = db.get_session()
    
    for code, name in SAMPLE_FUNDS:
        print(f"\n📊 {name}")
        print("-" * 60)
        
        # Get fund metadata
        fund = session.query(Fund).filter_by(scheme_code=code).first()
        if fund:
            print(f"   Category: {fund.category}")
            print(f"   AMC: {fund.amc}")
            print(f"   Direct: {fund.is_direct}, Growth: {fund.is_growth}")
        
        # Get latest NAV
        latest_nav = (
            session.query(NAVHistory)
            .filter_by(scheme_code=code)
            .order_by(NAVHistory.date.desc())
            .first()
        )
        if latest_nav:
            print(f"   Latest NAV: ₹{latest_nav.nav:.2f} (as of {latest_nav.date})")
        
        # Get metrics
        metrics = session.query(FundMetrics).filter_by(scheme_code=code).first()
        if metrics:
            print(f"\n   CAGR Metrics:")
            
            if metrics.cagr_1y:
                print(f"   • 1Y: {metrics.cagr_1y:.2f}% ({metrics.cagr_1y_type.value})")
            
            if metrics.cagr_3y:
                print(f"   • 3Y: {metrics.cagr_3y:.2f}% ({metrics.cagr_3y_type.value})")
            
            if metrics.cagr_5y:
                print(f"   • 5Y: {metrics.cagr_5y:.2f}% ({metrics.cagr_5y_type.value})")
                if metrics.cagr_5y_type.value == 'approx':
                    print(f"      ⚠️  Date gap: {metrics.cagr_5y_date_gap_days} days")
            
            print(f"\n   Data Quality:")
            print(f"   • Missing NAV streak: {metrics.missing_nav_streak_days} days")
            print(f"   • Suspicious NAVs: {metrics.suspicious_nav_count}")
    
    session.close()
    
    # ========================================================================
    # Step 5: Simulate API Response
    # ========================================================================
    print_section("Step 5: Example API Response (JSON)")
    
    session = db.get_session()
    sample_code = SAMPLE_FUNDS[0][0]
    metrics = session.query(FundMetrics).filter_by(scheme_code=sample_code).first()
    session.close()
    
    if metrics:
        # Simulate what frontend receives
        api_response = {
            "scheme_code": metrics.scheme_code,
            "cagr_1y": {
                "value": metrics.cagr_1y,
                "type": metrics.cagr_1y_type.value if metrics.cagr_1y_type else None,
                "date_gap_days": metrics.cagr_1y_date_gap_days
            } if metrics.cagr_1y else None,
            "cagr_3y": {
                "value": metrics.cagr_3y,
                "type": metrics.cagr_3y_type.value if metrics.cagr_3y_type else None,
                "date_gap_days": metrics.cagr_3y_date_gap_days
            } if metrics.cagr_3y else None,
            "cagr_5y": {
                "value": metrics.cagr_5y,
                "type": metrics.cagr_5y_type.value if metrics.cagr_5y_type else None,
                "date_gap_days": metrics.cagr_5y_date_gap_days
            } if metrics.cagr_5y else None,
            "has_sufficient_history_1y": metrics.has_sufficient_history_1y,
            "has_sufficient_history_3y": metrics.has_sufficient_history_3y,
            "has_sufficient_history_5y": metrics.has_sufficient_history_5y,
            "missing_nav_streak_days": metrics.missing_nav_streak_days,
            "suspicious_nav_count": metrics.suspicious_nav_count
        }
        
        import json
        print(json.dumps(api_response, indent=2))
    
    # ========================================================================
    # Summary
    # ========================================================================
    print_section("✅ Demo Complete!")
    
    print("""
Next Steps:
-----------
1. Start API server:
   $ python api.py
   
2. Access API docs:
   http://localhost:8000/docs
   
3. Query fund metrics:
   http://localhost:8000/funds/119551/metrics
   
4. Set up daily scheduler:
   $ python scheduler.py
   
5. Integrate with frontend:
   See FRONTEND_INTEGRATION.md
    """)
    
    print("\n📂 Database created: mutual_funds_demo.db")
    print("🔍 Inspect with: sqlite3 mutual_funds_demo.db")
    print("\n")


if __name__ == "__main__":
    try:
        demo()
    except KeyboardInterrupt:
        print("\n\n⚠️  Demo interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()
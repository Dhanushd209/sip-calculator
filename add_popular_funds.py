"""
Add Popular Funds to Database
==============================
Adds the most popular mutual funds that are likely used in your frontend.
"""

from models import DatabaseManager
from ingestion import DataIngestion
from calculations import MetricsCalculator

# Popular mutual funds (Direct Growth plans)
POPULAR_FUNDS = [
    # Large Cap
    "119597",  # HDFC Top 100 Fund - Direct Growth
    "120505",  # ICICI Prudential Bluechip Fund - Direct Growth
    "120591",  # Axis Bluechip Fund - Direct Growth
    
    # Flexi/Multi Cap
    "122639",  # Parag Parikh Flexi Cap Fund - Direct Growth
    "145552",  # Quant Flexi Cap Fund - Direct Growth
    
    # Mid Cap
    "119598",  # HDFC Mid-Cap Opportunities Fund - Direct Growth
    "120593",  # Axis Midcap Fund - Direct Growth
    
    # Small Cap
    "119555",  # HDFC Small Cap Fund - Direct Growth
    "120594",  # Axis Small Cap Fund - Direct Growth
    
    # Hybrid/Balanced
    "119551",  # HDFC Balanced Advantage Fund - Direct Growth
    
    # Debt
    "118825",  # HDFC Corporate Bond Fund - Direct Growth
    
    # ELSS (Tax Saving)
    "119533",  # HDFC Tax Saver - Direct Growth
]

def main():
    print("=" * 60)
    print("📥 Adding Popular Mutual Funds to Database")
    print("=" * 60)
    print(f"\nTotal funds to add: {len(POPULAR_FUNDS)}")
    print("⏳ This will take ~30-60 seconds...\n")
    
    # Initialize
    db = DatabaseManager("sqlite:///mutual_funds_demo.db")
    ingestion = DataIngestion(db)
    
    # Check existing funds
    session = db.get_session()
    from models import Fund
    existing_codes = set([f.scheme_code for f in session.query(Fund).all()])
    session.close()
    
    # Filter out existing funds
    new_funds = [code for code in POPULAR_FUNDS if code not in existing_codes]
    
    print(f"✅ Already in database: {len(POPULAR_FUNDS) - len(new_funds)}")
    print(f"📥 New funds to ingest: {len(new_funds)}\n")
    
    if not new_funds:
        print("✅ All funds already in database!")
        return
    
    # Ingest new funds
    success_count = ingestion.ingest_multiple_funds(new_funds)
    
    # Calculate metrics
    print("\n🧮 Calculating metrics for all funds...")
    session = db.get_session()
    calculator = MetricsCalculator(session)
    metrics_count = calculator.calculate_all_fund_metrics()
    session.close()
    
    # Summary
    print("\n" + "=" * 60)
    print("✅ Database Update Complete!")
    print("=" * 60)
    print(f"""
📊 Total funds in database: {len(existing_codes) + success_count}
📥 Newly added: {success_count}
🧮 Metrics calculated: {metrics_count}

Next: Integrate with frontend!
""")

if __name__ == "__main__":
    main()
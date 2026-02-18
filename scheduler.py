"""
Daily Data Refresh Scheduler
=============================
Automates daily NAV ingestion and metrics calculation.

Design Decisions:
- APScheduler for cron-like scheduling
- Runs at market close (6 PM IST)
- Error notifications via logging (can extend to email/Slack)
"""

from apscheduler.schedulers.blocking import BlockingScheduler
from apscheduler.triggers.cron import CronTrigger
from datetime import datetime
import logging

from models import DatabaseManager
from ingestion import DataIngestion
from calculations import MetricsCalculator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DataPipeline:
    """
    Orchestrates complete data refresh pipeline
    
    Workflow:
    1. Ingest NAV data from MFAPI
    2. Calculate metrics (CAGR, data quality)
    3. Log completion status
    """
    
    def __init__(self, db_url: str = "sqlite:///mutual_funds_demo.db"):
        self.db_manager = DatabaseManager(db_url)
        self.ingestion = DataIngestion(self.db_manager)
    
    def run_daily_refresh(self, scheme_codes: list):
        """
        Run complete data pipeline
        
        Args:
            scheme_codes: List of funds to refresh
        """
        logger.info("="*60)
        logger.info("🚀 Starting daily data refresh pipeline")
        logger.info(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("="*60)
        
        try:
            # Step 1: Ingest NAV data
            logger.info(f"📥 Ingesting NAV data for {len(scheme_codes)} funds")
            success_count = self.ingestion.ingest_multiple_funds(scheme_codes)
            logger.info(f"✅ Ingestion complete: {success_count}/{len(scheme_codes)} successful")
            
            # Step 2: Calculate metrics
            logger.info("🧮 Calculating fund metrics")
            session = self.db_manager.get_session()
            calculator = MetricsCalculator(session)
            metrics_count = calculator.calculate_all_fund_metrics()
            session.close()
            logger.info(f"✅ Metrics calculated for {metrics_count} funds")
            
            logger.info("="*60)
            logger.info("✅ Daily refresh completed successfully")
            logger.info("="*60)
            
        except Exception as e:
            logger.error(f"❌ Daily refresh failed: {e}", exc_info=True)
            # TODO: Send alert (email, Slack, PagerDuty)
            raise


def main():
    """
    Production scheduler configuration
    
    Schedule:
    - Daily at 6:00 PM IST (after market close)
    - Weekdays only (markets closed weekends)
    
    Why 6 PM?
    - Indian markets close at 3:30 PM
    - MFAPI typically updates by 5 PM
    - 6 PM gives buffer for API updates
    """
    
    # List of funds to track (expand as needed)
    TRACKED_FUNDS = [
        "119551",  # HDFC Balanced Advantage Fund
        "122639",  # Parag Parikh Flexi Cap Fund
        "120505",  # ICICI Prudential Bluechip Fund
        "119598",  # HDFC Mid-Cap Opportunities Fund
        "120594",  # Axis Small Cap Fund
        "119555",  # HDFC Small Cap Fund
        "120593",  # Axis Midcap Fund
        "145552",  # Quant Flexi Cap Fund
        # Add more scheme codes as your app grows
    ]
    
    # Initialize pipeline
    pipeline = DataPipeline()
    
    # Create scheduler
    scheduler = BlockingScheduler(timezone='Asia/Kolkata')
    
    # Schedule daily refresh at 6 PM IST, Monday-Friday
    scheduler.add_job(
        func=lambda: pipeline.run_daily_refresh(TRACKED_FUNDS),
        trigger=CronTrigger(
            day_of_week='mon-fri',  # Weekdays only
            hour=18,                # 6 PM
            minute=0
        ),
        id='daily_refresh',
        name='Daily NAV & Metrics Refresh',
        replace_existing=True
    )
    
    logger.info("📅 Scheduler initialized")
    logger.info("⏰ Daily refresh: Weekdays at 6:00 PM IST")
    logger.info(f"📊 Tracking {len(TRACKED_FUNDS)} funds")
    
    try:
        # Optional: Run immediately on startup (for testing)
        logger.info("🔄 Running initial refresh...")
        pipeline.run_daily_refresh(TRACKED_FUNDS)
        
        # Start scheduler
        logger.info("✅ Starting scheduler (Ctrl+C to stop)")
        scheduler.start()
        
    except (KeyboardInterrupt, SystemExit):
        logger.info("Scheduler stopped")
        scheduler.shutdown()


if __name__ == "__main__":
    main()
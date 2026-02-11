"""
Data Ingestion Module
=====================
Fetches NAV data from MFAPI.in with robust error handling and validation.

Design Decisions:
- Retry logic with exponential backoff (handle API flakiness)
- Rate limiting to be respectful to free API
- Batch processing for multiple funds
- Atomic transactions (all-or-nothing per fund)
"""

import requests
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
import time
import logging
from models import DatabaseManager, Fund, NAVHistory, DataIngestionLog

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MFAPIClient:
    """
    Client for MFAPI.in with retry logic and rate limiting
    
    Why separate client class?
    - Encapsulates API-specific logic
    - Easy to mock for testing
    - Centralized retry/timeout configuration
    """
    
    BASE_URL = "https://api.mfapi.in/mf"
    
    def __init__(self, max_retries: int = 3, timeout: int = 30):
        """
        Initialize MFAPI client
        
        Args:
            max_retries: Number of retry attempts for failed requests
            timeout: Request timeout in seconds
        """
        self.max_retries = max_retries
        self.timeout = timeout
        self.session = requests.Session()  # Reuse TCP connections
        
    def fetch_fund_data(self, scheme_code: str) -> Optional[Dict]:
        """
        Fetch complete historical NAV data for a fund
        
        Args:
            scheme_code: MFAPI scheme code (e.g., "119551")
        
        Returns:
            Dict with 'meta' and 'data' keys, or None if failed
        
        API Response Format:
        {
            "meta": {
                "fund_house": "HDFC Mutual Fund",
                "scheme_type": "Open Ended Schemes",
                "scheme_category": "Equity Scheme - Large Cap Fund",
                "scheme_code": "119551",
                "scheme_name": "HDFC Balanced Advantage Fund - Direct Plan - Growth"
            },
            "data": [
                {"date": "09-02-2026", "nav": "450.23"},
                {"date": "08-02-2026", "nav": "449.87"},
                ...
            ]
        }
        """
        url = f"{self.BASE_URL}/{scheme_code}"
        
        for attempt in range(1, self.max_retries + 1):
            try:
                logger.info(f"Fetching {scheme_code} (attempt {attempt}/{self.max_retries})")
                
                response = self.session.get(url, timeout=self.timeout)
                response.raise_for_status()  # Raise exception for 4xx/5xx
                
                data = response.json()
                
                # Validate response structure
                if 'meta' not in data or 'data' not in data:
                    logger.error(f"Invalid response format for {scheme_code}")
                    return None
                
                logger.info(f"✅ Fetched {len(data['data'])} NAV records for {scheme_code}")
                return data
                
            except requests.exceptions.Timeout:
                logger.warning(f"⏱️ Timeout for {scheme_code} (attempt {attempt})")
                
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    logger.error(f"❌ Fund not found: {scheme_code}")
                    return None  # Don't retry 404s
                logger.warning(f"⚠️ HTTP error for {scheme_code}: {e}")
                
            except requests.exceptions.RequestException as e:
                logger.warning(f"⚠️ Network error for {scheme_code}: {e}")
            
            # Exponential backoff: 1s, 2s, 4s
            if attempt < self.max_retries:
                wait_time = 2 ** (attempt - 1)
                logger.info(f"Retrying in {wait_time}s...")
                time.sleep(wait_time)
        
        logger.error(f"❌ Failed to fetch {scheme_code} after {self.max_retries} attempts")
        return None


class DataValidator:
    """
    Validates NAV data for anomalies and data quality issues
    
    Finance-grade validation ensures:
    - No impossible NAV jumps (market manipulation check)
    - No missing data streaks (data quality check)
    - Proper date normalization
    """
    
    @staticmethod
    def parse_indian_date(date_str: str) -> datetime.date:
        """
        Convert Indian date format to ISO date
        
        MFAPI format: "DD-MM-YYYY" (e.g., "09-02-2026")
        Database format: YYYY-MM-DD (ISO 8601)
        
        Why normalize?
        - Consistent sorting
        - Database date indexing
        - Avoids timezone issues
        """
        try:
            return datetime.strptime(date_str, "%d-%m-%Y").date()
        except ValueError as e:
            logger.error(f"Invalid date format: {date_str} - {e}")
            raise
    
    @staticmethod
    def detect_suspicious_nav_jump(prev_nav: float, curr_nav: float) -> Tuple[bool, float]:
        """
        Detect abnormal NAV movements
        
        Why ±30% threshold?
        - Mutual funds are diversified portfolios (not single stocks)
        - Even in extreme crashes (2008, 2020), single-day NAV rarely exceeds ±20%
        - ±30% allows for rare events but flags data errors
        
        Returns:
            (is_suspicious, change_percentage)
        """
        if prev_nav <= 0:
            return False, 0.0
        
        change_pct = ((curr_nav - prev_nav) / prev_nav) * 100
        is_suspicious = abs(change_pct) > 30
        
        if is_suspicious:
            logger.warning(f"🚨 Suspicious NAV jump: {prev_nav} → {curr_nav} ({change_pct:+.2f}%)")
        
        return is_suspicious, change_pct
    
    @staticmethod
    def find_missing_nav_streaks(nav_records: List[Tuple[datetime.date, float]]) -> int:
        """
        Find longest gap in NAV data (in market days)
        
        Why check for gaps?
        - Missing NAV data indicates fund closure, suspension, or data errors
        - CAGR calculations become unreliable with large gaps
        
        Returns:
            Longest gap in calendar days (>3 indicates data quality issue)
        """
        if len(nav_records) < 2:
            return 0
        
        # Sort by date (ascending)
        sorted_records = sorted(nav_records, key=lambda x: x[0])
        
        max_gap = 0
        for i in range(1, len(sorted_records)):
            gap = (sorted_records[i][0] - sorted_records[i-1][0]).days
            max_gap = max(max_gap, gap)
        
        if max_gap > 3:
            logger.warning(f"⚠️ Large NAV gap detected: {max_gap} days")
        
        return max_gap


class DataIngestion:
    """
    Orchestrates the complete data ingestion pipeline
    
    Workflow:
    1. Fetch data from MFAPI
    2. Validate and normalize
    3. Store atomically in database
    4. Log ingestion status
    """
    
    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager
        self.api_client = MFAPIClient()
        self.validator = DataValidator()
    
    def ingest_fund(self, scheme_code: str) -> bool:
        """
        Fetch and store complete NAV history for a fund
        
        Args:
            scheme_code: MFAPI scheme code
        
        Returns:
            True if successful, False otherwise
        
        Transaction semantics:
        - All-or-nothing per fund
        - Rollback on any error
        - Prevents partial data corruption
        """
        log = DataIngestionLog(
            scheme_code=scheme_code,
            started_at=datetime.utcnow()
        )
        
        session = self.db.get_session()
        
        try:
            # Step 1: Fetch from API
            raw_data = self.api_client.fetch_fund_data(scheme_code)
            if not raw_data:
                log.status = 'failed'
                log.error_message = 'API fetch failed'
                session.add(log)
                session.commit()
                return False
            
            log.records_fetched = len(raw_data['data'])
            
            # Step 2: Extract metadata
            meta = raw_data['meta']
            fund = Fund(
                scheme_code=scheme_code,
                fund_name=meta['scheme_name'],
                category=self._extract_category(meta.get('scheme_category', '')),
                amc=meta.get('fund_house', ''),
                is_direct='direct' in meta['scheme_name'].lower(),
                is_growth='growth' in meta['scheme_name'].lower()
            )
            
            # Upsert fund metadata
            existing_fund = session.query(Fund).filter_by(scheme_code=scheme_code).first()
            if existing_fund:
                existing_fund.fund_name = fund.fund_name
                existing_fund.category = fund.category
                existing_fund.updated_at = datetime.utcnow()
            else:
                session.add(fund)
            
            # Step 3: Process NAV data
            nav_records = []
            prev_nav = None
            
            for record in raw_data['data']:
                try:
                    date = self.validator.parse_indian_date(record['date'])
                    nav = float(record['nav'])
                    
                    # Validate NAV jump
                    is_suspicious, change_pct = False, 0.0
                    if prev_nav is not None:
                        is_suspicious, change_pct = self.validator.detect_suspicious_nav_jump(prev_nav, nav)
                    
                    nav_obj = NAVHistory(
                        scheme_code=scheme_code,
                        date=date,
                        nav=nav,
                        is_suspicious=is_suspicious,
                        daily_change_pct=change_pct
                    )
                    nav_records.append(nav_obj)
                    prev_nav = nav
                    
                except (ValueError, KeyError) as e:
                    logger.warning(f"Skipping invalid NAV record: {record} - {e}")
                    continue
            
            # Step 4: Bulk insert NAV data (efficient)
            # Delete existing NAVs for this fund (refresh strategy)
            session.query(NAVHistory).filter_by(scheme_code=scheme_code).delete()
            session.bulk_save_objects(nav_records)
            
            log.records_stored = len(nav_records)
            log.status = 'success'
            
            # Commit transaction
            session.commit()
            logger.info(f"✅ Ingested {len(nav_records)} NAV records for {scheme_code}")
            
            return True
            
        except Exception as e:
            session.rollback()
            log.status = 'failed'
            log.error_message = str(e)[:1000]
            logger.error(f"❌ Ingestion failed for {scheme_code}: {e}", exc_info=True)
            return False
        
        finally:
            log.completed_at = datetime.utcnow()
            session.add(log)
            session.commit()
            session.close()
    
    def ingest_multiple_funds(self, scheme_codes: List[str], delay_seconds: float = 0.5):
        """
        Batch ingest multiple funds with rate limiting
        
        Args:
            scheme_codes: List of MFAPI scheme codes
            delay_seconds: Delay between API calls (be respectful!)
        
        Why delay?
        - Free API has no official rate limit
        - Best practice: ~0.5-1s delay
        - Avoids overwhelming the server
        """
        logger.info(f"🚀 Starting batch ingestion for {len(scheme_codes)} funds")
        
        success_count = 0
        for i, code in enumerate(scheme_codes, 1):
            logger.info(f"[{i}/{len(scheme_codes)}] Processing {code}")
            
            if self.ingest_fund(code):
                success_count += 1
            
            # Rate limiting (skip delay on last item)
            if i < len(scheme_codes):
                time.sleep(delay_seconds)
        
        logger.info(f"✅ Batch ingestion complete: {success_count}/{len(scheme_codes)} successful")
        return success_count
    
    @staticmethod
    def _extract_category(scheme_category: str) -> str:
        """
        Extract simplified category from MFAPI scheme_category
        
        MFAPI format: "Equity Scheme - Large Cap Fund"
        Extracted: "Large Cap"
        """
        category_map = {
            'large cap': 'Large Cap',
            'mid cap': 'Mid Cap',
            'small cap': 'Small Cap',
            'flexi cap': 'Flexi Cap',
            'multi cap': 'Flexi Cap',
            'elss': 'ELSS',
            'debt': 'Debt',
            'hybrid': 'Hybrid',
            'index': 'Index',
            'sectoral': 'Thematic',
            'thematic': 'Thematic',
        }
        
        scheme_lower = scheme_category.lower()
        for key, value in category_map.items():
            if key in scheme_lower:
                return value
        
        return 'Other'


# Example usage
if __name__ == "__main__":
    # Initialize database
    db = DatabaseManager("sqlite:///mutual_funds.db")
    db.create_tables()
    
    # Create ingestion pipeline
    ingestion = DataIngestion(db)
    
    # Example: Popular mutual funds
    SAMPLE_FUNDS = [
        "119551",  # HDFC Balanced Advantage Fund - Direct - Growth
        "122639",  # Parag Parikh Flexi Cap Fund - Direct - Growth
        "120505",  # ICICI Prudential Bluechip Fund - Direct - Growth
        "119598",  # HDFC Mid-Cap Opportunities Fund - Direct - Growth
    ]
    
    # Ingest data
    ingestion.ingest_multiple_funds(SAMPLE_FUNDS)
    
    print("\n✅ Data ingestion complete!")
"""
Calculation Engine
==================
Computes CAGR and other financial metrics with precision and transparency.

Design Decisions:
- Separate calculation logic from storage (testable)
- Explicit flagging of data quality (approx vs historical)
- Category fallbacks for new funds (better UX than null)
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple, List
import logging
from sqlalchemy.orm import Session
from models import NAVHistory, FundMetrics, CAGRType, Fund

logger = logging.getLogger(__name__)


class CAGRCalculator:
    """
    Calculates Compound Annual Growth Rate with data quality assessment
    
    CAGR Formula:
    CAGR = (Ending NAV / Beginning NAV) ^ (1 / Years) - 1
    
    Why CAGR?
    - Smooths out volatility
    - Industry standard for mutual fund performance
    - Comparable across different time periods
    """
    
    # Trading day threshold for "approximate" classification
    MAX_DATE_GAP_DAYS = 10  # If NAV gap > 10 days, mark as "approx"
    
    # Category-based fallback returns (when historical data insufficient)
    # Based on long-term Indian market averages
    CATEGORY_EXPECTED_RETURNS = {
        'Large Cap': 12.0,
        'Mid Cap': 15.0,
        'Small Cap': 18.0,
        'Flexi Cap': 13.0,
        'ELSS': 13.0,
        'Debt': 7.0,
        'Hybrid': 10.0,
        'Index': 11.0,
        'Thematic': 14.0,
        'International': 12.0,
        'Other': 12.0
    }
    
    def __init__(self, session: Session):
        self.session = session
    
    def calculate_cagr(
        self, 
        scheme_code: str, 
        years: int,
        reference_date: Optional[datetime.date] = None
    ) -> Tuple[Optional[float], CAGRType, int]:
        """
        Calculate CAGR for a given time period
        
        Args:
            scheme_code: Fund identifier
            years: Period (1, 3, or 5 years)
            reference_date: Calculate CAGR as of this date (default: today)
        
        Returns:
            (cagr_value, cagr_type, date_gap_days)
            
        Logic:
        1. Get latest NAV (or NAV on reference_date)
        2. Get NAV from 'years' ago (closest available)
        3. Calculate CAGR
        4. Classify as historical/approx/estimated
        
        Examples:
        - Historical: Perfect data, gap < 10 days → CAGR = 12.5%, type = HISTORICAL
        - Approx: Data exists but gap > 10 days → CAGR = 12.3%, type = APPROX
        - Estimated: No data → CAGR = 12.0%, type = ESTIMATED (category average)
        """
        if reference_date is None:
            reference_date = datetime.now().date()
        
        # Step 1: Get ending NAV (closest to reference_date)
        end_nav_record = self._get_nav_on_or_before(scheme_code, reference_date)
        if not end_nav_record:
            logger.warning(f"No NAV data found for {scheme_code}")
            return self._get_estimated_cagr(scheme_code, years)
        
        end_nav = end_nav_record.nav
        end_date = end_nav_record.date
        
        # Step 2: Get starting NAV (years ago)
        target_start_date = end_date - timedelta(days=years * 365)
        start_nav_record = self._get_nav_on_or_before(scheme_code, target_start_date)
        
        if not start_nav_record:
            logger.warning(f"Insufficient history for {years}Y CAGR: {scheme_code}")
            return self._get_estimated_cagr(scheme_code, years)
        
        start_nav = start_nav_record.nav
        start_date = start_nav_record.date
        
        # Step 3: Calculate actual time period (in years)
        actual_days = (end_date - start_date).days
        actual_years = actual_days / 365.25  # Account for leap years
        
        # Sanity check: Ensure we have enough data
        min_required_days = years * 365 - 30  # Allow 30-day tolerance
        if actual_days < min_required_days:
            logger.warning(f"Insufficient data: {actual_days} days (need {min_required_days})")
            return self._get_estimated_cagr(scheme_code, years)
        
        # Step 4: Calculate CAGR
        cagr = (pow(end_nav / start_nav, 1 / actual_years) - 1) * 100
        
        # Step 5: Determine data quality
        date_gap = (target_start_date - start_date).days
        
        if abs(date_gap) <= self.MAX_DATE_GAP_DAYS:
            cagr_type = CAGRType.HISTORICAL
        else:
            cagr_type = CAGRType.APPROX
            logger.info(f"{years}Y CAGR for {scheme_code}: {cagr:.2f}% (approx, gap={date_gap} days)")
        
        return cagr, cagr_type, abs(date_gap)
    
    def _get_nav_on_or_before(self, scheme_code: str, target_date: datetime.date) -> Optional[NAVHistory]:
        """
        Get closest NAV on or before target date
        
        Why "on or before"?
        - Markets closed on weekends/holidays
        - Always use last available NAV
        - Prevents future-looking bias
        """
        return (
            self.session.query(NAVHistory)
            .filter(
                NAVHistory.scheme_code == scheme_code,
                NAVHistory.date <= target_date
            )
            .order_by(NAVHistory.date.desc())
            .first()
        )
    
    def _get_estimated_cagr(self, scheme_code: str, years: int) -> Tuple[float, CAGRType, int]:
        """
        Fallback to category-based expected return
        
        Why provide estimates?
        - Better UX than showing "null" or error
        - New funds need some baseline
        - Must be clearly marked as "estimated"
        
        Compliance Note:
        - Always disclose estimates to users
        - Never mislead with estimated data
        """
        fund = self.session.query(Fund).filter_by(scheme_code=scheme_code).first()
        if not fund:
            return 12.0, CAGRType.ESTIMATED, 0  # Generic fallback
        
        estimated_return = self.CATEGORY_EXPECTED_RETURNS.get(fund.category, 12.0)
        logger.info(f"Using estimated {years}Y CAGR for {scheme_code}: {estimated_return}% ({fund.category})")
        
        return estimated_return, CAGRType.ESTIMATED, 0


class MetricsCalculator:
    """
    Orchestrates calculation of all fund metrics
    
    Workflow:
    1. Calculate CAGR (1Y, 3Y, 5Y)
    2. Assess data quality
    3. Store in fund_metrics table
    """
    
    def __init__(self, session: Session):
        self.session = session
        self.cagr_calc = CAGRCalculator(session)
    
    def calculate_fund_metrics(self, scheme_code: str) -> bool:
        """
        Calculate and store all metrics for a fund
        
        Args:
            scheme_code: Fund identifier
        
        Returns:
            True if successful
        """
        try:
            logger.info(f"Calculating metrics for {scheme_code}")
            
            # Calculate CAGRs
            cagr_1y, type_1y, gap_1y = self.cagr_calc.calculate_cagr(scheme_code, 1)
            cagr_3y, type_3y, gap_3y = self.cagr_calc.calculate_cagr(scheme_code, 3)
            cagr_5y, type_5y, gap_5y = self.cagr_calc.calculate_cagr(scheme_code, 5)
            
            # Calculate data quality metrics
            missing_streak = self._calculate_missing_nav_streak(scheme_code)
            suspicious_count = self._count_suspicious_navs(scheme_code)
            
            # Create or update metrics record
            metrics = self.session.query(FundMetrics).filter_by(scheme_code=scheme_code).first()
            if not metrics:
                metrics = FundMetrics(scheme_code=scheme_code)
                self.session.add(metrics)
            
            # Populate metrics
            metrics.cagr_1y = cagr_1y
            metrics.cagr_1y_type = type_1y
            metrics.cagr_1y_date_gap_days = gap_1y
            metrics.has_sufficient_history_1y = (type_1y != CAGRType.ESTIMATED)
            
            metrics.cagr_3y = cagr_3y
            metrics.cagr_3y_type = type_3y
            metrics.cagr_3y_date_gap_days = gap_3y
            metrics.has_sufficient_history_3y = (type_3y != CAGRType.ESTIMATED)
            
            metrics.cagr_5y = cagr_5y
            metrics.cagr_5y_type = type_5y
            metrics.cagr_5y_date_gap_days = gap_5y
            metrics.has_sufficient_history_5y = (type_5y != CAGRType.ESTIMATED)
            
            metrics.missing_nav_streak_days = missing_streak
            metrics.suspicious_nav_count = suspicious_count
            metrics.last_calculated = datetime.utcnow()
            
            self.session.commit()
            
            logger.info(f"✅ Metrics calculated: 1Y={cagr_1y:.2f}%, 3Y={cagr_3y:.2f}%, 5Y={cagr_5y:.2f}%")
            return True
            
        except Exception as e:
            self.session.rollback()
            logger.error(f"❌ Failed to calculate metrics for {scheme_code}: {e}", exc_info=True)
            return False
    
    def calculate_all_fund_metrics(self) -> int:
        """
        Calculate metrics for all funds in database
        
        Returns:
            Number of funds successfully processed
        """
        funds = self.session.query(Fund).all()
        logger.info(f"Calculating metrics for {len(funds)} funds")
        
        success_count = 0
        for fund in funds:
            if self.calculate_fund_metrics(fund.scheme_code):
                success_count += 1
        
        logger.info(f"✅ Metrics calculation complete: {success_count}/{len(funds)} successful")
        return success_count
    
    def _calculate_missing_nav_streak(self, scheme_code: str) -> int:
        """
        Find longest gap in NAV data
        
        Returns:
            Maximum consecutive days without NAV (0 if no gaps)
        """
        nav_records = (
            self.session.query(NAVHistory.date)
            .filter(NAVHistory.scheme_code == scheme_code)
            .order_by(NAVHistory.date)
            .all()
        )
        
        if len(nav_records) < 2:
            return 0
        
        max_gap = 0
        for i in range(1, len(nav_records)):
            gap = (nav_records[i][0] - nav_records[i-1][0]).days
            max_gap = max(max_gap, gap)
        
        return max_gap
    
    def _count_suspicious_navs(self, scheme_code: str) -> int:
        """
        Count NAV records flagged as suspicious
        
        Returns:
            Number of suspicious NAV jumps
        """
        return (
            self.session.query(NAVHistory)
            .filter(
                NAVHistory.scheme_code == scheme_code,
                NAVHistory.is_suspicious == True
            )
            .count()
        )


# Example usage
if __name__ == "__main__":
    from models import DatabaseManager
    
    # Initialize database
    db = DatabaseManager("sqlite:///mutual_funds.db")
    session = db.get_session()
    
    # Calculate metrics
    calculator = MetricsCalculator(session)
    calculator.calculate_all_fund_metrics()
    
    # Query example
    metrics = session.query(FundMetrics).first()
    if metrics:
        print(f"\n📊 Sample Metrics for {metrics.scheme_code}")
        print(f"1Y CAGR: {metrics.cagr_1y:.2f}% ({metrics.cagr_1y_type.value})")
        print(f"3Y CAGR: {metrics.cagr_3y:.2f}% ({metrics.cagr_3y_type.value})")
        print(f"5Y CAGR: {metrics.cagr_5y:.2f}% ({metrics.cagr_5y_type.value})")
        print(f"Data Quality: {metrics.suspicious_nav_count} suspicious NAVs")
    
    session.close()
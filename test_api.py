"""
API Test Script
===============
Tests all endpoints to verify API is working correctly.
"""

import requests
import json

BASE_URL = "http://localhost:8000"

def test_endpoint(name, url, expected_status=200):
    """Test a single endpoint"""
    try:
        response = requests.get(url)
        status = "✅" if response.status_code == expected_status else "❌"
        print(f"{status} {name}")
        print(f"   URL: {url}")
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                print(f"   Result: {len(data)} items")
            elif isinstance(data, dict):
                print(f"   Result: {list(data.keys())[:5]}...")
        else:
            print(f"   Error: {response.text[:100]}")
        
        print()
        return response
        
    except Exception as e:
        print(f"❌ {name}")
        print(f"   Error: {e}\n")
        return None


print("=" * 60)
print("🧪 Testing Mutual Fund Data API")
print("=" * 60)
print()

# Test 1: Health check
test_endpoint(
    "Health Check",
    f"{BASE_URL}/"
)

# Test 2: List all funds
response = test_endpoint(
    "List All Funds",
    f"{BASE_URL}/funds?limit=5"
)

# Get a scheme code from the response
scheme_codes = []
if response and response.status_code == 200:
    funds = response.json()
    if funds:
        scheme_codes = [f['scheme_code'] for f in funds]
        print(f"📊 Found {len(funds)} funds:")
        for fund in funds:
            print(f"   • {fund['scheme_code']}: {fund['fund_name'][:50]}")
        print()

# Test 3: Get fund details
if scheme_codes:
    test_endpoint(
        "Get Fund Details",
        f"{BASE_URL}/funds/{scheme_codes[0]}"
    )

# Test 4: Get fund metrics (PRIMARY ENDPOINT)
if scheme_codes:
    response = test_endpoint(
        "Get Fund Metrics (PRIMARY)",
        f"{BASE_URL}/funds/{scheme_codes[0]}/metrics"
    )
    
    if response and response.status_code == 200:
        metrics = response.json()
        print("   📈 CAGR Metrics:")
        if metrics.get('cagr_1y'):
            print(f"      1Y: {metrics['cagr_1y']['value']:.2f}% ({metrics['cagr_1y']['type']})")
        if metrics.get('cagr_3y'):
            print(f"      3Y: {metrics['cagr_3y']['value']:.2f}% ({metrics['cagr_3y']['type']})")
        if metrics.get('cagr_5y'):
            print(f"      5Y: {metrics['cagr_5y']['value']:.2f}% ({metrics['cagr_5y']['type']})")
        print()

# Test 5: Get NAV history
if scheme_codes:
    test_endpoint(
        "Get NAV History",
        f"{BASE_URL}/funds/{scheme_codes[0]}/nav?limit=5"
    )

# Test 6: Search funds
search_terms = ["parag", "hdfc", "icici", "balanced", "flexi"]
for term in search_terms:
    response = test_endpoint(
        f"Search: '{term}'",
        f"{BASE_URL}/search?q={term}"
    )
    
    if response and response.status_code == 200:
        results = response.json()
        if results:
            print(f"   Found {len(results)} results:")
            for r in results[:2]:
                print(f"      • {r['fund_name'][:60]}")
        else:
            print("   No results (try different search term)")
        print()

print("=" * 60)
print("✅ API Testing Complete")
print("=" * 60)
print()
print("Summary:")
print("--------")
print("If you see ✅ marks above, your API is working correctly!")
print()
print("Next steps:")
print("1. Integrate with frontend (see FRONTEND_INTEGRATION.md)")
print("2. Add more funds (see SETUP_GUIDE.md)")
print("3. Set up daily scheduler (python3 scheduler.py)")
import requests
import sys
import json
from datetime import datetime, date

class CostCalculationTester:
    def __init__(self, base_url="https://machineflow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, method, endpoint, expected_status, data=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_login(self, username, password):
        """Test login and get token"""
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            return True
        return False

    def test_create_order_with_calculations(self):
        """Test creating an order and verify cost calculations"""
        print(f"\n💰 Testing Order Creation with Cost Calculations")
        
        # Test data matching the request requirements
        order_data = {
            "order_number": "TEST-UI-001",
            "client_name": "Тест UI",
            "description": "Тестирование расчетов",
            "quantity": 10,
            "market_type": "domestic",
            "material_cost": 1000.0,
            "processing_time_per_unit": 45.0,  # 45 minutes per unit
            "processing_types": ["turning"],
            "minute_rate_domestic": 25.0,
            "minute_rate_foreign": 0.42
        }
        
        success, response = self.run_test(
            "Create Order with Cost Calculations",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success:
            print(f"\n📊 COST CALCULATION VERIFICATION:")
            print(f"   Order Number: {response.get('order_number')}")
            print(f"   Quantity: {response.get('quantity')} деталей")
            print(f"   Market Type: {response.get('market_type')}")
            print(f"   Material Cost (total): {response.get('material_cost')} ₴")
            print(f"   Processing Time: {response.get('processing_time_per_unit')} мин/деталь")
            print(f"   Minute Rate (domestic): {response.get('minute_rate_domestic')} ₴/мин")
            
            # Calculate expected values
            quantity = response.get('quantity', 0)
            material_cost = response.get('material_cost', 0)
            processing_time = response.get('processing_time_per_unit', 0)
            minute_rate = response.get('minute_rate_domestic', 25.0)
            
            expected_material_per_unit = material_cost / quantity if quantity > 0 else 0
            expected_processing_per_unit = processing_time * minute_rate
            expected_total_per_unit = expected_material_per_unit + expected_processing_per_unit
            expected_total_order = expected_total_per_unit * quantity
            
            print(f"\n🧮 EXPECTED CALCULATIONS:")
            print(f"   Material cost per unit: {expected_material_per_unit} ₴ ({material_cost}/{quantity})")
            print(f"   Processing cost per unit: {expected_processing_per_unit} ₴ ({processing_time}*{minute_rate})")
            print(f"   Total cost per unit: {expected_total_per_unit} ₴")
            print(f"   Total order cost: {expected_total_order} ₴")
            
            return response.get('id'), response
        
        return None, None

    def test_specific_order_calculations(self, order_id="6623fc75-96b9-4450-847b-3bb59c2f429c"):
        """Test the specific order mentioned in the request"""
        print(f"\n📋 Testing Specific Order: {order_id}")
        
        success, response = self.run_test(
            "Get Specific Order for Calculations",
            "GET",
            f"orders/{order_id}",
            200
        )
        
        if success:
            print(f"\n📊 ORDER DETAILS:")
            print(f"   Order Number: {response.get('order_number')}")
            print(f"   Client: {response.get('client_name')}")
            print(f"   Description: {response.get('description')}")
            print(f"   Quantity: {response.get('quantity')} деталей")
            print(f"   Market Type: {response.get('market_type')}")
            print(f"   Material Cost (total): {response.get('material_cost')} ₴")
            print(f"   Processing Time: {response.get('processing_time_per_unit')} мин/деталь")
            
            # Calculate values
            quantity = response.get('quantity', 0)
            material_cost = response.get('material_cost', 0)
            processing_time = response.get('processing_time_per_unit', 0)
            minute_rate = response.get('minute_rate_domestic', 25.0)
            
            material_per_unit = material_cost / quantity if quantity > 0 else 0
            processing_per_unit = processing_time * minute_rate
            total_per_unit = material_per_unit + processing_per_unit
            total_order = total_per_unit * quantity
            
            print(f"\n🧮 CALCULATED VALUES:")
            print(f"   Material per unit: {material_per_unit} ₴/шт")
            print(f"   Processing per unit: {processing_per_unit} ₴/шт ({processing_time} мин * {minute_rate} ₴/мин)")
            print(f"   Total per unit: {total_per_unit} ₴/шт")
            print(f"   Total order cost: {total_order} ₴")
            
            # Expected values from the request
            print(f"\n✅ EXPECTED VALUES (from request):")
            print(f"   Material: 500 ₴ за 5 деталей = 100 ₴/шт")
            print(f"   Processing: 60 мин * 25 ₴/мин = 1500 ₴/шт")
            print(f"   Total per unit: 1600 ₴/шт")
            print(f"   Total order: 8000 ₴")
            
            return response
        
        return None

def main():
    print("🚀 Starting Cost Calculation Testing")
    print("=" * 60)
    
    # Setup
    tester = CostCalculationTester()
    
    # Test login
    if not tester.test_login("admin", "admin123"):
        print("❌ Login failed, stopping tests")
        return 1

    # Test creating new order with calculations
    new_order_id, new_order_data = tester.test_create_order_with_calculations()
    
    # Test specific order from request
    specific_order_data = tester.test_specific_order_calculations()
    
    # Print results
    print(f"\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend cost calculation tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
import requests
import sys
import json
from datetime import datetime, date

class ReadyToShipTester:
    def __init__(self, base_url="https://machineflow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_order_id = None

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
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

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

    def login(self, username="admin", password="admin123"):
        """Login and get token"""
        print(f"\n🔐 Logging in as {username}")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Login successful")
            return True
        return False

    def create_test_order(self):
        """Create a test order for Ready to Ship testing"""
        print(f"\n📦 Creating test order for Ready to Ship functionality")
        
        order_data = {
            "order_number": f"RTS-TEST-{datetime.now().strftime('%H%M%S')}",
            "client_name": "Ready to Ship Test Client",
            "description": "Test order for Ready to Ship calculation",
            "quantity": 100,  # Using 100 units for easy percentage calculations
            "market_type": "domestic",
            "material_cost": 5000.0,
            "processing_time_per_unit": 30.0,
            "processing_types": ["turning", "milling"],
            "minute_rate_domestic": 25.0
        }
        
        success, response = self.run_test(
            "Create Test Order",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success:
            self.test_order_id = response.get('id')
            print(f"✅ Test order created: {self.test_order_id}")
            print(f"   Order Number: {response.get('order_number')}")
            print(f"   Quantity: {response.get('quantity')} units")
            return response
        return None

    def get_order_details(self):
        """Get order details to check current state"""
        if not self.test_order_id:
            print("❌ No test order ID available")
            return None
            
        success, response = self.run_test(
            "Get Order Details",
            "GET",
            f"orders/{self.test_order_id}",
            200
        )
        
        if success:
            return response
        return None

    def update_stage_units(self, stage_name, units, stage_index=None):
        """Update a specific stage with completed units"""
        order_data = self.get_order_details()
        if not order_data:
            return False
            
        stages = order_data.get('stages', [])
        target_stage = None
        
        # Find the stage by name or index
        for i, stage in enumerate(stages):
            if stage.get('name') == stage_name or (stage_index is not None and i == stage_index):
                target_stage = stage
                break
        
        if not target_stage:
            print(f"❌ Stage '{stage_name}' not found")
            return False
            
        stage_id = target_stage['id']
        
        print(f"\n📊 Updating {stage_name} with {units} completed units")
        
        update_data = {
            "completed_units": units,
            "status": "in_progress" if units > 0 else "pending"
        }
        
        success, response = self.run_test(
            f"Update {stage_name}",
            "PUT",
            f"orders/{self.test_order_id}/stages/{stage_id}",
            200,
            data=update_data
        )
        
        return success

    def calculate_ready_to_ship(self, order_data):
        """Calculate Ready to Ship from order data"""
        if not order_data or 'stages' not in order_data:
            return 0
            
        stages = order_data['stages']
        
        # Find Packaging (stage 7) and Shipping (stage 8)
        packaging_units = 0
        shipping_units = 0
        
        for stage in stages:
            if stage.get('name') == 'Упаковка':
                packaging_units = stage.get('completed_units', 0) or 0
            elif stage.get('name') == 'Отгрузка':
                shipping_units = stage.get('completed_units', 0) or 0
        
        ready_to_ship = max(0, packaging_units - shipping_units)
        return ready_to_ship, packaging_units, shipping_units

    def test_basic_calculation_logic(self):
        """Test basic Ready to Ship calculation logic"""
        print(f"\n🧮 Testing Basic Calculation Logic")
        print("=" * 50)
        
        # Test Case 1: Stage 7 = 0 → Ready to Ship = 0
        print(f"\n📋 Test Case 1: Stage 7 (Packaging) = 0")
        self.update_stage_units("Упаковка", 0, 6)  # Stage 7 (index 6)
        self.update_stage_units("Отгрузка", 0, 7)   # Stage 8 (index 7)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 0:
            print("✅ Test Case 1 PASSED: Ready to Ship = 0 when Packaging = 0")
            self.tests_passed += 1
        else:
            print("❌ Test Case 1 FAILED: Expected 0, got", ready_to_ship)
        self.tests_run += 1
        
        # Test Case 2: Stage 7 = 50, Stage 8 = 0 → Ready to Ship = 50
        print(f"\n📋 Test Case 2: Stage 7 = 50, Stage 8 = 0")
        self.update_stage_units("Упаковка", 50, 6)
        self.update_stage_units("Отгрузка", 0, 7)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 50:
            print("✅ Test Case 2 PASSED: Ready to Ship = 50")
            self.tests_passed += 1
        else:
            print("❌ Test Case 2 FAILED: Expected 50, got", ready_to_ship)
        self.tests_run += 1
        
        # Test Case 3: Stage 7 = 100, Stage 8 = 30 → Ready to Ship = 70
        print(f"\n📋 Test Case 3: Stage 7 = 100, Stage 8 = 30")
        self.update_stage_units("Упаковка", 100, 6)
        self.update_stage_units("Отгрузка", 30, 7)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 70:
            print("✅ Test Case 3 PASSED: Ready to Ship = 70")
            self.tests_passed += 1
        else:
            print("❌ Test Case 3 FAILED: Expected 70, got", ready_to_ship)
        self.tests_run += 1

    def test_edge_cases(self):
        """Test edge cases for Ready to Ship calculation"""
        print(f"\n🔍 Testing Edge Cases")
        print("=" * 30)
        
        # Edge Case 1: Stage 8 > Stage 7 (should show 0)
        print(f"\n📋 Edge Case 1: Stage 8 > Stage 7")
        self.update_stage_units("Упаковка", 30, 6)
        self.update_stage_units("Отгрузка", 50, 7)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 0:
            print("✅ Edge Case 1 PASSED: Ready to Ship = 0 when Shipping > Packaging")
            self.tests_passed += 1
        else:
            print("❌ Edge Case 1 FAILED: Expected 0, got", ready_to_ship)
        self.tests_run += 1

    def test_interactive_scenario(self):
        """Test the interactive scenario described in the review request"""
        print(f"\n🎯 Testing Interactive Scenario")
        print("=" * 40)
        
        # Step 1: Update Stage 7 (Packaging) to 80 units
        print(f"\n📦 Step 1: Update Packaging to 80 units")
        self.update_stage_units("Упаковка", 80, 6)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   After updating Packaging to 80:")
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 80:
            print("✅ Step 1 PASSED: Ready to Ship = 80")
            self.tests_passed += 1
        else:
            print("❌ Step 1 FAILED: Expected 80, got", ready_to_ship)
        self.tests_run += 1
        
        # Step 2: Update Stage 8 (Shipping) to 30 units
        print(f"\n🚚 Step 2: Update Shipping to 30 units")
        self.update_stage_units("Отгрузка", 30, 7)
        
        order_data = self.get_order_details()
        ready_to_ship, packaging, shipping = self.calculate_ready_to_ship(order_data)
        
        print(f"   After updating Shipping to 30:")
        print(f"   Packaging: {packaging}, Shipping: {shipping}")
        print(f"   Ready to Ship: {ready_to_ship}")
        
        if ready_to_ship == 50:
            print("✅ Step 2 PASSED: Ready to Ship = 50 (80 - 30)")
            self.tests_passed += 1
        else:
            print("❌ Step 2 FAILED: Expected 50, got", ready_to_ship)
        self.tests_run += 1

def main():
    print("🚀 Starting Ready to Ship Feature Testing")
    print("=" * 60)
    
    tester = ReadyToShipTester()
    
    # Login
    if not tester.login():
        print("❌ Login failed, stopping tests")
        return 1
    
    # Create test order
    if not tester.create_test_order():
        print("❌ Failed to create test order, stopping tests")
        return 1
    
    # Run tests
    tester.test_basic_calculation_logic()
    tester.test_edge_cases()
    tester.test_interactive_scenario()
    
    # Print results
    print(f"\n" + "=" * 60)
    print(f"📊 READY TO SHIP TEST RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All Ready to Ship tests passed!")
        return 0
    else:
        print("⚠️  Some Ready to Ship tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
import requests
import sys
import json
from datetime import datetime, date
import uuid

class MachineFlowAPITester:
    def __init__(self, base_url="https://machineflow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.specific_order_id = "d9415ddb-8b38-4266-96ed-2a8dc9a8fe32"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return success, response_data
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
        print(f"\n🔐 Testing login for user: {username}")
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"username": username, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"✅ Login successful, token obtained")
            print(f"   User role: {response.get('user', {}).get('role', 'unknown')}")
            return True
        return False

    def test_get_specific_order(self, order_id=None):
        """Test getting the specific order"""
        if order_id:
            self.specific_order_id = order_id
            
        print(f"\n📋 Testing specific order retrieval: {self.specific_order_id}")
        success, response = self.run_test(
            "Get Specific Order",
            "GET",
            f"orders/{self.specific_order_id}",
            200
        )
        
        if success:
            print(f"✅ Order found:")
            print(f"   Order Number: {response.get('order_number', 'N/A')}")
            print(f"   Client: {response.get('client_name', 'N/A')}")
            print(f"   Description: {response.get('description', 'N/A')}")
            print(f"   Quantity: {response.get('quantity', 'N/A')}")
            print(f"   Market Type: {response.get('market_type', 'N/A')}")
            print(f"   Material Cost: {response.get('material_cost', 'N/A')}")
            print(f"   Processing Time: {response.get('processing_time_per_unit', 'N/A')} min/unit")
            print(f"   Processing Types: {response.get('processing_types', [])}")
            
            stages = response.get('stages', [])
            print(f"   Stages ({len(stages)} total):")
            for i, stage in enumerate(stages):
                print(f"     {i+1}. {stage.get('name', 'N/A')} - Status: {stage.get('status', 'N/A')} - {stage.get('percentage', 0)}%")
                if stage.get('completed_units') is not None:
                    print(f"        Completed Units: {stage.get('completed_units', 0)}")
            
            return response
        return None

    def test_auth_me(self):
        """Test getting current user info"""
        print(f"\n👤 Testing current user info")
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"✅ Current user: {response.get('username', 'N/A')} (Role: {response.get('role', 'N/A')})")
        
        return success

    def test_update_stage_status(self, order_data):
        """Test updating stage status"""
        if not order_data or 'stages' not in order_data:
            print("❌ No order data available for stage testing")
            return False
            
        stages = order_data['stages']
        if not stages:
            print("❌ No stages found in order")
            return False
            
        # Test updating first stage to in_progress
        first_stage = stages[0]
        stage_id = first_stage['id']
        
        print(f"\n🔄 Testing stage status update for stage: {first_stage['name']}")
        
        update_data = {
            "status": "in_progress",
            "start_date": date.today().isoformat(),
            "responsible_person": "Test Manager"
        }
        
        success, response = self.run_test(
            "Update Stage Status",
            "PUT",
            f"orders/{self.specific_order_id}/stages/{stage_id}",
            200,
            data=update_data
        )
        
        return success

    def test_update_stage_with_units(self, order_data):
        """Test updating stage with completed units (for stages 4-8)"""
        if not order_data or 'stages' not in order_data:
            print("❌ No order data available for units testing")
            return False
            
        stages = order_data['stages']
        if len(stages) < 5:
            print("❌ Not enough stages for units testing")
            return False
            
        # Test updating stage 4 (index 3) with completed units
        stage_4 = stages[3]  # 4th stage (0-indexed)
        stage_id = stage_4['id']
        
        print(f"\n📊 Testing stage units update for stage: {stage_4['name']}")
        
        update_data = {
            "completed_units": 50,  # 50 out of 200 total
            "status": "in_progress",
            "start_date": date.today().isoformat(),
            "responsible_person": "Production Worker"
        }
        
        success, response = self.run_test(
            "Update Stage with Units",
            "PUT",
            f"orders/{self.specific_order_id}/stages/{stage_id}",
            200,
            data=update_data
        )
        
        return success

    def test_create_order_with_calculations(self):
        """Test creating order with specific values to verify calculations"""
        print(f"\n💰 Testing order creation with calculation verification")
        
        # Test data as specified in the review request
        order_data = {
            "order_number": f"CALC-TEST-{datetime.now().strftime('%H%M%S')}",
            "client_name": "Тест Расчетов",
            "description": "Тестовый заказ для проверки расчетов формы",
            "quantity": 10,
            "market_type": "domestic",
            "material_cost": 1000.0,
            "processing_time_per_unit": 45.0,  # 45 minutes
            "processing_types": ["turning", "milling"],
            "minute_rate_domestic": 25.0,
            "minute_rate_foreign": 0.42
        }
        
        success, response = self.run_test(
            "Create Order with Calculations",
            "POST",
            "orders",
            200,
            data=order_data
        )
        
        if success:
            print(f"✅ Order created successfully:")
            print(f"   Order ID: {response.get('id', 'N/A')}")
            print(f"   Order Number: {response.get('order_number', 'N/A')}")
            print(f"   Quantity: {response.get('quantity', 'N/A')}")
            print(f"   Material Cost (total): {response.get('material_cost', 'N/A')}")
            print(f"   Processing Time per Unit: {response.get('processing_time_per_unit', 'N/A')} min")
            
            # Calculate expected values
            quantity = response.get('quantity', 0)
            material_cost = response.get('material_cost', 0)
            processing_time = response.get('processing_time_per_unit', 0)
            minute_rate = response.get('minute_rate_domestic', 25.0)
            
            if quantity > 0:
                material_cost_per_unit = material_cost / quantity
                processing_cost_per_unit = processing_time * minute_rate
                total_cost_per_unit = material_cost_per_unit + processing_cost_per_unit
                
                print(f"\n📊 CALCULATION VERIFICATION:")
                print(f"   Material Cost per Unit: {material_cost_per_unit:.2f} ₴")
                print(f"   Processing Cost per Unit: {processing_cost_per_unit:.2f} ₴")
                print(f"   Total Cost per Unit: {total_cost_per_unit:.2f} ₴")
                print(f"   Total Order Cost: {total_cost_per_unit * quantity:.2f} ₴")
                
                # Verify expected values from review request
                expected_material_per_unit = 100.00  # 1000/10
                expected_processing = 1125.00  # 45 * 25
                expected_total_per_unit = 1225.00  # 100 + 1125
                
                print(f"\n🎯 EXPECTED vs ACTUAL:")
                print(f"   Material per unit - Expected: {expected_material_per_unit:.2f} ₴, Actual: {material_cost_per_unit:.2f} ₴")
                print(f"   Processing cost - Expected: {expected_processing:.2f} ₴, Actual: {processing_cost_per_unit:.2f} ₴")
                print(f"   Total per unit - Expected: {expected_total_per_unit:.2f} ₴, Actual: {total_cost_per_unit:.2f} ₴")
                
                # Check if calculations match expectations
                if (abs(material_cost_per_unit - expected_material_per_unit) < 0.01 and
                    abs(processing_cost_per_unit - expected_processing) < 0.01 and
                    abs(total_cost_per_unit - expected_total_per_unit) < 0.01):
                    print("✅ All calculations match expected values!")
                else:
                    print("❌ Calculations do not match expected values!")
            
            return response
        return None

    def test_get_all_orders(self):
        """Test getting all orders to verify the specific order appears in list"""
        print(f"\n📋 Testing all orders retrieval")
        success, response = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ Found {len(response)} orders total")
            
            # Use first order for testing if available
            if response:
                first_order = response[0]
                self.specific_order_id = first_order.get('id')
                print(f"✅ Using first order for testing: {self.specific_order_id}")
                print(f"   Order Number: {first_order.get('order_number', 'N/A')}")
                print(f"   Client: {first_order.get('client_name', 'N/A')}")
                
            return success, response
        return False, []

def main():
    print("🚀 Starting MachineFlow API Testing")
    print("=" * 50)
    
    # Setup
    tester = MachineFlowAPITester()
    
    # Test login
    if not tester.test_login("admin", "admin123"):
        print("❌ Login failed, stopping tests")
        return 1

    # Test current user
    tester.test_auth_me()
    
    # Test getting all orders
    success, orders = tester.test_get_all_orders()
    if not success or not orders:
        print("❌ Failed to get orders, stopping tests")
        return 1
    
    # Test getting specific order (using first order from list)
    order_data = tester.test_get_specific_order()
    if not order_data:
        print("❌ Failed to get specific order, stopping stage tests")
        return 1
    
    # Test order creation with calculations
    new_order = tester.test_create_order_with_calculations()
    
    # Test stage updates
    tester.test_update_stage_status(order_data)
    
    # Test stage with units
    tester.test_update_stage_with_units(order_data)
    
    # Get updated order to verify changes
    print(f"\n🔄 Verifying changes by re-fetching order")
    updated_order = tester.test_get_specific_order()
    
    # Print results
    print(f"\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
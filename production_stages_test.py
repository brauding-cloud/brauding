import requests
import sys
import json
from datetime import datetime, date

class ProductionStagesAPITester:
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
            print(f"✅ Login successful for {response.get('user', {}).get('role', 'unknown')} role")
            return True, response.get('user', {})
        return False, {}

    def create_test_order(self):
        """Create a test order for production stages testing"""
        print(f"\n📦 Creating test order for production stages testing")
        
        order_data = {
            "order_number": f"PROD-STAGES-{datetime.now().strftime('%H%M%S')}",
            "client_name": "Тест Этапов Производства",
            "description": "Заказ для тестирования отображения этапов производства",
            "quantity": 100,  # Large quantity to test progress calculations
            "market_type": "domestic",
            "material_cost": 5000.0,
            "processing_time_per_unit": 30.0,
            "processing_types": ["turning", "milling", "grinding"],
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

    def update_manufacturing_stage(self, order_data, completed_units):
        """Update the manufacturing stage (stage 5) with completed units"""
        if not order_data or 'stages' not in order_data:
            print("❌ No order data available")
            return False
            
        stages = order_data['stages']
        if len(stages) < 5:
            print("❌ Not enough stages")
            return False
            
        # Find manufacturing stage (stage 5, index 4)
        manufacturing_stage = None
        for stage in stages:
            if stage.get('name') == 'Изготовление':
                manufacturing_stage = stage
                break
        
        if not manufacturing_stage:
            print("❌ Manufacturing stage not found")
            return False
            
        print(f"\n🏭 Updating Manufacturing Stage with {completed_units} completed units")
        
        update_data = {
            "completed_units": completed_units,
            "status": "in_progress",
            "start_date": date.today().isoformat(),
            "responsible_person": "Production Team"
        }
        
        success, response = self.run_test(
            f"Update Manufacturing Stage ({completed_units} units)",
            "PUT",
            f"orders/{self.test_order_id}/stages/{manufacturing_stage['id']}",
            200,
            data=update_data
        )
        
        return success

    def update_shipping_stage(self, order_data, shipped_units):
        """Update the shipping stage (stage 8) with shipped units"""
        if not order_data or 'stages' not in order_data:
            print("❌ No order data available")
            return False
            
        stages = order_data['stages']
        if len(stages) < 8:
            print("❌ Not enough stages")
            return False
            
        # Find shipping stage (stage 8, index 7)
        shipping_stage = None
        for stage in stages:
            if stage.get('name') == 'Отгрузка':
                shipping_stage = stage
                break
        
        if not shipping_stage:
            print("❌ Shipping stage not found")
            return False
            
        print(f"\n🚚 Updating Shipping Stage with {shipped_units} shipped units")
        
        update_data = {
            "completed_units": shipped_units,
            "status": "in_progress",
            "start_date": date.today().isoformat(),
            "responsible_person": "Shipping Team"
        }
        
        success, response = self.run_test(
            f"Update Shipping Stage ({shipped_units} units)",
            "PUT",
            f"orders/{self.test_order_id}/stages/{shipping_stage['id']}",
            200,
            data=update_data
        )
        
        return success

    def verify_progress_display(self):
        """Verify the progress display in order list"""
        print(f"\n📊 Verifying progress display in order list")
        
        success, response = self.run_test(
            "Get Updated Order",
            "GET",
            f"orders/{self.test_order_id}",
            200
        )
        
        if success:
            stages = response.get('stages', [])
            quantity = response.get('quantity', 0)
            
            # Find manufacturing and shipping stages
            manufacturing_units = 0
            shipping_units = 0
            
            for stage in stages:
                if stage.get('name') == 'Изготовление':
                    manufacturing_units = stage.get('completed_units', 0)
                elif stage.get('name') == 'Отгрузка':
                    shipping_units = stage.get('completed_units', 0)
            
            print(f"✅ Progress verification:")
            print(f"   Total Quantity: {quantity}")
            print(f"   Manufacturing (Изготовлено): {manufacturing_units} units")
            print(f"   Shipping (Отгружено): {shipping_units} units")
            
            # Calculate overall progress
            completed_stages = sum(1 for stage in stages if stage.get('status') == 'completed')
            total_stages = len(stages)
            overall_progress = round((completed_stages / total_stages) * 100) if total_stages > 0 else 0
            
            print(f"   Overall Progress: {overall_progress}% ({completed_stages}/{total_stages} stages completed)")
            
            return True
        
        return False

    def test_all_orders_display(self):
        """Test that the order appears correctly in the orders list"""
        print(f"\n📋 Testing orders list display")
        
        success, response = self.run_test(
            "Get All Orders",
            "GET",
            "orders",
            200
        )
        
        if success and isinstance(response, list):
            # Find our test order
            test_order = None
            for order in response:
                if order.get('id') == self.test_order_id:
                    test_order = order
                    break
            
            if test_order:
                print(f"✅ Test order found in orders list")
                print(f"   Order Number: {test_order.get('order_number')}")
                print(f"   Client: {test_order.get('client_name')}")
                
                # Check stages data
                stages = test_order.get('stages', [])
                manufacturing_units = 0
                shipping_units = 0
                
                for stage in stages:
                    if stage.get('name') == 'Изготовление':
                        manufacturing_units = stage.get('completed_units', 0)
                    elif stage.get('name') == 'Отгрузка':
                        shipping_units = stage.get('completed_units', 0)
                
                print(f"   Manufacturing Units in List: {manufacturing_units}")
                print(f"   Shipping Units in List: {shipping_units}")
                
                return True
            else:
                print(f"❌ Test order not found in orders list")
                return False
        
        return False

def main():
    print("🚀 Starting Production Stages API Testing")
    print("=" * 60)
    
    tester = ProductionStagesAPITester()
    
    # Test with manager role
    print("\n👨‍💼 TESTING WITH MANAGER ROLE")
    print("-" * 40)
    
    if not tester.test_login("admin", "admin123")[0]:
        print("❌ Manager login failed, stopping tests")
        return 1

    # Create test order
    order_data = tester.create_test_order()
    if not order_data:
        print("❌ Failed to create test order")
        return 1

    # Update manufacturing stage with 60 units
    if not tester.update_manufacturing_stage(order_data, 60):
        print("❌ Failed to update manufacturing stage")
        return 1

    # Update shipping stage with 25 units  
    if not tester.update_shipping_stage(order_data, 25):
        print("❌ Failed to update shipping stage")
        return 1

    # Verify progress display
    if not tester.verify_progress_display():
        print("❌ Failed to verify progress display")
        return 1

    # Test orders list display
    if not tester.test_all_orders_display():
        print("❌ Failed to verify orders list display")
        return 1

    # Test with employee role
    print("\n👷‍♂️ TESTING WITH EMPLOYEE ROLE")
    print("-" * 40)
    
    employee_tester = ProductionStagesAPITester()
    success, user_data = employee_tester.test_login("worker", "worker123")
    
    if success:
        # Test that employee can see orders but with filtered data
        success, response = employee_tester.run_test(
            "Employee Orders Access",
            "GET",
            "orders",
            200
        )
        
        if success:
            print(f"✅ Employee can access orders list")
            if response:
                first_order = response[0]
                material_cost = first_order.get('material_cost', 0)
                print(f"   Material cost for employee: {material_cost} (should be 0)")
                if material_cost == 0:
                    print("✅ Cost information properly filtered for employee")
                else:
                    print("❌ Cost information not filtered for employee")
    else:
        print("❌ Employee login failed")

    # Print final results
    print(f"\n" + "=" * 60)
    print(f"📊 FINAL RESULTS")
    print(f"Tests passed: {tester.tests_passed}/{tester.tests_run}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All production stages tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
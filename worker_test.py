import requests
import sys

class WorkerLoginTester:
    def __init__(self, base_url="https://machineflow.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None

    def test_worker_login(self):
        """Test worker login"""
        print("🔐 Testing worker login...")
        
        try:
            response = requests.post(f"{self.api_url}/auth/login", json={
                "username": "worker",
                "password": "worker123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access_token')
                user = data.get('user', {})
                print(f"✅ Worker login successful")
                print(f"   Username: {user.get('username')}")
                print(f"   Role: {user.get('role')}")
                return True
            else:
                print(f"❌ Worker login failed: {response.status_code}")
                print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Worker login error: {str(e)}")
            return False

    def test_worker_orders_access(self):
        """Test worker access to orders (should have limited data)"""
        if not self.token:
            print("❌ No token available for worker orders test")
            return False
            
        print("\n📋 Testing worker orders access...")
        
        try:
            headers = {'Authorization': f'Bearer {self.token}'}
            response = requests.get(f"{self.api_url}/orders", headers=headers)
            
            if response.status_code == 200:
                orders = response.json()
                print(f"✅ Worker can access orders: {len(orders)} orders found")
                
                if orders:
                    first_order = orders[0]
                    # Check if sensitive data is filtered for workers
                    material_cost = first_order.get('material_cost', 0)
                    files = first_order.get('files', [])
                    
                    print(f"   Material cost (should be 0 for workers): {material_cost}")
                    print(f"   Files count (should be 0 for workers): {len(files)}")
                    
                    if material_cost == 0 and len(files) == 0:
                        print("✅ Worker data filtering working correctly")
                        return True
                    else:
                        print("⚠️  Worker data filtering may not be working properly")
                        return False
                else:
                    print("✅ Worker orders access working (no orders to check filtering)")
                    return True
            else:
                print(f"❌ Worker orders access failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Worker orders access error: {str(e)}")
            return False

def main():
    print("🔧 Testing Worker Login and Access")
    print("=" * 40)
    
    tester = WorkerLoginTester()
    
    # Test worker login
    if not tester.test_worker_login():
        return 1
    
    # Test worker orders access
    if not tester.test_worker_orders_access():
        return 1
    
    print("\n✅ All worker tests passed!")
    return 0

if __name__ == "__main__":
    sys.exit(main())
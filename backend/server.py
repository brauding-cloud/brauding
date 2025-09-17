from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, date
import jwt
import hashlib
from enum import Enum
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')

# Security
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    MANAGER = "manager"
    EMPLOYEE = "employee"

class MarketType(str, Enum):
    DOMESTIC = "domestic"
    FOREIGN = "foreign"

class StageStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"

class ProcessingType(str, Enum):
    TURNING = "turning"
    MILLING = "milling"
    TURN_MILLING = "turn_milling"
    GRINDING = "grinding"
    HEAT_TREATMENT = "heat_treatment"
    SANDBLASTING = "sandblasting"
    GALVANIZING = "galvanizing"
    LOCKSMITH = "locksmith"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    role: UserRole
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    username: str
    password: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    user: User

class ProductionStage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    status: StageStatus = StageStatus.PENDING
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    percentage: int = 0  # процент выполнения 0-100
    completed_units: Optional[int] = None  # количество обработанных деталей (для этапов 4-8)
    notes: Optional[str] = None
    responsible_person: Optional[str] = None

class FileInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    file_path: str
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str
    client_name: str
    description: str
    quantity: int
    market_type: MarketType
    material_cost: float
    processing_time_per_unit: float  # в минутах
    processing_types: List[ProcessingType] = []  # список типов обработки
    minute_rate_domestic: float = 25.0  # гривен за минуту
    minute_rate_foreign: float = 0.42  # долларов за минуту
    files: List[FileInfo] = []
    stages: List[ProductionStage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str

    @property
    def processing_cost_per_unit(self) -> float:
        rate = self.minute_rate_domestic if self.market_type == MarketType.DOMESTIC else self.minute_rate_foreign
        return self.processing_time_per_unit * rate

    @property
    def material_cost_per_unit(self) -> float:
        return self.material_cost / self.quantity if self.quantity > 0 else 0

    @property
    def total_cost_per_unit(self) -> float:
        return self.material_cost_per_unit + self.processing_cost_per_unit

    @property
    def total_order_cost(self) -> float:
        return self.total_cost_per_unit * self.quantity

class OrderCreate(BaseModel):
    order_number: str
    client_name: str
    description: str
    quantity: int
    market_type: MarketType
    material_cost: float
    processing_time_per_unit: float
    processing_types: List[ProcessingType] = []
    minute_rate_domestic: Optional[float] = 25.0
    minute_rate_foreign: Optional[float] = 0.42

class OrderUpdate(BaseModel):
    client_name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    market_type: Optional[MarketType] = None
    material_cost: Optional[float] = None
    processing_time_per_unit: Optional[float] = None
    processing_types: Optional[List[ProcessingType]] = None
    minute_rate_domestic: Optional[float] = None
    minute_rate_foreign: Optional[float] = None

class StageUpdate(BaseModel):
    status: Optional[StageStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    percentage: Optional[int] = None
    completed_units: Optional[int] = None
    notes: Optional[str] = None
    responsible_person: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_access_token(user_id: str, username: str, role: str) -> str:
    payload = {
        'user_id': user_id,
        'username': username,
        'role': role,
        'exp': datetime.utcnow().timestamp() + 86400  # 24 hours
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=['HS256'])
        user_data = await db.users.find_one({'id': payload['user_id']})
        if not user_data:
            raise HTTPException(status_code=401, detail="User not found")
        return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def prepare_for_mongo(data):
    """Convert dates to ISO strings for MongoDB storage"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if isinstance(value, date):
                result[key] = value.isoformat()
            elif isinstance(value, list):
                result[key] = [prepare_for_mongo(item) for item in value]
            elif isinstance(value, dict):
                result[key] = prepare_for_mongo(value)
            else:
                result[key] = value
        return result
    return data

def parse_from_mongo(data):
    """Parse dates from MongoDB"""
    if isinstance(data, dict):
        result = {}
        for key, value in data.items():
            if key in ['start_date', 'end_date'] and isinstance(value, str):
                try:
                    result[key] = datetime.fromisoformat(value).date()
                except ValueError:
                    result[key] = value
            elif isinstance(value, list):
                result[key] = [parse_from_mongo(item) for item in value]
            elif isinstance(value, dict):
                result[key] = parse_from_mongo(value)
            else:
                result[key] = value
        return result
    return data

# Initialize default stages
def create_default_stages() -> List[ProductionStage]:
    stages_config = [
        {"name": "Получение заказа на оценку", "has_units": False},
        {"name": "Поиск материала", "has_units": False}, 
        {"name": "Покупка материала + доставка", "has_units": False},
        {"name": "Подготовка материала (порезка/торцовка)", "has_units": True},
        {"name": "Изготовление", "has_units": True},
        {"name": "Проверка ОТК", "has_units": True},
        {"name": "Упаковка", "has_units": True},
        {"name": "Отгрузка", "has_units": True}
    ]
    
    stages = []
    for config in stages_config:
        stage = ProductionStage(name=config["name"])
        if config["has_units"]:
            stage.completed_units = 0
        stages.append(stage)
    
    return stages

# Routes
@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(username=user_data.username, role=user_data.role)
    user_dict = user.dict()
    user_dict['password'] = hashed_password
    
    await db.users.insert_one(user_dict)
    return user

@api_router.post("/auth/login", response_model=LoginResponse)
async def login_user(login_data: UserLogin):
    user_data = await db.users.find_one({"username": login_data.username})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    hashed_password = hash_password(login_data.password)
    if user_data['password'] != hashed_password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_data)
    token = create_access_token(user.id, user.username, user.role)
    
    return LoginResponse(access_token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    order = Order(
        **order_data.dict(),
        created_by=current_user.id,
        stages=create_default_stages()
    )
    
    order_dict = prepare_for_mongo(order.dict())
    await db.orders.insert_one(order_dict)
    return order

@api_router.get("/orders", response_model=List[Order])
async def get_orders(current_user: User = Depends(get_current_user)):
    orders = await db.orders.find().to_list(1000)
    result = []
    for order_data in orders:
        parsed_order = parse_from_mongo(order_data)
        order = Order(**parsed_order)
        
        # Filter sensitive data for employees
        if current_user.role == UserRole.EMPLOYEE:
            # Remove cost information
            order_dict = order.dict()
            order_dict['material_cost'] = 0
            order_dict['hourly_rate_domestic'] = 0
            order_dict['hourly_rate_foreign'] = 0
            # Remove files for employees
            order_dict['files'] = []
            order = Order(**order_dict)
        
        result.append(order)
    return result

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, current_user: User = Depends(get_current_user)):
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    parsed_order = parse_from_mongo(order_data)
    order = Order(**parsed_order)
    
    # Filter sensitive data for employees
    if current_user.role == UserRole.EMPLOYEE:
        order_dict = order.dict()
        order_dict['material_cost'] = 0
        order_dict['hourly_rate_domestic'] = 0
        order_dict['hourly_rate_foreign'] = 0
        order_dict['files'] = []
        order = Order(**order_dict)
    
    return order

@api_router.put("/orders/{order_id}", response_model=Order)
async def update_order(
    order_id: str,
    order_update: OrderUpdate,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can update orders")
    
    update_data = {k: v for k, v in order_update.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    parsed_order = parse_from_mongo(order_data)
    return Order(**parsed_order)

def calculate_stage_percentage(stage_index: int, stage: dict, total_quantity: int, is_completed: bool = False) -> int:
    """Рассчитывает процент выполнения этапа по новой логике"""
    # Этапы 1-3: только 0% или 100%
    if stage_index < 3:
        return 100 if is_completed else 0
    
    # Этапы 4-8: рассчитываются по количеству деталей
    completed_units = stage.get('completed_units', 0) or 0
    if total_quantity > 0:
        return min(100, round((completed_units / total_quantity) * 100))
    return 0

def update_previous_stages_with_units(stages: list, current_stage_index: int, total_quantity: int, current_stage_date: str = None):
    """Обновляет предыдущие этапы при изменении количества в текущем этапе"""
    # Работает только для этапов 4-8 (индексы 3-7)
    if current_stage_index < 3:
        return
    
    current_stage = stages[current_stage_index]
    current_units = current_stage.get('completed_units', 0) or 0
    
    # Если количество больше 0, обновляем все предыдущие этапы с количеством (этапы 4-текущий)
    if current_units > 0:
        for i in range(3, current_stage_index):  # От этапа 4 до текущего (не включая)
            if i < len(stages):
                prev_stage = stages[i]
                prev_units = prev_stage.get('completed_units', 0) or 0
                
                # Обновляем количество только если текущее количество больше
                if current_units > prev_units:
                    prev_stage['completed_units'] = current_units
                    prev_stage['percentage'] = calculate_stage_percentage(i, prev_stage, total_quantity)
                    
                    # Автоматически переводим в статус "в работе" если было "ожидает"
                    if prev_stage.get('status') == 'pending':
                        prev_stage['status'] = 'in_progress'
                    
                    # Проставляем дату начала автоматически, если она не была установлена вручную
                    if not prev_stage.get('start_date') and current_stage_date:
                        prev_stage['start_date'] = current_stage_date

def update_previous_status_stages(stages: list, current_stage_index: int, current_stage_status: str, current_stage_dates: dict):
    """Обновляет предыдущие этапы (1-3) при завершении текущего этапа"""
    # Работает только для первых 3 этапов (индексы 0-2)
    if current_stage_index >= 3 or current_stage_status != 'completed':
        return
    
    # Получаем даты текущего этапа
    current_end_date = current_stage_dates.get('end_date')
    current_start_date = current_stage_dates.get('start_date')
    
    # Автоматически завершаем все предыдущие этапы
    for i in range(current_stage_index):  # От этапа 0 до текущего (не включая)
        if i < len(stages):
            prev_stage = stages[i]
            
            # Завершаем этап, если он еще не завершен
            if prev_stage.get('status') != 'completed':
                prev_stage['status'] = 'completed'
                prev_stage['percentage'] = 100
                
                # Проставляем даты только если они не были установлены вручную
                if not prev_stage.get('start_date'):
                    prev_stage['start_date'] = current_start_date or current_end_date
                
                if not prev_stage.get('end_date'):
                    prev_stage['end_date'] = current_end_date

@api_router.put("/orders/{order_id}/stages/{stage_id}")
async def update_stage(
    order_id: str,
    stage_id: str,
    stage_update: StageUpdate,
    current_user: User = Depends(get_current_user)
):
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    stages = order_data.get('stages', [])
    stage_found = False
    stage_index = -1
    
    # Найти и обновить этап
    for i, stage in enumerate(stages):
        if stage['id'] == stage_id:
            stage_found = True
            stage_index = i
            update_data = {k: v for k, v in stage_update.dict().items() if v is not None}
            
            # Обновляем поля этапа
            for key, value in update_data.items():
                if isinstance(value, date):
                    stage[key] = value.isoformat()
                else:
                    stage[key] = value
            
            # Рассчитываем процент выполнения
            is_completed = stage.get('status') == 'completed'
            total_quantity = order_data.get('quantity', 1)
            
            # Для этапов 1-3: только проверяем статус
            if stage_index < 3:
                stage['percentage'] = calculate_stage_percentage(stage_index, stage, total_quantity, is_completed)
            else:
                # Для этапов 4-8: рассчитываем по количеству деталей
                stage['percentage'] = calculate_stage_percentage(stage_index, stage, total_quantity)
                
                # Автоматически переводим в статус "в работе" если внесено количество и статус был "ожидает"
                current_units = stage.get('completed_units', 0) or 0
                if current_units > 0:
                    if stage.get('status') == 'pending':
                        stage['status'] = 'in_progress'
                    
                    # Проставляем дату начала автоматически, если она не была установлена
                    if not stage.get('start_date'):
                        stage['start_date'] = date.today().isoformat()
            
            break
    
    if not stage_found:
        raise HTTPException(status_code=404, detail="Stage not found")
    
    # Обновляем предыдущие этапы
    if stage_index < 3:
        # Для первых 3 этапов: завершаем предыдущие этапы при завершении текущего
        stage_data = stages[stage_index]
        update_previous_status_stages(stages, stage_index, stage_data.get('status'), {
            'start_date': stage_data.get('start_date'),
            'end_date': stage_data.get('end_date')
        })
    else:
        # Для этапов 4-8: обновляем количество в предыдущих этапах
        current_stage_data = stages[stage_index]
        current_date = current_stage_data.get('start_date')
        update_previous_stages_with_units(stages, stage_index, order_data.get('quantity', 1), current_date)
    
    await db.orders.update_one({"id": order_id}, {"$set": {"stages": stages}})
    return {"message": "Stage updated successfully"}

@api_router.post("/orders/{order_id}/files")
async def upload_file(
    order_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can upload files")
    
    # Check if order exists
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_extension = Path(file.filename).suffix
    unique_filename = f"{file_id}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    # Create file info
    file_info = FileInfo(
        id=file_id,
        filename=unique_filename,
        original_filename=file.filename,
        file_path=str(file_path)
    )
    
    # Add file to order
    await db.orders.update_one(
        {"id": order_id},
        {"$push": {"files": file_info.dict()}}
    )
    
    return {"message": "File uploaded successfully", "file_id": file_id}

@api_router.get("/orders/{order_id}/files/{file_id}")
async def download_file(
    order_id: str,
    file_id: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can download files")
    
    order_data = await db.orders.find_one({"id": order_id})
    if not order_data:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Find file
    file_info = None
    for file_data in order_data.get('files', []):
        if file_data['id'] == file_id:
            file_info = file_data
            break
    
    if not file_info:
        raise HTTPException(status_code=404, detail="File not found")
    
    file_path = Path(file_info['file_path'])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File does not exist on disk")
    
    return FileResponse(
        path=file_path,
        filename=file_info['original_filename'],
        media_type='application/octet-stream'
    )

@api_router.delete("/orders/{order_id}")
async def delete_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Only managers can delete orders")
    
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {"message": "Order deleted successfully"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Plus, 
  Package, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  BarChart3,
  FileText,
  LogOut,
  Factory
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const { user, logout } = useAuth();

  const processingTypeLabels = {
    'turning': 'Токарная',
    'milling': 'Фрезерная',
    'turn_milling': 'Токарно-фрезерная',
    'grinding': 'Шлифовка',
    'heat_treatment': 'Термообработка',
    'sandblasting': 'Пескоструй',
    'galvanizing': 'Гальваника',
    'locksmith': 'Слесарная обработка'
  };

  const getProcessingTypesText = (types) => {
    if (!types || types.length === 0) return 'Не указано';
    return types.map(type => processingTypeLabels[type] || type).join(', ');
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      setOrders(response.data);
      calculateStats(response.data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (ordersData) => {
    const stats = {
      total: ordersData ? ordersData.length : 0,
      pending: 0,
      inProgress: 0,
      completed: 0
    };

    if (ordersData && Array.isArray(ordersData)) {
      ordersData.forEach(order => {
        if (order && order.stages && Array.isArray(order.stages)) {
          const completedStages = order.stages.filter(stage => stage && stage.status === 'completed').length;
          const totalStages = order.stages.length;
          
          if (completedStages === 0) {
            stats.pending++;
          } else if (completedStages === totalStages) {
            stats.completed++;
          } else {
            stats.inProgress++;
          }
        }
      });
    }

    setStats(stats);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'Ожидает', variant: 'secondary' },
      in_progress: { label: 'В работе', variant: 'default' },
      completed: { label: 'Завершен', variant: 'success' },
      delayed: { label: 'Просрочен', variant: 'destructive' }
    };
    
    return statusMap[status] || { label: status, variant: 'secondary' };
  };

  const getOrderProgress = (order) => {
    if (!order || !order.stages || !Array.isArray(order.stages) || order.stages.length === 0) {
      return 0;
    }
    const completedStages = order.stages.filter(stage => stage && stage.status === 'completed').length;
    return Math.round((completedStages / order.stages.length) * 100);
  };

  const getManufacturingDetails = (order) => {
    if (!order || !order.stages || !Array.isArray(order.stages)) {
      return { completedUnits: 0, totalQuantity: 0 };
    }
    
    // Ищем этап "Изготовление" (обычно 5й этап, индекс 4)
    const manufacturingStage = order.stages.find(stage => 
      stage && (stage.name === 'Изготовление' || stage.stage_order === 5)
    );
    
    return {
      completedUnits: manufacturingStage?.completed_units || 0,
      totalQuantity: order.quantity || 0
    };
  };

  const getShippingDetails = (order) => {
    if (!order || !order.stages || !Array.isArray(order.stages)) {
      return { shippedUnits: 0, totalQuantity: 0 };
    }
    
    // Ищем этап "Отгрузка" (8й этап, индекс 7)
    const shippingStage = order.stages.find(stage => 
      stage && (stage.name === 'Отгрузка' || stage.stage_order === 8)
    );
    
    return {
      shippedUnits: shippingStage?.completed_units || 0,
      totalQuantity: order.quantity || 0
    };
  };

  const getReadyToShipDetails = (order) => {
    if (!order || !order.stages || !Array.isArray(order.stages)) {
      return { readyToShip: 0 };
    }
    
    // Ищем этап "Упаковка" (7й этап, индекс 6)
    const packagingStage = order.stages.find(stage => 
      stage && (stage.name === 'Упаковка' || stage.stage_order === 7)
    );
    
    // Ищем этап "Отгрузка" (8й этап, индекс 7)
    const shippingStage = order.stages.find(stage => 
      stage && (stage.name === 'Отгрузка' || stage.stage_order === 8)
    );
    
    const packaged = packagingStage?.completed_units || 0;
    const shipped = shippingStage?.completed_units || 0;
    
    // Готово к отгрузке = Упаковано - Отгружено
    const readyToShip = Math.max(0, packaged - shipped);
    
    return {
      readyToShip: readyToShip
    };
  };

  const calculateTotalCost = (order) => {
    if (!order || !order.quantity) return 0;
    
    const materialCostPerUnit = (order.material_cost || 0) / order.quantity;
    const processingTime = order.processing_time_per_unit || 0;
    
    const minuteRate = order.market_type === 'domestic' 
      ? (order.minute_rate_domestic || 25) 
      : (order.minute_rate_foreign || 0.42);
    
    const processingCostPerUnit = processingTime * minuteRate;
    const totalCostPerUnit = materialCostPerUnit + processingCostPerUnit;
    
    return totalCostPerUnit * order.quantity;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                <Factory className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Система Учета Производства
                </h1>
                <p className="text-sm text-slate-600">
                  Добро пожаловать, {user?.username} ({user?.role === 'manager' ? 'Менеджер' : 'Сотрудник'})
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link to="/gantt">
                <Button variant="outline" size="sm">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Диаграмма Ганта
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Всего заказов</p>
                  <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
                <Package className="w-8 h-8 text-emerald-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Ожидают</p>
                  <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-amber-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">В работе</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.inProgress}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Завершено</p>
                  <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
            </Card>
          </div>

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">Заказы</h2>
            {user?.role === 'manager' && (
              <Link to="/orders/new">
                <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Новый заказ
                </Button>
              </Link>
            )}
          </div>

          <div className="grid gap-6">
            {orders.length === 0 ? (
              <Card className="p-12 text-center">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">
                  Заказов пока нет
                </h3>
                <p className="text-slate-500 mb-4">
                  Создайте первый заказ для начала работы с системой
                </p>
                {user?.role === 'manager' && (
                  <Link to="/orders/new">
                    <Button className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Создать заказ
                    </Button>
                  </Link>
                )}
              </Card>
            ) : (
              orders.filter(order => order && order.id).map((order) => (
                <Card key={`order-${order.id}`} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-800">
                          Заказ #{order.order_number}
                        </h3>
                        <Badge variant={order.market_type === 'domestic' ? 'default' : 'secondary'}>
                          {order.market_type === 'domestic' ? 'Внутренний' : 'Зарубежный'}
                        </Badge>
                      </div>
                      <p className="text-slate-600 mb-1">
                        <strong>Клиент:</strong> {order.client_name}
                      </p>
                      <p className="text-slate-600 mb-1">
                        <strong>Описание:</strong> {order.description}
                      </p>
                      <p className="text-slate-600 mb-1">
                        <strong>Количество:</strong> {order.quantity} шт.
                      </p>
                      <p className="text-slate-600 mb-3">
                        <strong>Типы обработки:</strong> {getProcessingTypesText(order.processing_types)}
                      </p>
                      
                      {user?.role === 'manager' && (
                        <div className="text-sm text-slate-600 space-y-1">
                          <p><strong>Стоимость материала:</strong> {(order.material_cost || 0).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                          <p><strong>Время обработки:</strong> {order.processing_time_per_unit || 0} мин/шт</p>
                          <p><strong>Общая стоимость:</strong> {calculateTotalCost(order).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      <div className="mb-2">
                        {/* Верхняя строка с заголовками */}
                        <div className="flex items-center justify-end gap-4 mb-1">
                          {(() => {
                            const manufacturing = getManufacturingDetails(order);
                            return manufacturing.completedUnits > 0 ? (
                              <div className="text-sm text-slate-600 text-center w-24">Изготовлено</div>
                            ) : null;
                          })()}
                          <div className="text-sm text-slate-600 text-center w-24">Готово к отгрузке</div>
                          <div className="text-sm text-slate-600 text-center w-24">Отгружено</div>
                        </div>
                        
                        {/* Основная строка с цифрами */}
                        <div className="flex items-center justify-end gap-4 mb-3">
                          {(() => {
                            const manufacturing = getManufacturingDetails(order);
                            return manufacturing.completedUnits > 0 ? (
                              <div className="text-3xl font-bold text-emerald-600 text-center w-24">
                                {manufacturing.completedUnits}
                              </div>
                            ) : null;
                          })()}
                          <div className="text-3xl font-bold text-orange-600 text-center w-24">
                            {getReadyToShipDetails(order).readyToShip}
                          </div>
                          <div className="text-3xl font-bold text-blue-600 text-center w-24">
                            {getShippingDetails(order).shippedUnits}
                          </div>
                        </div>
                        
                        {/* Нижняя строка с "Прогресс" */}
                        <div className="flex items-center justify-end gap-4">
                          {(() => {
                            const manufacturing = getManufacturingDetails(order);
                            return manufacturing.completedUnits > 0 ? (
                              <div className="w-24"></div>
                            ) : null;
                          })()}
                          <div className="w-24"></div>
                          <div className="text-center w-24">
                            <div className="text-sm text-slate-600 mb-1">Прогресс</div>
                            <div className="text-2xl font-bold text-emerald-600">
                              {getOrderProgress(order)}%
                            </div>
                          </div>
                        </div>
                      </div>
                      <Link to={`/orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          Подробнее
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex flex-wrap gap-2">
                      {order.stages && Array.isArray(order.stages) && order.stages.slice(0, 4).map((stage, index) => (
                        stage && stage.id ? (
                          <Badge
                            key={`${order.id}-${stage.id}-${index}`}
                            variant={getStatusBadge(stage.status).variant}
                            className="text-xs"
                          >
                            {stage.name}
                          </Badge>
                        ) : null
                      ))}
                      {order.stages && order.stages.length > 4 && (
                        <Badge key={`${order.id}-more-stages`} variant="outline" className="text-xs">
                          +{order.stages.length - 4} этапов
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
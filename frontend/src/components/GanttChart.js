import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { ArrowLeft, BarChart3, Calendar, ExternalLink } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GanttChart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timelineRange, setTimelineRange] = useState({ start: null, end: null });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`${API}/orders`);
      console.log('Gantt Chart - Orders fetched:', response.data);
      setOrders(response.data || []);
      calculateTimelineRange(response.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateTimelineRange = (ordersData) => {
    let earliestDate = null;
    let latestDate = null;

    try {
      ordersData.forEach(order => {
        if (order.stages && Array.isArray(order.stages)) {
          order.stages.forEach(stage => {
            const dates = [stage.start_date, stage.end_date]
              .filter(date => date && date !== null && date !== '')
              .map(date => {
                try {
                  return new Date(date);
                } catch (e) {
                  return null;
                }
              })
              .filter(date => date && !isNaN(date.getTime()));

            dates.forEach(date => {
              if (!earliestDate || date < earliestDate) {
                earliestDate = date;
              }
              if (!latestDate || date > latestDate) {
                latestDate = date;
              }
            });
          });
        }
      });
    } catch (error) {
      console.error('Error calculating timeline range:', error);
    }

    // Если нет дат, устанавливаем диапазон на месяц от сегодня
    if (!earliestDate || !latestDate) {
      const today = new Date();
      earliestDate = new Date(today.getFullYear(), today.getMonth(), 1);
      latestDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    } else {
      // Добавляем немного отступа
      try {
        earliestDate.setDate(earliestDate.getDate() - 7);
        latestDate.setDate(latestDate.getDate() + 7);
      } catch (error) {
        console.error('Error setting date range:', error);
      }
    }

    setTimelineRange({ start: earliestDate, end: latestDate });
  };

  const getDatePosition = (date) => {
    try {
      if (!date || !timelineRange.start || !timelineRange.end) return 0;
      
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) return 0;
      
      const totalDays = (timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24);
      const daysFromStart = (dateObj - timelineRange.start) / (1000 * 60 * 60 * 24);
      
      if (totalDays <= 0) return 0;
      
      return Math.max(0, Math.min(100, (daysFromStart / totalDays) * 100));
    } catch (error) {
      console.error('Error calculating date position:', error);
      return 0;
    }
  };

  const getDateWidth = (startDate, endDate) => {
    try {
      if (!startDate || !endDate) return 0;
      
      const startPos = getDatePosition(startDate);
      const endPos = getDatePosition(endDate);
      
      return Math.max(2, endPos - startPos);
    } catch (error) {
      console.error('Error calculating date width:', error);
      return 0;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-400',
      in_progress: 'bg-blue-500',
      completed: 'bg-emerald-500',
      delayed: 'bg-red-500'
    };
    return colors[status] || 'bg-slate-400';
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

  const generateTimelineMarkers = () => {
    try {
      if (!timelineRange.start || !timelineRange.end) return [];
      
      const markers = [];
      const totalDays = (timelineRange.end - timelineRange.start) / (1000 * 60 * 60 * 24);
      
      if (totalDays <= 0 || isNaN(totalDays)) return [];
      
      const step = Math.max(1, Math.ceil(totalDays / 10)); // Показываем примерно 10 маркеров
      
      for (let i = 0; i <= totalDays; i += step) {
        const date = new Date(timelineRange.start);
        date.setDate(date.getDate() + i);
        
        if (!isNaN(date.getTime())) {
          markers.push({
            position: (i / totalDays) * 100,
            date: date.toLocaleDateString('ru-RU', { 
              day: '2-digit', 
              month: '2-digit' 
            })
          });
        }
      }
      
      return markers;
    } catch (error) {
      console.error('Error generating timeline markers:', error);
      return [];
    }
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
          <div className="flex items-center py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад
            </Button>
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
              <h1 className="text-xl font-bold text-slate-800">
                Диаграмма Ганта
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {orders.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">
              Нет заказов для отображения
            </h3>
            <p className="text-slate-500 mb-4">
              Создайте заказы для просмотра диаграммы Ганта
            </p>
            <Link to="/orders/new">
              <Button>Создать заказ</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.filter(order => order && order.id).map((order) => (
              <Card key={`gantt-order-${order.id}`} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Заказ #{order.order_number}
                    </h3>
                    <Badge variant={order.market_type === 'domestic' ? 'default' : 'secondary'}>
                      {order.market_type === 'domestic' ? 'Внутренний' : 'Зарубежный'}
                    </Badge>
                  </div>
                  <Link to={`/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Подробнее
                    </Button>
                  </Link>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-slate-600 mb-1">
                    <strong>Клиент:</strong> {order.client_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Описание:</strong> {order.description}
                  </p>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {/* Timeline markers */}
                  <div className="relative h-8 mb-2 border-b border-slate-200">
                    {generateTimelineMarkers().map((marker, index) => (
                      <div
                        key={index}
                        className="absolute top-0 h-full border-l border-slate-300"
                        style={{ left: `${marker.position}%` }}
                      >
                        <span className="absolute top-0 -translate-x-1/2 text-xs text-slate-500 mt-1">
                          {marker.date}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Stages */}
                  <div className="space-y-2">
                    {order.stages && Array.isArray(order.stages) && order.stages.map((stage, index) => (
                      stage && stage.id ? (
                        <div key={`${order.id}-${stage.id}-${index}`} className="relative">
                          <div className="flex items-center h-8">
                            <div className="w-48 pr-4 text-sm font-medium text-slate-700 truncate">
                              {index + 1}. {stage.name}
                            </div>
                            
                            <div className="flex-1 relative h-6 bg-slate-200 rounded">
                              {/* Progress bar */}
                              <div
                                className={`absolute top-0 left-0 h-full rounded transition-all ${getStatusColor(stage.status)}`}
                                style={{
                                  width: `${stage.percentage || 0}%`
                                }}
                                title={`${stage.name}: ${stage.percentage || 0}%`}
                              />
                              {/* Percentage text */}
                              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-slate-700">
                                {stage.percentage || 0}%
                              </div>
                            </div>
                            
                            <div className="w-24 pl-4">
                              <Badge 
                                variant={getStatusBadge(stage.status).variant}
                                className="text-xs"
                              >
                                {getStatusBadge(stage.status).label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <Card className="p-4 mt-6">
          <h4 className="font-medium text-slate-800 mb-3">Легенда</h4>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-amber-400 rounded"></div>
              <span className="text-sm text-slate-600">Ожидает</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-sm text-slate-600">В работе</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-emerald-500 rounded"></div>
              <span className="text-sm text-slate-600">Завершен</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-sm text-slate-600">Просрочен</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
};

export default GanttChart;
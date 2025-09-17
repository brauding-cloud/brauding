import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import ErrorBoundary from './ErrorBoundary';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
// Удаленные импорты для решения проблемы removeChild
import { 
  ArrowLeft, 
  Upload, 
  Download, 
  Edit, 
  Save, 
  X,
  Package,
  FileText,
  Clock,
  User,
  DollarSign
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingStage, setEditingStage] = useState(null);
  const [stageData, setStageData] = useState({});
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderData, setOrderData] = useState({});

  // Функция для безопасного обновления этапа без полной перезагрузки
  const updateStageInOrder = (stageId, updatedStageData) => {
    setOrder(prevOrder => {
      if (!prevOrder || !prevOrder.stages) return prevOrder;
      
      const updatedStages = prevOrder.stages.map(stage => {
        if (stage && stage.id === stageId) {
          return { ...stage, ...updatedStageData };
        }
        return stage;
      });
      
      return {
        ...prevOrder,
        stages: updatedStages
      };
    });
  };

  const processingTypeOptions = [
    { value: 'turning', label: 'Токарная' },
    { value: 'milling', label: 'Фрезерная' },
    { value: 'turn_milling', label: 'Токарно-фрезерная' },
    { value: 'grinding', label: 'Шлифовка' },
    { value: 'heat_treatment', label: 'Термообработка' },
    { value: 'sandblasting', label: 'Пескоструй' },
    { value: 'galvanizing', label: 'Гальваника' },
    { value: 'locksmith', label: 'Слесарная обработка' }
  ];

  const getProcessingTypeLabel = (type) => {
    const option = processingTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadOrder = async () => {
      if (isMounted) {
        await fetchOrder();
      }
    };
    
    loadOrder();
    
    return () => {
      isMounted = false;
    };
  }, [id]);

  const fetchOrder = async () => {
    let isMounted = true;
    
    try {
      const response = await axios.get(`${API}/orders/${id}`);
      const orderData = response.data;
      
      // Проверяем корректность данных перед обновлением состояния
      if (orderData && orderData.id && isMounted) {
        setOrder(orderData);
      } else if (!isMounted) {
        return; // Component unmounted, don't update state
      } else {
        throw new Error('Invalid order data received');
      }
    } catch (error) {
      console.error('Failed to fetch order:', error);
      if (isMounted) {
        navigate('/');
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
    
    return () => {
      isMounted = false;
    };
  };

  const handleStageEdit = (stage) => {
    setEditingStage(stage.id);
    setStageData({
      status: stage.status,
      start_date: stage.start_date || '',
      end_date: stage.end_date || '',
      percentage: stage.percentage || 0,
      completed_units: stage.completed_units || '',
      notes: stage.notes || '',
      responsible_person: stage.responsible_person || ''
    });
  };

  const handleOrderEdit = () => {
    setEditingOrder(true);
    setOrderData({
      client_name: order.client_name,
      description: order.description,
      quantity: order.quantity,
      market_type: order.market_type,
      material_cost: order.material_cost,
      processing_time_per_unit: order.processing_time_per_unit,
      processing_types: order.processing_types || [],
      minute_rate_domestic: order.minute_rate_domestic,
      minute_rate_foreign: order.minute_rate_foreign
    });
  };

  const handleOrderSave = async () => {
    try {
      const response = await axios.put(`${API}/orders/${id}`, orderData);
      console.log('Order update response:', response.data);
      
      // Обновляем состояние напрямую вместо повторного запроса
      if (response.data) {
        setOrder(prevOrder => ({
          ...prevOrder,
          ...response.data
        }));
      }
      
      setEditingOrder(false);
    } catch (error) {
      console.error('Failed to update order:', error);
      alert('Ошибка при обновлении заказа: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleOrderDelete = async () => {
    if (window.confirm('Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.')) {
      try {
        await axios.delete(`${API}/orders/${id}`);
        navigate('/');
      } catch (error) {
        console.error('Failed to delete order:', error);
        alert('Ошибка при удалении заказа: ' + (error.response?.data?.detail || error.message));
      }
    }
  };

  const handleProcessingTypeToggle = (type) => {
    setOrderData(prev => ({
      ...prev,
      processing_types: (prev.processing_types || []).includes(type)
        ? prev.processing_types.filter(t => t !== type)
        : [...(prev.processing_types || []), type]
    }));
  };

  const handleStageSave = async () => {
    if (!editingStage || !order || !order.stages) {
      console.error('Invalid state for stage save');
      return;
    }

    try {
      // Подготовим данные для отправки
      const updateData = { ...stageData };
      
      // Определяем индекс текущего этапа
      const currentStageIndex = order.stages.findIndex(s => s && s.id === editingStage);
      
      if (currentStageIndex === -1) {
        console.error('Stage not found');
        return;
      }
      
      // Автоматическое проставление дат для первых 3 этапов (индексы 0-2)
      if (currentStageIndex < 3) {
        const today = new Date().toISOString().split('T')[0]; // Текущая дата в формате YYYY-MM-DD
        
        // Если статус "в работе" и дата начала не установлена
        if (updateData.status === 'in_progress' && !updateData.start_date) {
          updateData.start_date = today;
        }
        
        // Если статус "завершен"
        if (updateData.status === 'completed') {
          // Проставляем дату начала, если не установлена
          if (!updateData.start_date) {
            updateData.start_date = today;
          }
          // Проставляем дату окончания, если не установлена
          if (!updateData.end_date) {
            updateData.end_date = today;
          }
        }
      }
      
      // Убираем пустые строки
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === '') {
          updateData[key] = null;
        }
      });

      console.log('Sending stage update:', updateData);
      
      const response = await axios.put(`${API}/orders/${id}/stages/${editingStage}`, updateData);
      console.log('Stage update response:', response.data);
      
      setEditingStage(null);
      
      // Показываем уведомления
      if (currentStageIndex < 3 && updateData.status === 'completed') {
        alert(`Этап завершен! Автоматически завершены все предыдущие этапы с проставлением дат.`);
      } else if (currentStageIndex < 3 && updateData.status === 'in_progress') {
        alert(`Этап в работе! Даты автоматически проставлены.`);
      } else if (currentStageIndex >= 3 && updateData.completed_units > 0) {
        alert(`Этап обновлен! Предыдущие этапы автоматически обновлены до ${updateData.completed_units} деталей с проставлением дат начала (где они не были установлены вручную).`);
      }
      
      // Обновляем только конкретный этап локально, чтобы избежать полной перезагрузки
      updateStageInOrder(editingStage, updateData);
      
      // Используем задержку для полного обновления данных с сервера
      setTimeout(() => {
        fetchOrder();
      }, 500);
    } catch (error) {
      console.error('Failed to update stage:', error);
      console.error('Error details:', error.response?.data);
      alert('Ошибка при обновлении этапа: ' + (error.response?.data?.detail || error.message));
      // Сбрасываем состояние редактирования при ошибке
      setEditingStage(null);
      setStageData({});
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`${API}/orders/${id}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      fetchOrder();
      event.target.value = '';
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert('Ошибка при загрузке файла');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFileDownload = async (fileId, filename) => {
    try {
      const response = await axios.get(`${API}/orders/${id}/files/${fileId}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download file:', error);
      alert('Ошибка при скачивании файла');
    }
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

  const getProgressPercentage = () => {
    if (!order) return 0;
    const completedStages = order.stages.filter(stage => stage.status === 'completed').length;
    return Math.round((completedStages / order.stages.length) * 100);
  };

  const calculateProcessingCostPerUnit = (order) => {
    if (!order) return 0;
    const rate = order.market_type === 'domestic' 
      ? (order.minute_rate_domestic || 25) 
      : (order.minute_rate_foreign || 0.42);
    return (order.processing_time_per_unit || 0) * rate;
  };

  const calculateMaterialCostPerUnit = (order) => {
    if (!order || !order.quantity) return 0;
    return (order.material_cost || 0) / order.quantity;
  };

  const calculateTotalCostPerUnit = (order) => {
    return calculateMaterialCostPerUnit(order) + calculateProcessingCostPerUnit(order);
  };

  const calculateTotalOrderCost = (order) => {
    return calculateTotalCostPerUnit(order) * (order.quantity || 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Заказ не найден</h2>
          <p className="text-slate-600 mb-4">Заказ с указанным ID не существует.</p>
          <Button onClick={() => navigate('/')}>
            Вернуться на главную
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-200 to-slate-300">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <Package className="w-6 h-6 text-emerald-600" />
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  Заказ #{order.order_number}
                </h1>
                <p className="text-sm text-slate-600">
                  Прогресс: {getProgressPercentage()}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800" translate="no">Информация о заказе</h2>
                <div className="flex items-center space-x-2">
                  <Badge variant={order.market_type === 'domestic' ? 'default' : 'secondary'}>
                    {order.market_type === 'domestic' ? 'Внутренний' : 'Зарубежный'}
                  </Badge>
                  {user?.role === 'manager' && !editingOrder && (
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={handleOrderEdit}>
                        <Edit className="w-4 h-4 mr-2" />
                        Редактировать
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={handleOrderDelete}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Удалить
                      </Button>
                    </div>
                  )}
                  {editingOrder && (
                    <div className="flex space-x-2">
                      <Button size="sm" onClick={handleOrderSave}>
                        <Save className="w-4 h-4 mr-2" />
                        Сохранить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingOrder(false)}>
                        <X className="w-4 h-4 mr-2" />
                        Отмена
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {editingOrder ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Клиент</Label>
                      <Input
                        value={orderData.client_name || ''}
                        onChange={(e) => setOrderData(prev => ({ ...prev, client_name: e.target.value }))}
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Количество</Label>
                      <Input
                        type="number"
                        min="1"
                        value={orderData.quantity || 1}
                        onChange={(e) => setOrderData(prev => ({ ...prev, quantity: parseInt(e.target.value) }))}
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Описание</Label>
                    <Textarea
                      value={orderData.description || ''}
                      onChange={(e) => setOrderData(prev => ({ ...prev, description: e.target.value }))}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Тип рынка</Label>
                      <select
                        value={orderData.market_type || 'domestic'}
                        onChange={(e) => setOrderData(prev => ({ ...prev, market_type: e.target.value }))}
                        className="h-8 w-full px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="domestic">Внутренний</option>
                        <option value="foreign">Зарубежный</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Типы обработки</Label>
                      <div className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-slate-50 max-h-32 overflow-y-auto">
                        {processingTypeOptions.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`edit-${option.value}`}
                              checked={(orderData.processing_types || []).includes(option.value)}
                              onChange={() => handleProcessingTypeToggle(option.value)}
                              className="w-3 h-3 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                            />
                            <label htmlFor={`edit-${option.value}`} className="text-xs text-slate-700 cursor-pointer">
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Время обработки (мин/шт)</Label>
                      <Input
                        type="number"
                        min="1"
                        value={orderData.processing_time_per_unit || 1}
                        onChange={(e) => setOrderData(prev => ({ ...prev, processing_time_per_unit: parseFloat(e.target.value) }))}
                        className="h-8"
                      />
                    </div>
                  </div>

                  {user?.role === 'manager' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Стоимость материала ({orderData.market_type === 'domestic' ? '₴' : '$'})
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={orderData.material_cost || 0}
                          onChange={(e) => setOrderData(prev => ({ ...prev, material_cost: parseFloat(e.target.value) }))}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Ставка за минуту (внутренний, ₴)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={orderData.minute_rate_domestic || 25}
                          onChange={(e) => setOrderData(prev => ({ ...prev, minute_rate_domestic: parseFloat(e.target.value) }))}
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Ставка за минуту (зарубежный, $)
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={orderData.minute_rate_foreign || 0.42}
                          onChange={(e) => setOrderData(prev => ({ ...prev, minute_rate_foreign: parseFloat(e.target.value) }))}
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}

                  {user?.role === 'manager' && (
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-slate-800 mb-2">Расчет стоимости</h3>
                      <div className="space-y-1 text-sm text-slate-600">
                        <p>
                          <strong>Стоимость материала за деталь:</strong>{' '}
                          {((orderData.material_cost || 0) / (orderData.quantity || 1)).toLocaleString()}{' '}
                          {orderData.market_type === 'domestic' ? '₴' : '$'}
                        </p>
                        <p>
                          <strong>Стоимость обработки за деталь:</strong>{' '}
                          {((orderData.processing_time_per_unit || 0) * 
                            (orderData.market_type === 'domestic' 
                              ? (orderData.minute_rate_domestic || 25)
                              : (orderData.minute_rate_foreign || 0.42))
                          ).toLocaleString()}{' '}
                          {orderData.market_type === 'domestic' ? '₴' : '$'}
                        </p>
                        <p>
                          <strong>Общая стоимость за деталь:</strong>{' '}
                          {(((orderData.material_cost || 0) / (orderData.quantity || 1)) + 
                            (orderData.processing_time_per_unit || 0) * 
                            (orderData.market_type === 'domestic' 
                              ? (orderData.minute_rate_domestic || 25)
                              : (orderData.minute_rate_foreign || 0.42))
                          ).toLocaleString()}{' '}
                          {orderData.market_type === 'domestic' ? '₴' : '$'}
                        </p>
                        <p>
                          <strong>Общая стоимость заказа:</strong>{' '}
                          {((((orderData.material_cost || 0) / (orderData.quantity || 1)) + 
                            (orderData.processing_time_per_unit || 0) * 
                            (orderData.market_type === 'domestic' 
                              ? (orderData.minute_rate_domestic || 25)
                              : (orderData.minute_rate_foreign || 0.42))
                          ) * (orderData.quantity || 1)).toLocaleString()}{' '}
                          {orderData.market_type === 'domestic' ? '₴' : '$'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong>Клиент:</strong> {order.client_name}</p>
                    <p><strong>Описание:</strong> {order.description}</p>
                    <p><strong>Количество:</strong> {order.quantity} шт.</p>
                    <p><strong>Типы обработки:</strong> {
                      order.processing_types && order.processing_types.length > 0
                        ? order.processing_types.map(type => getProcessingTypeLabel(type)).join(', ')
                        : 'Не указано'
                    }</p>
                  </div>
                  
                  {user?.role === 'manager' && (
                    <div className="space-y-2">
                      <p><strong>Стоимость материала (общая):</strong> {(order.material_cost || 0).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                      <p><strong>Стоимость материала за деталь:</strong> {calculateMaterialCostPerUnit(order).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                      <p><strong>Время обработки:</strong> {order.processing_time_per_unit || 0} мин/шт</p>
                      <p><strong>Стоимость обработки за деталь:</strong> {calculateProcessingCostPerUnit(order).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                      <p><strong>Общая стоимость за деталь:</strong> {calculateTotalCostPerUnit(order).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                      <p><strong>Общая стоимость заказа:</strong> {calculateTotalOrderCost(order).toLocaleString()} {order.market_type === 'domestic' ? '₴' : '$'}</p>
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* Files */}
            {user?.role === 'manager' && (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-800">Файлы</h2>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploadingFile}
                    />
                    <Button size="sm" disabled={uploadingFile}>
                      {uploadingFile ? (
                        <div className="loading-spinner mr-2"></div>
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Загрузить файл
                    </Button>
                  </label>
                </div>

                {order.files.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Файлы не загружены</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {order.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-slate-500" />
                          <span className="text-sm font-medium">{file.original_filename}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFileDownload(file.id, file.original_filename)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Stages */}
          <div>
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Этапы производства</h2>
              
              <div className="space-y-3">
                {order.stages && Array.isArray(order.stages) && order.stages.filter(stage => stage && stage.id).map((stage, index) => (
                  <div
                    key={`stage-${order.id}-${stage.id}-${index}`}
                    className="border border-slate-200 rounded-lg p-4 bg-white"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <h3 className="font-medium text-sm">{stage.name}</h3>
                      </div>
                      
                      {editingStage === stage.id ? (
                        <div className="flex space-x-1">
                          <Button size="sm" variant="ghost" onClick={handleStageSave}>
                            <Save className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => {
                            setEditingStage(null);
                            setStageData({});
                          }}>
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => handleStageEdit(stage)}>
                          <Edit className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {editingStage === stage.id ? (
                      <div className="space-y-3">
                        <select
                          value={stageData.status || 'pending'}
                          onChange={(e) => setStageData(prev => ({ ...prev, status: e.target.value }))}
                          className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                          <option value="pending">Ожидает</option>
                          <option value="in_progress">В работе</option>
                          <option value="completed">Завершен</option>
                          <option value="delayed">Просрочен</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={stageData.start_date || ''}
                            onChange={(e) => setStageData(prev => ({ ...prev, start_date: e.target.value }))}
                            className="h-10 px-3 border border-slate-300 rounded-md bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Дата начала"
                          />

                          <input
                            type="date"
                            value={stageData.end_date || ''}
                            onChange={(e) => setStageData(prev => ({ ...prev, end_date: e.target.value }))}
                            className="h-10 px-3 border border-slate-300 rounded-md bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            placeholder="Дата окончания"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {/* Для этапов 4-8 показываем поле количества деталей */}
                          {(index >= 3) ? (
                            <Input
                              type="number"
                              min="0"
                              max={order.quantity}
                              placeholder="Количество деталей"
                              value={stageData.completed_units}
                              onChange={(e) => setStageData(prev => ({ ...prev, completed_units: parseInt(e.target.value) || 0 }))}
                              className="h-10 text-xs"
                            />
                          ) : (
                            <div className="h-10 flex items-center text-xs text-slate-500 px-3 bg-slate-50 rounded border">
                              <span className="text-center w-full">
                                Автоматические даты
                              </span>
                            </div>
                          )}
                          <Input
                            placeholder="Ответственный"
                            value={stageData.responsible_person}
                            onChange={(e) => setStageData(prev => ({ ...prev, responsible_person: e.target.value }))}
                            className="h-10 text-xs"
                          />
                        </div>

                        <Textarea
                          placeholder="Заметки"
                          value={stageData.notes}
                          onChange={(e) => setStageData(prev => ({ ...prev, notes: e.target.value }))}
                          className="text-xs resize-none"
                          rows={3}
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Badge variant={getStatusBadge(stage.status).variant} className="text-xs">
                          {getStatusBadge(stage.status).label}
                        </Badge>
                        
                        {stage.start_date && (
                          <div className="flex items-center space-x-1 text-xs text-slate-600">
                            <Clock className="w-3 h-3" />
                            <span>{stage.start_date} - {stage.end_date || 'в процессе'}</span>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1 text-xs text-slate-600">
                            <div className="flex-1">
                              <div className="bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-emerald-500 h-2 rounded-full transition-all"
                                  style={{ width: `${stage.percentage || 0}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="font-medium">{stage.percentage || 0}%</span>
                          </div>
                          
                          {/* Показываем количество деталей для этапов 4-8 */}
                          {(index >= 3 && stage.completed_units !== null && stage.completed_units !== undefined) && (
                            <div className={`text-xs ${stage.name === 'Изготовление' ? 'text-emerald-700 font-medium bg-emerald-50 px-2 py-1 rounded' : 'text-slate-500'}`}>
                              {stage.name === 'Изготовление' ? '🔧 ' : ''}Обработано: {stage.completed_units} из {order.quantity} деталей
                              {stage.completed_units > 0 && stage.status === 'in_progress' && (
                                <span className="ml-2 text-emerald-600">• Автообновлено</span>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {stage.responsible_person && (
                          <div className="flex items-center space-x-1 text-xs text-slate-600">
                            <User className="w-3 h-3" />
                            <span>{stage.responsible_person}</span>
                          </div>
                        )}
                        
                        {stage.notes && (
                          <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded">
                            {stage.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </main>
      </div>
    </ErrorBoundary>
  );
};

export default OrderDetail;
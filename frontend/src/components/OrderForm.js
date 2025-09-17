import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
// Removed Select import to fix removeChild issues
import { ArrowLeft, Save, Package } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const OrderForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    order_number: '',
    client_name: '',
    description: '',
    quantity: 1,
    market_type: 'domestic',
    material_cost: 0,
    processing_time_per_unit: 30,
    processing_types: [],
    minute_rate_domestic: 25,
    minute_rate_foreign: 0.42
  });
  
  // Принудительное обновление для расчетов
  const [forceUpdate, setForceUpdate] = useState(0);

  // Функция для безопасного обновления числовых полей
  const updateNumberField = (fieldName, value) => {
    const numValue = parseFloat(value) || 0;
    console.log(`Обновление ${fieldName}:`, value, '→', numValue);
    setFormData(prev => {
      const newData = { ...prev, [fieldName]: numValue };
      console.log('Новое состояние formData:', newData);
      return newData;
    });
    setForceUpdate(prev => prev + 1);
  };

  // Простые расчеты без useMemo
  const quantity = formData.quantity || 1;
  const materialCost = formData.material_cost || 0;
  const processingTime = formData.processing_time_per_unit || 0;
  const rate = formData.market_type === 'domestic' 
    ? (formData.minute_rate_domestic || 25) 
    : (formData.minute_rate_foreign || 0.42);
  
  const materialPerUnit = quantity > 0 ? materialCost / quantity : 0;
  const processingPerUnit = processingTime * rate;
  const totalPerUnit = materialPerUnit + processingPerUnit;
  const totalOrder = materialCost + (quantity * processingTime * rate);

  // Отладка расчетов
  useEffect(() => {
    console.log('OrderForm formData updated:', formData);
    console.log('Calculations:', { quantity, materialCost, processingTime, materialPerUnit, processingPerUnit, totalPerUnit, totalOrder });
  }, [formData, quantity, materialCost, processingTime, materialPerUnit, processingPerUnit, totalPerUnit, totalOrder]);

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

  const handleChange = (name, value) => {
    console.log(`Изменение поля ${name}:`, value);
    setFormData(prev => {
      const newData = { ...prev, [name]: value };
      console.log('Новые данные формы:', newData);
      return newData;
    });
    setForceUpdate(prev => prev + 1);
  };

  const handleProcessingTypeToggle = (type) => {
    setFormData(prev => ({
      ...prev,
      processing_types: prev.processing_types.includes(type)
        ? prev.processing_types.filter(t => t !== type)
        : [...prev.processing_types, type]
    }));
  };

  // Функции расчета с правильным преобразованием типов для формы
  const calculateProcessingCostPerUnit = (data) => {
    if (!data) return 0;
    const rate = data.market_type === 'domestic' 
      ? (parseFloat(data.minute_rate_domestic) || 25) 
      : (parseFloat(data.minute_rate_foreign) || 0.42);
    return (parseFloat(data.processing_time_per_unit) || 0) * rate;
  };

  const calculateMaterialCostPerUnit = (data) => {
    if (!data || !data.quantity) return 0;
    const materialCost = parseFloat(data.material_cost) || 0;
    const quantity = parseInt(data.quantity) || 1;
    return materialCost / quantity;
  };

  const calculateTotalCostPerUnit = (data) => {
    return calculateMaterialCostPerUnit(data) + calculateProcessingCostPerUnit(data);
  };

  const calculateTotalOrderCost = (data) => {
    const quantity = parseInt(data.quantity) || 1;
    return calculateTotalCostPerUnit(data) * quantity;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.processing_types.length === 0) {
      alert('Выберите хотя бы один тип обработки');
      return;
    }
    
    setLoading(true);

    try {
      const response = await axios.post(`${API}/orders`, formData);
      navigate(`/orders/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Ошибка при создании заказа');
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Доступ запрещен</h2>
          <p className="text-slate-600">Только менеджеры могут создавать заказы.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <h1 className="text-xl font-bold text-slate-800">
                Новый заказ
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="order_number">Номер заказа *</Label>
                <input
                  id="order_number"
                  type="text"
                  value={formData.order_number}
                  onChange={(e) => handleChange('order_number', e.target.value)}
                  placeholder="ЗК-2024-001"
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_name">Клиент *</Label>
                <input
                  id="client_name"
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  placeholder="Название компании"
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание заказа *</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Подробное описание деталей и требований"
                className="w-full min-h-[80px] px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="quantity">Количество *</Label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => updateNumberField('quantity', e.target.value || 1)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="market_type">Тип рынка *</Label>
                <select
                  value={formData.market_type}
                  onChange={(e) => handleChange('market_type', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="domestic">Внутренний рынок</option>
                  <option value="foreign">Зарубежный рынок</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Типы обработки *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 border rounded-lg bg-slate-50">
                {processingTypeOptions.map((option) => (
                  <div key={option.value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={option.value}
                      checked={formData.processing_types.includes(option.value)}
                      onChange={() => handleProcessingTypeToggle(option.value)}
                      className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                    />
                    <label htmlFor={option.value} className="text-sm text-slate-700 cursor-pointer">
                      {option.label}
                    </label>
                  </div>
                ))}
              </div>
              {formData.processing_types.length === 0 && (
                <p className="text-xs text-red-600">Выберите хотя бы один тип обработки</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="material_cost">
                  Стоимость материала ({formData.market_type === 'domestic' ? '₴' : '$'}) *
                </Label>
                <input
                  id="material_cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.material_cost}
                  onChange={(e) => updateNumberField('material_cost', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="processing_time_per_unit">Время обработки (минут на деталь) *</Label>
                <input
                  id="processing_time_per_unit"
                  type="number"
                  step="0.1"
                  min="0"
                  value={formData.processing_time_per_unit}
                  onChange={(e) => updateNumberField('processing_time_per_unit', e.target.value)}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="minute_rate_domestic">Ставка за минуту (внутренний рынок, ₴)</Label>
                <input
                  id="minute_rate_domestic"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minute_rate_domestic}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 25;
                    setFormData(prev => ({ ...prev, minute_rate_domestic: value }));
                  }}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minute_rate_foreign">Ставка за минуту (зарубежный рынок, $)</Label>
                <input
                  id="minute_rate_foreign"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minute_rate_foreign}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 0.42;
                    setFormData(prev => ({ ...prev, minute_rate_foreign: value }));
                  }}
                  className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerent-500"
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg">
              <h3 className="font-semibold text-slate-800 mb-2">Расчет стоимости</h3>
              <div className="space-y-1 text-sm text-slate-600">
                <p>
                  <strong>ОТЛАДКА - Raw values:</strong> qty={quantity}, mat={materialCost}, time={processingTime}
                </p>
                <p>
                  <strong>Количество:</strong> {quantity} шт
                </p>
                <p>
                  <strong>Стоимость материала (общая):</strong>{' '}
                  {materialCost.toFixed(2)}{' '}
                  {formData.market_type === 'domestic' ? '₴' : '$'}
                </p>
                <p>
                  <strong>Стоимость материала за деталь:</strong>{' '}
                  {materialPerUnit.toFixed(2)}{' '}
                  {formData.market_type === 'domestic' ? '₴' : '$'}
                </p>
                <p>
                  <strong>Время обработки:</strong> {processingTime} мин/шт
                </p>
                <p>
                  <strong>Стоимость обработки за деталь:</strong>{' '}
                  {processingPerUnit.toFixed(2)}{' '}
                  {formData.market_type === 'domestic' ? '₴' : '$'}
                </p>
                <p>
                  <strong>Общая стоимость за деталь:</strong>{' '}
                  {totalPerUnit.toFixed(2)}{' '}
                  {formData.market_type === 'domestic' ? '₴' : '$'}
                </p>
                <p>
                  <strong>Общая стоимость заказа:</strong>{' '}
                  {totalOrder.toFixed(2)}{' '}
                  {formData.market_type === 'domestic' ? '₴' : '$'}
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/')}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="loading-spinner mr-2"></div>
                    Создание...
                  </div>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Создать заказ
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
};

export default OrderForm;
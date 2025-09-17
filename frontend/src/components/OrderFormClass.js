import React, { Component } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../App';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
const API = `${BACKEND_URL}/api`;

// Wrapper для useNavigate и useAuth в классовом компоненте
function withNavigateAndAuth(Component) {
  return function WrappedComponent(props) {
    let navigate = useNavigate();
    let auth = useAuth();
    return <Component {...props} navigate={navigate} auth={auth} />;
  };
}

class OrderFormClass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      formData: {
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
      },
      loading: false
    };
  }

  processingTypeOptions = [
    { value: 'turning', label: 'Токарная обработка' },
    { value: 'milling', label: 'Фрезерная обработка' },
    { value: 'drilling', label: 'Сверление' },
    { value: 'grinding', label: 'Шлифование' },
    { value: 'boring', label: 'Расточка' },
    { value: 'threading', label: 'Нарезание резьбы' },
    { value: 'broaching', label: 'Протяжка' },
    { value: 'honing', label: 'Хонингование' }
  ];

  handleChange = (name, value) => {
    console.log(`Изменение поля ${name}:`, value);
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        [name]: value
      }
    }));
  }

  handleNumberChange = (name) => (e) => {
    const value = parseFloat(e.target.value) || 0;
    this.handleChange(name, value);
  }

  handleIntChange = (name) => (e) => {
    const value = parseInt(e.target.value) || (name === 'quantity' ? 1 : 0);
    this.handleChange(name, value);
  }

  handleTextChange = (name) => (e) => {
    this.handleChange(name, e.target.value);
  }

  handleSelectChange = (name) => (e) => {
    this.handleChange(name, e.target.value);
  }

  handleProcessingTypeToggle = (type) => {
    this.setState(prevState => ({
      formData: {
        ...prevState.formData,
        processing_types: prevState.formData.processing_types.includes(type)
          ? prevState.formData.processing_types.filter(t => t !== type)
          : [...prevState.formData.processing_types, type]
      }
    }));
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация типов обработки
    if (this.state.formData.processing_types.length === 0) {
      window.alert('Выберите хотя бы один тип обработки');
      return;
    }

    this.setState({ loading: true });

    try {
      const response = await axios.post(`${API}/orders`, this.state.formData);
      console.log('Order created:', response.data);
      window.alert('Заказ успешно создан!');
      this.props.navigate('/');
    } catch (error) {
      console.error('Failed to create order:', error);
      window.alert('Ошибка при создании заказа: ' + (error.response?.data?.detail || error.message));
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    const { formData, loading } = this.state;
    
    // Расчеты
    const materialPerUnit = formData.quantity > 0 ? formData.material_cost / formData.quantity : 0;
    const rate = formData.market_type === 'domestic' ? formData.minute_rate_domestic : formData.minute_rate_foreign;
    const processingPerUnit = formData.processing_time_per_unit * rate;
    const totalPerUnit = materialPerUnit + processingPerUnit;
    const totalOrder = formData.material_cost + (formData.quantity * formData.processing_time_per_unit * rate);

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-4xl mx-auto p-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-800 mb-2">Создание нового заказа</h1>
              <p className="text-slate-600">Заполните форму для создания заказа на производство</p>
            </div>

            <form onSubmit={this.handleSubmit} className="space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="order_number">Номер заказа *</Label>
                  <input
                    id="order_number"
                    type="text"
                    value={formData.order_number}
                    onChange={this.handleTextChange('order_number')}
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
                    onChange={this.handleTextChange('client_name')}
                    placeholder="ООО Машиностроение"
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
                  onChange={this.handleTextChange('description')}
                  placeholder="Описание заказа, требования к изготовлению"
                  className="w-full min-h-[80px] px-3 py-2 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-vertical"
                  required
                />
              </div>

              {/* Параметры производства */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Количество *</Label>
                  <input
                    id="quantity"
                    type="number"
                    min="1"
                    value={formData.quantity}
                    onChange={this.handleIntChange('quantity')}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Тип рынка</Label>
                  <select
                    value={formData.market_type}
                    onChange={this.handleSelectChange('market_type')}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="domestic">Внутренний</option>
                    <option value="foreign">Зарубежный</option>
                  </select>
                </div>
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
                    onChange={this.handleNumberChange('material_cost')}
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
                    onChange={this.handleNumberChange('processing_time_per_unit')}
                    className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
              </div>

              {/* Типы обработки */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Типы обработки *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {this.processingTypeOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex items-center space-x-2 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.processing_types.includes(option.value)}
                        onChange={() => this.handleProcessingTypeToggle(option.value)}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">{option.label}</span>
                    </label>
                  ))}
                </div>
                {formData.processing_types.length === 0 && (
                  <p className="text-sm text-red-600 mt-1">
                    Выберите хотя бы один тип обработки
                  </p>
                )}
              </div>

              {/* Настройка тарифов */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Настройка тарифов</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="minute_rate_domestic">Тариф внутренний рынок (₴/мин)</Label>
                    <input
                      id="minute_rate_domestic"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minute_rate_domestic}
                      onChange={this.handleNumberChange('minute_rate_domestic')}
                      className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minute_rate_foreign">Тариф зарубежный рынок ($/мин)</Label>
                    <input
                      id="minute_rate_foreign"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.minute_rate_foreign}
                      onChange={this.handleNumberChange('minute_rate_foreign')}
                      className="w-full h-10 px-3 border border-slate-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Расчет стоимости */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-800 mb-2">Расчет стоимости</h3>
                <div className="space-y-1 text-sm text-slate-600">
                  <p>
                    <strong>Количество:</strong> {formData.quantity} шт
                  </p>
                  <p>
                    <strong>Стоимость материала (общая):</strong> {formData.material_cost.toFixed(2)} {formData.market_type === 'domestic' ? '₴' : '$'}
                  </p>
                  <p>
                    <strong>Стоимость материала за деталь:</strong> {materialPerUnit.toFixed(2)} {formData.market_type === 'domestic' ? '₴' : '$'}
                  </p>
                  <p>
                    <strong>Время обработки:</strong> {formData.processing_time_per_unit} мин/шт
                  </p>
                  <p>
                    <strong>Стоимость обработки за деталь:</strong> {processingPerUnit.toFixed(2)} {formData.market_type === 'domestic' ? '₴' : '$'}
                  </p>
                  <p>
                    <strong>Общая стоимость за деталь:</strong> {totalPerUnit.toFixed(2)} {formData.market_type === 'domestic' ? '₴' : '$'}
                  </p>
                  <p>
                    <strong>Общая стоимость заказа:</strong> {totalOrder.toFixed(2)} {formData.market_type === 'domestic' ? '₴' : '$'}
                  </p>
                </div>
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-6">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Создание...' : 'Создать заказ'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => this.props.navigate('/')}
                  className="flex-1"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    );
  }
}

export default withNavigateAndAuth(OrderFormClass);
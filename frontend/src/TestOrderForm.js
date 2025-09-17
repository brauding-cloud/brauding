import React, { useState } from 'react';

const TestOrderForm = () => {
  const [formData, setFormData] = useState({
    quantity: 10,
    material_cost: 1000,
    processing_time_per_unit: 45,
    market_type: 'domestic',
    minute_rate_domestic: 25,
    minute_rate_foreign: 0.42
  });

  const calculateMaterialCostPerUnit = (data) => {
    if (!data || !data.quantity) return 0;
    const materialCost = parseFloat(data.material_cost) || 0;
    const quantity = parseInt(data.quantity) || 1;
    return materialCost / quantity;
  };

  const calculateProcessingCostPerUnit = (data) => {
    if (!data) return 0;
    const rate = data.market_type === 'domestic' 
      ? (parseFloat(data.minute_rate_domestic) || 25) 
      : (parseFloat(data.minute_rate_foreign) || 0.42);
    return (parseFloat(data.processing_time_per_unit) || 0) * rate;
  };

  const calculateTotalCostPerUnit = (data) => {
    return calculateMaterialCostPerUnit(data) + calculateProcessingCostPerUnit(data);
  };

  const calculateTotalOrderCost = (data) => {
    const quantity = parseInt(data.quantity) || 1;
    return calculateTotalCostPerUnit(data) * quantity;
  };

  const handleChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h1>Тест расчета стоимости</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Параметры заказа:</h2>
        <div style={{ marginBottom: '10px' }}>
          <label>Количество деталей: </label>
          <input 
            type="number" 
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value))}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Стоимость материала (общая): </label>
          <input 
            type="number" 
            value={formData.material_cost}
            onChange={(e) => handleChange('material_cost', parseFloat(e.target.value))}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Время обработки (мин/деталь): </label>
          <input 
            type="number" 
            value={formData.processing_time_per_unit}
            onChange={(e) => handleChange('processing_time_per_unit', parseFloat(e.target.value))}
          />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Тип рынка: </label>
          <select 
            value={formData.market_type}
            onChange={(e) => handleChange('market_type', e.target.value)}
          >
            <option value="domestic">Внутренний</option>
            <option value="foreign">Зарубежный</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: '#f0f0f0', padding: '15px', borderRadius: '5px' }}>
        <h2>Расчет стоимости:</h2>
        <p><strong>Стоимость материала (общая):</strong> {formData.material_cost} ₴</p>
        <p><strong>Стоимость материала за деталь:</strong> {calculateMaterialCostPerUnit(formData).toFixed(2)} ₴</p>
        <p><strong>Время обработки:</strong> {formData.processing_time_per_unit} мин/шт</p>
        <p><strong>Стоимость обработки за деталь:</strong> {calculateProcessingCostPerUnit(formData).toFixed(2)} ₴</p>
        <p><strong>Общая стоимость за деталь:</strong> {calculateTotalCostPerUnit(formData).toFixed(2)} ₴</p>
        <p><strong>Общая стоимость заказа:</strong> {calculateTotalOrderCost(formData).toFixed(2)} ₴</p>
      </div>
    </div>
  );
};

export default TestOrderForm;
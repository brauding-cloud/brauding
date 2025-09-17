import React, { useState, useReducer } from 'react';

// Reducer для принудительного обновления
const formReducer = (state, action) => {
  console.log('REDUCER CALLED:', action.type, action.payload, 'OLD STATE:', state);
  const newState = { ...state, _updateId: Math.random() }; // Принудительный re-render
  
  switch (action.type) {
    case 'SET_QUANTITY':
      newState.quantity = action.payload;
      break;
    case 'SET_MATERIAL_COST':
      newState.materialCost = action.payload;
      break;
    case 'SET_PROCESSING_TIME':
      newState.processingTime = action.payload;
      break;
    case 'SET_MARKET_TYPE':
      newState.marketType = action.payload;
      break;
    case 'INCREMENT_CLICKS':
      newState.testClicks = state.testClicks + 1;
      break;
    default:
      return state;
  }
  
  console.log('NEW STATE:', newState);
  return newState;
};

const SimpleOrderForm = () => {
  const [state, dispatch] = useReducer(formReducer, {
    quantity: 1,
    materialCost: 0,
    processingTime: 30,
    marketType: 'domestic',
    testClicks: 0,
    _updateId: Math.random()
  });
  
  const [forceRender, setForceRender] = useState(0);
  
  // Тест функции
  const testJavaScript = () => {
    alert('JavaScript работает!');
    dispatch({ type: 'INCREMENT_CLICKS' });
    setForceRender(prev => prev + 1); // Принудительный ре-рендер
    console.log('CLICKED, новое значение должно быть:', state.testClicks + 1);
  };

  // Простые расчеты используя state
  const { quantity, materialCost, processingTime, marketType, testClicks } = state;
  const materialPerUnit = quantity > 0 ? materialCost / quantity : 0;
  const rate = marketType === 'domestic' ? 25 : 0.42;
  const processingPerUnit = processingTime * rate;
  const totalPerUnit = materialPerUnit + processingPerUnit;
  const totalOrder = materialCost + (quantity * processingTime * rate);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>ТЕСТОВАЯ ФОРМА РАСЧЕТОВ</h1>
      
      <div style={{ backgroundColor: 'red', color: 'white', padding: '10px', marginBottom: '20px' }}>
        <button onClick={testJavaScript} style={{ padding: '10px', fontSize: '16px' }}>
          ТЕСТ JavaScript (кликов: {testClicks})
        </button>
        <p>Если JavaScript работает, счетчик увеличится при клике</p>
      </div>
      
      <div style={{ marginBottom: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label>Количество деталей:</label>
          <input 
            type="number"
            value={quantity}
            onChange={(e) => {
              const newValue = parseInt(e.target.value) || 1;
              console.log('QUANTITY CHANGE:', e.target.value, '→', newValue);
              alert('Количество меняется на: ' + newValue);
              dispatch({ type: 'SET_QUANTITY', payload: newValue });
              setForceRender(prev => prev + 1);
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Стоимость материала (общая):</label>
          <input 
            type="number"
            value={materialCost}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value) || 0;
              console.log('MATERIAL COST CHANGE:', e.target.value, '→', newValue);
              alert('Материал меняется на: ' + newValue);
              dispatch({ type: 'SET_MATERIAL_COST', payload: newValue });
              setForceRender(prev => prev + 1);
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Время обработки (мин/деталь):</label>
          <input 
            type="number"
            value={processingTime}
            onChange={(e) => {
              const newValue = parseFloat(e.target.value) || 0;
              console.log('PROCESSING TIME CHANGE:', e.target.value, '→', newValue);
              alert('Время меняется на: ' + newValue);
              dispatch({ type: 'SET_PROCESSING_TIME', payload: newValue });
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          />
        </div>
        
        <div>
          <label>Тип рынка:</label>
          <select 
            value={marketType}
            onChange={(e) => {
              console.log('MARKET TYPE CHANGE:', e.target.value);
              dispatch({ type: 'SET_MARKET_TYPE', payload: e.target.value });
            }}
            style={{ width: '100%', padding: '8px', marginTop: '5px' }}
          >
            <option value="domestic">Внутренний (25 ₴/мин)</option>
            <option value="foreign">Зарубежный (0.42 $/мин)</option>
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
        <h2>ОТЛАДКА ЗНАЧЕНИЙ:</h2>
        <p><strong>_updateId:</strong> {state._updateId}</p>
        <p><strong>quantity:</strong> {quantity}</p>
        <p><strong>materialCost:</strong> {materialCost}</p>
        <p><strong>processingTime:</strong> {processingTime}</p>
        <p><strong>marketType:</strong> {marketType}</p>
        <p><strong>rate:</strong> {rate}</p>
        
        <hr />
        
        <h2>РАСЧЕТЫ:</h2>
        <p><strong>Стоимость материала за деталь:</strong> {materialPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
        <p><strong>Стоимость обработки за деталь:</strong> {processingPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
        <p><strong>Общая стоимость за деталь:</strong> {totalPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
        <p><strong>Общая стоимость заказа:</strong> {totalOrder.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
      </div>
    </div>
  );
};

export default SimpleOrderForm;
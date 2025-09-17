import React, { Component } from 'react';

class ClassOrderForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      quantity: 1,
      materialCost: 0,
      processingTime: 30,
      marketType: 'domestic',
      testClicks: 0,
      forceRenderKey: 0
    };
  }

  testJavaScript = () => {
    alert('JavaScript работает!');
    this.setState(prevState => ({
      testClicks: prevState.testClicks + 1,
      forceRenderKey: prevState.forceRenderKey + 1
    }));
    console.log('CLASS COMPONENT CLICK');
  }

  updateQuantity = (e) => {
    const value = parseInt(e.target.value) || 1;
    console.log('CLASS: QUANTITY CHANGE:', value);
    alert('Количество: ' + value);
    this.setState({ 
      quantity: value, 
      forceRenderKey: this.state.forceRenderKey + 1 
    });
  }

  updateMaterialCost = (e) => {
    const value = parseFloat(e.target.value) || 0;
    console.log('CLASS: MATERIAL COST CHANGE:', value);
    alert('Материал: ' + value);
    this.setState({ 
      materialCost: value, 
      forceRenderKey: this.state.forceRenderKey + 1 
    });
  }

  updateProcessingTime = (e) => {
    const value = parseFloat(e.target.value) || 0;
    console.log('CLASS: PROCESSING TIME CHANGE:', value);
    alert('Время: ' + value);
    this.setState({ 
      processingTime: value, 
      forceRenderKey: this.state.forceRenderKey + 1 
    });
  }

  updateMarketType = (e) => {
    const value = e.target.value;
    console.log('CLASS: MARKET TYPE CHANGE:', value);
    this.setState({ 
      marketType: value, 
      forceRenderKey: this.state.forceRenderKey + 1 
    });
  }

  render() {
    const { quantity, materialCost, processingTime, marketType, testClicks, forceRenderKey } = this.state;
    
    // Расчеты
    const materialPerUnit = quantity > 0 ? materialCost / quantity : 0;
    const rate = marketType === 'domestic' ? 25 : 0.42;
    const processingPerUnit = processingTime * rate;
    const totalPerUnit = materialPerUnit + processingPerUnit;
    const totalOrder = materialCost + (quantity * processingTime * rate);

    console.log('CLASS COMPONENT RENDER:', this.state);

    return (
      <div key={forceRenderKey} style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <h1>REACT CLASS COMPONENT ТЕСТ</h1>
        
        <div style={{ backgroundColor: 'blue', color: 'white', padding: '10px', marginBottom: '20px' }}>
          <button onClick={this.testJavaScript} style={{ padding: '10px', fontSize: '16px' }}>
            ТЕСТ JavaScript (кликов: {testClicks})
          </button>
          <p>Render Key: {forceRenderKey}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div>
            <label>Количество деталей:</label>
            <input 
              type="number"
              value={quantity}
              onChange={this.updateQuantity}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          
          <div>
            <label>Стоимость материала (общая):</label>
            <input 
              type="number"
              value={materialCost}
              onChange={this.updateMaterialCost}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          
          <div>
            <label>Время обработки (мин/деталь):</label>
            <input 
              type="number"
              value={processingTime}
              onChange={this.updateProcessingTime}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            />
          </div>
          
          <div>
            <label>Тип рынка:</label>
            <select 
              value={marketType}
              onChange={this.updateMarketType}
              style={{ width: '100%', padding: '8px', marginTop: '5px' }}
            >
              <option value="domestic">Внутренний (25 ₴/мин)</option>
              <option value="foreign">Зарубежный (0.42 $/мин)</option>
            </select>
          </div>
        </div>

        <div style={{ backgroundColor: '#f0f0f0', padding: '20px', borderRadius: '8px' }}>
          <h2>ОТЛАДКА ЗНАЧЕНИЙ (CLASS):</h2>
          <p><strong>forceRenderKey:</strong> {forceRenderKey}</p>
          <p><strong>quantity:</strong> {quantity}</p>
          <p><strong>materialCost:</strong> {materialCost}</p>
          <p><strong>processingTime:</strong> {processingTime}</p>
          <p><strong>marketType:</strong> {marketType}</p>
          
          <hr />
          
          <h2>РАСЧЕТЫ:</h2>
          <p><strong>Стоимость материала за деталь:</strong> {materialPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
          <p><strong>Стоимость обработки за деталь:</strong> {processingPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
          <p><strong>Общая стоимость за деталь:</strong> {totalPerUnit.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
          <p><strong>Общая стоимость заказа:</strong> {totalOrder.toFixed(2)} {marketType === 'domestic' ? '₴' : '$'}</p>
        </div>
      </div>
    );
  }
}

export default ClassOrderForm;
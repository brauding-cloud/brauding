import React, { Component } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';

class LoginFormClass extends Component {
  constructor(props) {
    super(props);
    this.state = {
      credentials: {
        username: '',
        password: ''
      },
      loading: false,
      error: ''
    };
  }

  handleChange = (field) => (e) => {
    this.setState(prevState => ({
      credentials: {
        ...prevState.credentials,
        [field]: e.target.value
      }
    }));
  }

  handleSubmit = async (e) => {
    e.preventDefault();
    const { credentials } = this.state;
    const { login } = this.props;

    if (!credentials.username || !credentials.password) {
      this.setState({ error: 'Пожалуйста, заполните все поля' });
      return;
    }

    this.setState({ loading: true, error: '' });

    try {
      const result = await login(credentials.username, credentials.password);
      if (!result.success) {
        this.setState({ error: result.error });
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setState({ 
        error: 'Ошибка авторизации' 
      });
    } finally {
      this.setState({ loading: false });
    }
  }

  render() {
    const { credentials, loading, error } = this.state;

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-cyan-50 to-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-slate-800 mb-2">
              Система учета этапов производства
            </h1>
            <p className="text-slate-600">
              Войдите в систему для управления заказами
            </p>
          </div>

          <Card className="p-8">
            <form onSubmit={this.handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                  Имя пользователя
                </Label>
                <input
                  id="username"
                  type="text"
                  value={credentials.username}
                  onChange={this.handleChange('username')}
                  placeholder="Введите имя пользователя"
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Пароль
                </Label>
                <input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={this.handleChange('password')}
                  placeholder="Введите пароль"
                  className="w-full h-12 px-4 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                  required
                />
              </div>

              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Вход...' : 'Войти в систему'}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
              <p className="font-medium mb-2">Тестовые учетные записи:</p>
              <p><strong>Менеджер:</strong> admin / admin123</p>
              <p><strong>Сотрудник:</strong> worker / worker123</p>
            </div>
          </Card>
        </div>
      </div>
    );
  }
}

export default LoginFormClass;
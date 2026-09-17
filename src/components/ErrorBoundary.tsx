'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info);
    this.setState({ errorInfo: info.componentStack || '' });
    
    // Try to log to global for debugging
    (window as any).__lastError = {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      timestamp: Date.now(),
    };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = process.env.NODE_ENV === 'development';
      
      return (
        <div className="w-full h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-6">
          <h1 className="text-3xl font-bold mb-2 tracking-wider">SURVIVAL CITY 3D</h1>
          <h2 className="text-xl text-red-400 mb-6">Ошибка запуска игры</h2>
          
          <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 max-w-[600px] w-full mb-6">
            <div className="text-sm text-gray-300 mb-2">Сообщение:</div>
            <div className="text-sm font-mono bg-black p-3 rounded text-red-300 break-all">
              {this.state.error?.message || 'Неизвестная ошибка'}
            </div>
            
            {isDev && this.state.error?.stack && (
              <>
                <div className="text-sm text-gray-300 mt-4 mb-2">Stack:</div>
                <div className="text-xs font-mono bg-black p-3 rounded text-gray-400 max-h-[200px] overflow-auto whitespace-pre-wrap">
                  {this.state.error.stack}
                </div>
              </>
            )}
            
            {isDev && this.state.errorInfo && (
              <>
                <div className="text-sm text-gray-300 mt-4 mb-2">Component Stack:</div>
                <div className="text-xs font-mono bg-black p-3 rounded text-gray-500 max-h-[150px] overflow-auto whitespace-pre-wrap">
                  {this.state.errorInfo}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={this.handleRetry}
              className="px-6 py-3 bg-green-700 hover:bg-green-600 rounded-lg font-medium transition-colors"
            >
              Повторить [F5]
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-[#333] hover:bg-[#444] rounded-lg transition-colors"
            >
              Сбросить сохранения
            </button>
          </div>

          <div className="mt-8 text-xs text-gray-500 text-center max-w-md">
            Если ошибка повторяется, попробуйте:<br/>
            1. Обновить браузер (Chrome 90+)<br/>
            2. Включить WebGL в настройках<br/>
            3. Отключить блокировщики<br/>
            4. Проверить консоль F12 → Console
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function WebGLCheck({ children }: { children: React.ReactNode }) {
  const [webGLSupported, setWebGLSupported] = React.useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = React.useState('');

  React.useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as any;
      const gl2 = canvas.getContext('webgl2');
      
      if (!gl && !gl2) {
        setWebGLSupported(false);
        setErrorMsg('WebGL не поддерживается в этом браузере');
        return;
      }
      
      // Check for required extensions
      const supported = !!gl || !!gl2;
      setWebGLSupported(supported);
      
      if (!supported) {
        setErrorMsg('WebGL доступен, но не инициализируется');
      }
    } catch (e: any) {
      setWebGLSupported(false);
      setErrorMsg(e.message || 'Ошибка проверки WebGL');
    }
  }, []);

  if (webGLSupported === false) {
    return (
      <div className="w-full h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-white p-6">
        <h1 className="text-3xl font-bold mb-2">SURVIVAL CITY 3D</h1>
        <h2 className="text-xl text-red-400 mb-4">WebGL не поддерживается</h2>
        <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-4 max-w-md text-sm text-gray-300">
          <p className="mb-3">{errorMsg}</p>
          <p className="text-xs text-gray-500">
            Игра требует WebGL. Попробуйте:<br/>
            - Обновить Chrome/Firefox<br/>
            - Включить аппаратное ускорение<br/>
            - Отключить флаги chrome://flags → WebGL disabled<br/>
            - Проверить драйвера видеокарты
          </p>
        </div>
      </div>
    );
  }

  if (webGLSupported === null) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center text-white">
        <div>Проверка WebGL...</div>
      </div>
    );
  }

  return <>{children}</>;
}

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Dashboard from './components/dashboard/Dashboard';
import { useAppStore } from './stores/useAppStore';
import { sampleProcesses } from './data/sampleData';

function App() {
  const { processes, addProcess } = useAppStore();
  
  // Load sample data on first run
  useEffect(() => {
    if (processes.length === 0) {
      sampleProcesses.forEach(process => {
        addProcess(process);
      });
    }
  }, [processes.length, addProcess]);
  
  return (
    <div className="App">
      <Dashboard />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
    </div>
  );
}

export default App;

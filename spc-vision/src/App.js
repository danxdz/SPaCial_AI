import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              SPaCial_AI
            </h1>
            <p className="text-xl text-gray-600">
              A beautiful spacial_ai app created by AI
            </p>
          </header>

          <main className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="mb-8">
                <div className="text-6xl font-bold text-blue-600 mb-4">
                  {count}
                </div>
                <p className="text-gray-600 mb-6">
                  Click the button to interact with your app!
                </p>
              </div>
              
              <div className="space-x-4">
                <button
                  onClick={() => setCount(count + 1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                >
                  Increment
                </button>
                <button
                  onClick={() => setCount(count - 1)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                >
                  Decrement
                </button>
                <button
                  onClick={() => setCount(0)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition duration-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </main>

          <footer className="text-center mt-12 text-gray-500">
            <p>Created with ❤️ by AI Assistant</p>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
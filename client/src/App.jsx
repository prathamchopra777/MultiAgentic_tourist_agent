import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import { Utensils } from 'lucide-react';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <header className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="w-6 h-6 text-blue-600" />
            <span className="font-bold text-xl text-gray-800">EuroBite AI</span>
          </div>
          <nav>
            <span className="text-sm text-gray-500 font-medium">Factually Grounded Recommendations</span>
          </nav>
        </header>
        
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

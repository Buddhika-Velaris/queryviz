import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SingleAnalysis from './pages/SingleAnalysis';
import Comparison from './pages/Comparison';
import Learn from './pages/Learn';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyze" element={<SingleAnalysis />} />
        <Route path="/compare" element={<Comparison />} />
        <Route path="/learn" element={<Learn />} />
      </Routes>
    </Layout>
  );
}

export default App;

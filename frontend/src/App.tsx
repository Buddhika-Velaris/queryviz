import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import SingleAnalysis from './pages/SingleAnalysis';
import Comparison from './pages/Comparison';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analyze" element={<SingleAnalysis />} />
        <Route path="/compare" element={<Comparison />} />
      </Routes>
    </Layout>
  );
}

export default App;

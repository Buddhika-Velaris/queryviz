import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import RequireVelarisAuth from './components/RequireVelarisAuth';
import Home from './pages/Home';
import SingleAnalysis from './pages/SingleAnalysis';
import Comparison from './pages/Comparison';
import Learn from './pages/Learn';
import Guide from './pages/Guide';
import SchemaValidator from './pages/SchemaValidator';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/learn" element={<Learn />} />
        <Route
          path="/analyze"
          element={
            <RequireVelarisAuth>
              <SingleAnalysis />
            </RequireVelarisAuth>
          }
        />
        <Route
          path="/compare"
          element={
            <RequireVelarisAuth>
              <Comparison />
            </RequireVelarisAuth>
          }
        />
        <Route
          path="/validate"
          element={
            <RequireVelarisAuth>
              <SchemaValidator />
            </RequireVelarisAuth>
          }
        />
        <Route
          path="/guide"
          element={
            <RequireVelarisAuth>
              <Guide />
            </RequireVelarisAuth>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;

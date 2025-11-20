import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center">
                <span className="text-2xl font-bold text-blue-600">QueryViz</span>
                <span className="ml-2 text-sm text-gray-500">PostgreSQL Performance Analyzer</span>
              </Link>
            </div>
            <div className="flex space-x-4">
              <Link
                to="/analyze"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/analyze')
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Single Analysis
              </Link>
              <Link
                to="/compare"
                className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                  isActive('/compare')
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Compare Plans
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

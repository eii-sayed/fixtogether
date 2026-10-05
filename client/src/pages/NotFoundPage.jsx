import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Wrench } from 'lucide-react';
import SEO from '../components/common/SEO';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-6 text-center">
      <SEO title="Page Not Found" description="The page you are looking for does not exist." />
      
      <div className="relative">
        <div className="absolute -inset-4 bg-primary-100/50 dark:bg-primary-900/20 rounded-full blur-xl animate-pulse" />
        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-primary-500 to-emerald-600 rounded-3xl flex items-center justify-center shadow-lg relative transform rotate-12 transition-transform hover:rotate-0 duration-500">
          <Wrench className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
        </div>
      </div>

      <h1 className="mt-8 text-6xl sm:text-8xl font-black text-gray-900 dark:text-white tracking-tighter">
        404
      </h1>
      
      <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-200">
        Missing a Part!
      </h2>
      
      <p className="mt-3 text-sm sm:text-base text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
        It looks like the page you're trying to reach has been misplaced, deleted, or never existed in the first place. Let's get you back on track.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="btn-outline w-full sm:w-auto"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <Link to="/" className="btn-primary w-full sm:w-auto">
          <Home className="w-4 h-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

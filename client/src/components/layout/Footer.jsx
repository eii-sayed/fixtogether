import { Link } from 'react-router-dom';
import { Wrench, Github, Mail, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <Wrench className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white">FixTogether</span>
            </div>
            <p className="text-sm leading-relaxed max-w-md">
              An AI-assisted community platform that helps people repair, reuse, donate, and responsibly recycle damaged and unwanted items.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Platform</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/repair-requests" className="hover:text-white transition-colors">Repair Requests</Link></li>
              <li><Link to="/technicians" className="hover:text-white transition-colors">Find Technicians</Link></li>
              <li><Link to="/donations" className="hover:text-white transition-colors">Donations</Link></li>
              <li><Link to="/parts" className="hover:text-white transition-colors">Spare Parts</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><a href="mailto:support@fixtogether.com" className="hover:text-white transition-colors">Contact</a></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© {new Date().getFullYear()} FixTogether. Built with <Heart className="w-3 h-3 inline text-red-400" /> for the community.</p>
          <p className="text-xs">University Software Engineering Project</p>
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { Wrench, Shield, Users, Recycle, Zap, ArrowRight, Star, CheckCircle, Leaf, Heart } from 'lucide-react';

const features = [
  { icon: Zap, title: 'AI-Powered Diagnosis', desc: 'Upload your item details and get instant AI analysis with safety-first recommendations and technician matching.', color: 'bg-purple-100 text-purple-600' },
  { icon: Users, title: 'Community Technicians', desc: 'Connect with verified, skilled technicians in your area. Review ratings, expertise, and get competitive quotes.', color: 'bg-blue-100 text-blue-600' },
  { icon: Shield, title: 'Safety First', desc: 'Built-in safety rules detect hazardous issues before any AI suggestions. Critical risks are flagged immediately.', color: 'bg-red-100 text-red-600' },
  { icon: Recycle, title: 'Repair, Reuse, Recycle', desc: 'If repair isn\'t viable, we guide you to donate, recover parts, or recycle responsibly through verified organizations.', color: 'bg-green-100 text-green-600' },
  { icon: Heart, title: 'Donate & Give Back', desc: 'Connect with community organizations that need donated items. Schedule pickups and track your impact.', color: 'bg-pink-100 text-pink-600' },
  { icon: Star, title: 'Transparent Workflow', desc: 'Track every step from diagnosis to completion with full transparency, warranties, and honest reviews.', color: 'bg-amber-100 text-amber-600' },
];

const steps = [
  { num: '01', title: 'Submit Your Item', desc: 'Describe the problem, upload photos, and let our AI analyze the issue.' },
  { num: '02', title: 'Get Matched', desc: 'We match you with verified technicians based on skills, ratings, and location.' },
  { num: '03', title: 'Compare Quotes', desc: 'Review transparent quotations with detailed breakdowns and choose the best fit.' },
  { num: '04', title: 'Track & Complete', desc: 'Follow real-time repair progress, confirm completion, and leave a review.' },
];

const stats = [
  { value: '500+', label: 'Items Repaired', icon: Wrench },
  { value: '50+', label: 'Verified Technicians', icon: CheckCircle },
  { value: '200+', label: 'Items Donated', icon: Heart },
  { value: '2 tons', label: 'Waste Diverted', icon: Leaf },
];

export default function LandingPage() {
  return (
    <div className="overflow-hidden">
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-50 via-white to-secondary-50 py-24 sm:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-secondary-200/30 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <Zap className="w-3.5 h-3.5" /> AI-Powered Community Platform
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Don't Throw It Away.
              <span className="block bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent mt-2">Fix It Together.</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              A community platform that connects you with verified repair technicians,
              donation organizations, and recycling facilities — powered by AI to make
              every item's journey sustainable.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary btn-lg w-full sm:w-auto">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/register?role=technician" className="btn-outline btn-lg w-full sm:w-auto">
                Join as Technician
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">Everything You Need to Fix, Reuse & Donate</h2>
            <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">Built with safety, transparency, and sustainability at its core.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="card card-body hover:shadow-md transition-shadow duration-300 group">
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900">How It Works</h2>
            <p className="mt-4 text-lg text-gray-600">Four simple steps from broken to fixed.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="relative">
                <div className="text-5xl font-black text-primary-100 mb-3">{num}</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Fix Together?</h2>
          <p className="text-lg text-primary-100 mb-8 max-w-2xl mx-auto">
            Join our growing community of repair enthusiasts, skilled technicians, and organizations
            committed to reducing waste.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register" className="btn bg-white text-primary-700 hover:bg-primary-50 btn-lg font-semibold shadow-lg">
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

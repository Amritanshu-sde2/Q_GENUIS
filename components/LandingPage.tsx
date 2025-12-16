import React from 'react';
import { Icons } from './ui/Icons';

interface LandingPageProps {
  onGetStarted: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex flex-col">
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2 text-indigo-600 font-bold text-2xl">
          <Icons.AI className="w-8 h-8" />
          <span>Q-Genius</span>
        </div>
        <button 
          onClick={onGetStarted}
          className="px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
        >
          Login
        </button>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="inline-block px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
            New: Gemini 2.5 Integration 🚀
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Smart Assessments <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Powered by AI
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Streamline your examination process. Generate inclusive, curriculum-aligned question papers in seconds using advanced AI.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <button 
              onClick={onGetStarted}
              className="px-8 py-4 bg-slate-900 text-white rounded-lg text-lg font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2"
            >
              Get Started Now <Icons.Check className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-lg text-lg font-bold hover:bg-slate-50 transition">
              Learn More
            </button>
          </div>
        </div>

        <div className="mt-24 grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
          <FeatureCard 
            icon={<Icons.Upload className="w-6 h-6 text-blue-500" />}
            title="Curriculum Parsing"
            description="Upload your syllabus and let AI identify key topics and learning outcomes automatically."
          />
          <FeatureCard 
            icon={<Icons.AI className="w-6 h-6 text-purple-500" />}
            title="AI Generation"
            description="Create balanced question papers with adjustable difficulty levels using Gemini 2.5."
          />
          <FeatureCard 
            icon={<Icons.File className="w-6 h-6 text-green-500" />}
            title="Format Export"
            description="Export to PDF/DOC with your college's specific formatting and templates."
          />
        </div>
      </main>

      <footer className="py-8 text-center text-slate-400 text-sm">
        © 2024 Q-Genius. All rights reserved.
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-6 bg-white rounded-2xl shadow-xl shadow-slate-100 border border-slate-100 text-left hover:-translate-y-1 transition-transform duration-300">
    <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center mb-4">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
    <p className="text-slate-600">{description}</p>
  </div>
);

export default LandingPage;

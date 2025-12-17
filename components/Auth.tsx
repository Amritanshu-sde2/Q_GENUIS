import React, { useState } from 'react';
import { Icons } from './ui/Icons';
import { sendWelcomeEmail, EmailContent } from '../lib/mailgun';
import { User, Role } from '../types';
import { 
  supabase, 
  isSupabaseConfigured, 
  saveSupabaseConfig, 
  clearSupabaseConfig, 
  isDemoMode, 
  enableDemoMode 
} from '../lib/supabase';

interface AuthProps {
  onLogin: (user: User) => void;
  existingUsers?: User[];
}

export const Auth: React.FC<AuthProps> = ({ onLogin, existingUsers = [] }) => {
  // If backend is not configured AND not in demo mode, show configuration screen
  if (!isSupabaseConfigured && !isDemoMode) {
      return <BackendConfig />;
  }

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FACULTY');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorAction, setErrorAction] = useState<'NONE' | 'ENABLE_DEMO'>('NONE');
  
  // State for Simulated Email Modal
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailPreview, setEmailPreview] = useState<EmailContent | null>(null);
  const [pendingUserLogin, setPendingUserLogin] = useState<User | null>(null);

  // State for Google Pre-check
  const [showGoogleCheck, setShowGoogleCheck] = useState(false);

  // Called when user clicks "Continue with Google"
  const initiateGoogleLogin = () => {
      // If we are already in demo mode, just login mock user
      if (isDemoMode) {
        handleGoogleMock();
        return;
      }
      // Otherwise, show the pre-check modal to prevent 403 errors
      setShowGoogleCheck(true);
  };

  const handleGoogleMock = () => {
    setLoading(true);
    setTimeout(() => {
        const demoUser: User = { 
            id: 'google-demo', 
            email: 'demo-user@gmail.com', 
            name: 'Demo Google User', 
            role: 'FACULTY' 
        };
        onLogin(demoUser);
    }, 800);
  };

  const handleRealGoogleLogin = async () => {
    setShowGoogleCheck(false);
    setLoading(true);
    setMessage('');
    setErrorAction('NONE');

    try {
      // Removed queryParams to reduce chance of 403 errors
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin, 
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error("Google Login Error:", err);
      setMessage(err.message || 'Failed to sign in with Google.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setErrorAction('NONE');

    if (isDemoMode) {
        mockFallback();
        return;
    }

    try {
      if (isLogin) {
        // --- LOGIN FLOW ---
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) throw error;

        if (data.user) {
           const appUser: User = {
             id: data.user.id,
             email: data.user.email!,
             name: data.user.user_metadata.full_name || email.split('@')[0],
             role: data.user.user_metadata.role || 'FACULTY'
           };
           onLogin(appUser);
        }
      } else {
        // --- SIGNUP FLOW ---
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: name,
                    role: role
                }
            }
        });

        if (error) throw error;

        if (data.user) {
            // Trigger the simulated email
            const emailContent = await sendWelcomeEmail(name, email);
            setEmailPreview(emailContent);
            
            if (data.session) {
                const appUser: User = {
                    id: data.user.id,
                    email: data.user.email!,
                    name: name,
                    role: role
                };
                setPendingUserLogin(appUser);
            } else {
                setMessage('Account created! Please check your email to confirm.');
            }
            setShowEmailModal(true);
        }
      }
    } catch (err: any) {
        console.error(err);
        setMessage(err.message || 'Authentication failed. Please check credentials.');
    } finally {
        setLoading(false);
    }
  };

  const mockFallback = () => {
    setTimeout(async () => {
        if (isLogin) {
            // Demo credentials check
            if (email === 'admin@qgenius.com') onLogin({ id: '1', email, name: 'Admin User', role: 'ADMIN' });
            else if (email === 'super@qgenius.com') onLogin({ id: '3', email, name: 'Super Admin', role: 'SUPER_ADMIN' });
            else onLogin({ id: '99', email, name: 'Demo Faculty', role: 'FACULTY' });
        } else {
            // Demo Signup - Show the Email Modal
            const emailContent = await sendWelcomeEmail(name, email);
            setEmailPreview(emailContent);
            setPendingUserLogin({ id: Date.now().toString(), email, name, role });
            setShowEmailModal(true);
        }
        setLoading(false);
    }, 1000);
  };

  const closeEmailModal = () => {
    setShowEmailModal(false);
    if (pendingUserLogin) {
        onLogin(pendingUserLogin);
    } else {
        setIsLogin(true);
    }
  };

  return (
    <>
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 relative">
          
          <button 
            onClick={clearSupabaseConfig} 
            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-slate-600 transition"
            title="Reset Backend Configuration"
          >
            <Icons.Settings size={20} />
          </button>

          <div className="text-center mb-8">
             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icons.AI size={24} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
             <p className="text-slate-500">Q-Genius - AI Question Paper Generator</p>
             {isDemoMode && (
                 <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">
                     Demo Mode Active
                 </span>
             )}
          </div>

          {message && (
             <div className={`p-4 rounded-lg text-sm mb-6 flex flex-col gap-2 shadow-sm ${message.includes('created') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                    <Icons.Alert className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <span className="leading-relaxed">{message}</span>
                </div>
                {errorAction === 'ENABLE_DEMO' && (
                    <button 
                        onClick={enableDemoMode}
                        className="ml-8 text-xs font-bold underline hover:no-underline text-left"
                    >
                        Skip configuration and use Demo Mode &rarr;
                    </button>
                )}
             </div>
          )}

          <div className="space-y-4">
             <button 
                type="button"
                onClick={initiateGoogleLogin}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition flex justify-center items-center gap-2"
             >
                <Icons.Google className="w-5 h-5" />
                Continue with Google
             </button>

             {!isDemoMode && (
                 <button 
                    type="button" 
                    onClick={enableDemoMode}
                    className="w-full py-2 text-slate-500 text-sm font-medium hover:text-indigo-600 transition"
                 >
                    Continue as Guest (Demo Mode)
                 </button>
             )}

             <div className="flex items-center gap-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400 font-medium">OR EMAIL</span>
                <div className="h-px bg-slate-200 flex-1"></div>
             </div>

             <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                      <input 
                         type="text" 
                         required 
                         className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                         value={name}
                         onChange={e => setName(e.target.value)}
                      />
                    </div>
                    <div>
                       <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                       <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
                          {(['FACULTY', 'ADMIN', 'SUPER_ADMIN'] as Role[]).map((r) => (
                            <button
                              key={r}
                              type="button"
                              onClick={() => setRole(r)}
                              className={`flex-1 py-2 text-xs font-bold rounded-md transition ${role === r ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                            >
                              {r.replace('_', ' ')}
                            </button>
                          ))}
                       </div>
                    </div>
                  </>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                  <input 
                     type="email" 
                     required 
                     className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                     value={email}
                     onChange={e => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                     type="password" 
                     required 
                     className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                     value={password}
                     onChange={e => setPassword(e.target.value)}
                  />
                </div>

                <button 
                   type="submit" 
                   disabled={loading}
                   className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition flex justify-center items-center"
                >
                   {loading ? <Icons.Spinner className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
                </button>
             </form>
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
             {isLogin ? "Don't have an account? " : "Already have an account? "}
             <button onClick={() => setIsLogin(!isLogin)} className="text-indigo-600 font-bold hover:underline">
                {isLogin ? 'Sign Up' : 'Log In'}
             </button>
          </p>
       </div>
    </div>

    {/* Google Login Check Modal */}
    {showGoogleCheck && (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200">
             <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                   <Icons.Alert size={24} />
                </div>
             </div>
             <h3 className="text-lg font-bold text-center text-slate-900 mb-2">Configuration Check</h3>
             <p className="text-sm text-slate-600 text-center mb-6">
                Have you added <strong>{window.location.origin}</strong> to your Google Cloud & Supabase Redirect URIs?
                <br/><br/>
                <span className="text-xs text-orange-600 font-medium">Without this, Google will show a 403 Error.</span>
             </p>
             <div className="space-y-3">
                <button 
                   onClick={handleRealGoogleLogin}
                   className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition"
                >
                   Yes, I configured it (Proceed)
                </button>
                <button 
                   onClick={() => { setShowGoogleCheck(false); handleGoogleMock(); }}
                   className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition"
                >
                   No, use Simulated Login
                </button>
             </div>
             <button onClick={() => setShowGoogleCheck(false)} className="mt-4 w-full text-xs text-slate-400 hover:text-slate-600">Cancel</button>
          </div>
      </div>
    )}

    {/* Simulated Inbox Modal */}
    {showEmailModal && emailPreview && (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
           <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2 font-bold">
                 <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-sm">
                   <Icons.File className="text-white" size={16} />
                 </div>
                 Simulated Inbox
              </div>
              <button onClick={closeEmailModal} className="text-slate-400 hover:text-white transition">
                <Icons.Close size={24} />
              </button>
           </div>
           
           <div className="p-0">
             {/* Email Header */}
             <div className="bg-slate-50 p-6 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 mb-2">{emailPreview.subject}</h3>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">QG</div>
                   <div className="text-sm">
                      <p className="font-bold text-slate-900">{emailPreview.from}</p>
                      <p className="text-slate-500">to {emailPreview.to}</p>
                   </div>
                </div>
             </div>
             
             {/* Email Body */}
             <div className="p-8 bg-white text-slate-700 whitespace-pre-wrap leading-relaxed font-sans text-sm md:text-base">
                {emailPreview.text}
             </div>

             {/* Footer Actions */}
             <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button 
                  onClick={closeEmailModal}
                  className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                >
                  Verify & Continue to App <Icons.Check size={16} />
                </button>
             </div>
           </div>
        </div>
      </div>
    )}
    </>
  );
};

const BackendConfig: React.FC = () => {
    const [url, setUrl] = useState('');
    const [key, setKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if(!url || !key) return;
        setIsLoading(true);
        saveSupabaseConfig(url, key);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                        <Icons.Settings size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Connect to Backend</h2>
                    <p className="text-slate-500 mt-2">
                        Configure your Supabase Project to enable authentication and data storage.
                    </p>
                </div>
                
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                        <input 
                            type="text" 
                            placeholder="https://your-project.supabase.co"
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Anon API Key</label>
                        <input 
                            type="password" 
                            placeholder="public-anon-key"
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            required
                        />
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition flex justify-center items-center gap-2"
                    >
                        {isLoading ? <Icons.Spinner className="animate-spin" /> : 'Connect & Reload'}
                    </button>
                </form>

                <div className="mt-6 space-y-3">
                    <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-600 border border-slate-100">
                        <p className="font-bold mb-1">Supabase Setup Guide:</p>
                        <ul className="list-disc pl-4 space-y-1">
                            <li><strong>Email Auth:</strong> Enabled by default.</li>
                            <li><strong>Google Auth:</strong> Requires Client ID & Secret in <em>Authentication &gt; Providers</em>.</li>
                        </ul>
                    </div>
                </div>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-sm"><span className="bg-white px-2 text-slate-500">OR</span></div>
                </div>

                <button 
                    onClick={enableDemoMode}
                    className="w-full py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition"
                >
                    Use Demo Mode (No Backend)
                </button>
            </div>
        </div>
    );
}
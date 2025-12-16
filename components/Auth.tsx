import React, { useState } from 'react';
import { Icons } from './ui/Icons';
import { sendWelcomeEmail } from '../lib/mailgun';
import { User, Role } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthProps {
  onLogin: (user: User) => void;
  existingUsers?: User[];
}

export const Auth: React.FC<AuthProps> = ({ onLogin, existingUsers = [] }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('FACULTY');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    // Fallback if no backend configured
    if (!isSupabaseConfigured) {
        setTimeout(() => {
            alert('Demo Mode: Google Login simulated because no Supabase keys were found.');
            const demoUser: User = { 
                id: 'google-demo-user', 
                email: 'demo-google@qgenius.com', 
                name: 'Google Demo User', 
                role: 'FACULTY' 
            };
            onLogin(demoUser);
        }, 1000);
        return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin, 
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    // Fallback if no backend configured
    if (!isSupabaseConfigured) {
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
            // Trigger Welcome Email via simulated Mailgun
            await sendWelcomeEmail(name, email);
            
            setMessage('Account created! Please check your email to confirm or sign in.');
            
            if (data.session) {
                const appUser: User = {
                    id: data.user.id,
                    email: data.user.email!,
                    name: name,
                    role: role
                };
                onLogin(appUser);
            } else {
                setIsLogin(true); 
            }
        }
      }
    } catch (err: any) {
        console.error(err);
        setMessage(err.message || 'Authentication failed. Please try again.');
    } finally {
        setLoading(false);
    }
  };

  const mockFallback = () => {
    setTimeout(() => {
        if (isLogin) {
            // Check against existing users for demo purposes or default to new user
            const existing = existingUsers.find(u => u.email === email);
            
            if (email === 'admin@qgenius.com') onLogin({ id: '1', email, name: 'Admin User', role: 'ADMIN' });
            else if (email === 'super@qgenius.com') onLogin({ id: '3', email, name: 'Super Admin', role: 'SUPER_ADMIN' });
            else if (existing) onLogin(existing);
            else onLogin({ id: '99', email, name: 'Demo Faculty', role: 'FACULTY' });
        } else {
            sendWelcomeEmail(name, email);
            onLogin({ id: Date.now().toString(), email, name, role });
        }
        setLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
             <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Icons.AI size={24} />
             </div>
             <h2 className="text-2xl font-bold text-slate-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
             <p className="text-slate-500">Q-Genius - AI Question Paper Generator</p>
             {!isSupabaseConfigured && (
                 <p className="text-xs text-orange-600 mt-2 font-medium bg-orange-50 p-1 rounded">
                     ⚠️ Demo Mode Active (No Backend Connected)
                 </p>
             )}
          </div>

          {message && (
             <div className={`p-3 rounded-lg text-sm mb-4 ${message.includes('created') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message}
             </div>
          )}

          <div className="space-y-4">
             {/* Google Login */}
             <button 
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition flex justify-center items-center gap-2"
             >
                <Icons.Google className="w-5 h-5" />
                Continue with Google
             </button>

             <div className="flex items-center gap-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400 font-medium">OR</span>
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
                   {loading ? <Icons.Spinner className="animate-spin" /> : (isLogin ? 'Sign In with Email' : 'Sign Up with Email')}
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
  );
};
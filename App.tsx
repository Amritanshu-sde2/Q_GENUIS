import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import { Auth } from './components/Auth';
import { FacultyDashboard } from './components/DashboardFaculty';
import { AdminDashboard } from './components/DashboardAdmin';
import { SuperAdminDashboard } from './components/DashboardSuperAdmin';
import { User, QuestionPaper, Question, Role } from './types';
import { MOCK_USERS, supabase, isSupabaseConfigured } from './lib/supabase';

// Helper to create mock questions
const createMockQuestions = (count: number, diff: 'EASY' | 'MEDIUM' | 'HARD'): Question[] => 
  Array.from({ length: count }).map((_, i) => ({
    id: `mq-${Date.now()}-${i}`,
    text: `Sample ${diff} question ${i + 1}`,
    type: 'MCQ',
    options: ['A', 'B', 'C', 'D'],
    correctAnswer: 'A',
    marks: diff === 'EASY' ? 1 : diff === 'MEDIUM' ? 3 : 5,
    difficulty: diff
  }));

// Initial mock data so dashboards aren't empty
const INITIAL_PAPERS: QuestionPaper[] = [
  {
    id: 'p-1',
    title: 'Mid-Term: Data Structures',
    subject: 'Computer Science',
    facultyId: '2',
    facultyName: 'Dr. Smith',
    status: 'APPROVED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
    questions: [
      ...createMockQuestions(5, 'EASY'),
      ...createMockQuestions(3, 'MEDIUM')
    ],
  },
  {
    id: 'p-2',
    title: 'Quiz 1: React Basics',
    subject: 'Web Development',
    facultyId: '2',
    facultyName: 'Dr. Smith',
    status: 'PENDING',
    createdAt: new Date().toISOString(), // Today
    questions: [
      ...createMockQuestions(2, 'EASY'),
      ...createMockQuestions(5, 'MEDIUM'),
      ...createMockQuestions(3, 'HARD')
    ],
  }
];

function App() {
  const [view, setView] = useState<'LANDING' | 'AUTH' | 'DASHBOARD'>('LANDING');
  const [user, setUser] = useState<User | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>(INITIAL_PAPERS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS); // Lifted state for User Management
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Initialize Supabase Session Listener
  useEffect(() => {
    // If we are in demo mode (no valid URL), skip the network call entirely
    if (!isSupabaseConfigured) {
        setIsAuthChecking(false);
        return;
    }

    const initSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const role = (session.user.user_metadata.role as Role) || 'FACULTY';
                const name = session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User';
                
                setUser({
                    id: session.user.id,
                    email: session.user.email!,
                    name: name,
                    role: role
                });
                setView('DASHBOARD');
            }
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsAuthChecking(false);
        }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
            const role = (session.user.user_metadata.role as Role) || 'FACULTY';
            const name = session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'User';
            setUser({
                id: session.user.id,
                email: session.user.email!,
                name: name,
                role: role
            });
            setView('DASHBOARD');
        }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setView('DASHBOARD');
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
        await supabase.auth.signOut();
    }
    setUser(null);
    setView('LANDING');
  };

  const handleSubmitPaper = (paper: QuestionPaper) => {
    const newPaper = { ...paper, id: `paper-${Date.now()}` };
    setPapers(prev => [newPaper, ...prev]);
    alert("Paper submitted successfully for approval!");
  };

  const handleUpdateStatus = (id: string, status: 'APPROVED' | 'REJECTED', feedback?: string) => {
    setPapers(prev => prev.map(p => 
      p.id === id ? { ...p, status, feedback } : p
    ));
  };

  // User Management Handlers
  const handleAddUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `u-${Date.now()}` };
    setUsers([...users, newUser]);
  };

  const handleUpdateUser = (userData: User) => {
    setUsers(users.map(u => u.id === userData.id ? userData : u));
  };

  const handleDeleteUser = (id: string) => {
    setUsers(users.filter(u => u.id !== id));
  };

  if (isAuthChecking) {
     return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600 font-bold">Loading Q-Genius...</div>;
  }

  if (view === 'LANDING') {
    return <LandingPage onGetStarted={() => setView('AUTH')} />;
  }

  if (view === 'AUTH') {
    return <Auth onLogin={handleLogin} existingUsers={users} />;
  }

  // Route based on Role
  if (user?.role === 'FACULTY') {
    return <FacultyDashboard user={user} onLogout={handleLogout} onSubmitPaper={handleSubmitPaper} />;
  }

  if (user?.role === 'ADMIN') {
    return <AdminDashboard user={user} papers={papers} onUpdateStatus={handleUpdateStatus} onLogout={handleLogout} />;
  }

  if (user?.role === 'SUPER_ADMIN') {
    return (
      <SuperAdminDashboard 
        onLogout={handleLogout} 
        papers={papers}
        users={users}
        onAddUser={handleAddUser}
        onUpdateUser={handleUpdateUser}
        onDeleteUser={handleDeleteUser}
        onUpdatePaperStatus={handleUpdateStatus}
      />
    );
  }

  return <div>Unknown Role</div>;
}

export default App;
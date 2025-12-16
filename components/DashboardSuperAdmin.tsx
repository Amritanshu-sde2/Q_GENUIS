import React, { useMemo, useState } from 'react';
import { Icons } from './ui/Icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { QuestionPaper, User, Role } from '../types';

interface SuperAdminDashboardProps {
  onLogout: () => void;
  papers: QuestionPaper[];
  users: User[];
  onAddUser: (user: Omit<User, 'id'>) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onUpdatePaperStatus: (id: string, status: 'APPROVED' | 'REJECTED', feedback?: string) => void;
}

const COLORS = ['#4f46e5', '#818cf8', '#c7d2fe'];

type Tab = 'OVERVIEW' | 'USERS' | 'PAPERS';

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({ 
  onLogout, 
  papers, 
  users, 
  onAddUser, 
  onUpdateUser, 
  onDeleteUser,
  onUpdatePaperStatus
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // -- Data Processing for Overview --
  const stats = useMemo(() => {
    const totalPapers = papers.length;
    const pendingReviews = papers.filter(p => p.status === 'PENDING').length;
    const activeFaculties = users.filter(u => u.role === 'FACULTY').length;
    const totalQuestions = papers.reduce((acc, p) => acc + p.questions.length, 0);
    return { totalPapers, pendingReviews, activeFaculties, totalQuestions };
  }, [papers, users]);

  const activityData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return last7Days.map(date => {
      const dayName = days[date.getDay()];
      const count = papers.filter(p => {
        const pDate = new Date(p.createdAt);
        return pDate.getDate() === date.getDate() && 
               pDate.getMonth() === date.getMonth() && 
               pDate.getFullYear() === date.getFullYear();
      }).length;
      return { name: dayName, papers: count };
    });
  }, [papers]);

  const pieData = useMemo(() => {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    papers.forEach(p => {
      p.questions.forEach(q => {
        if (counts[q.difficulty] !== undefined) counts[q.difficulty]++;
      });
    });
    return [
      { name: 'Easy', value: counts.EASY },
      { name: 'Medium', value: counts.MEDIUM },
      { name: 'Hard', value: counts.HARD },
    ].filter(d => d.value > 0);
  }, [papers]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {/* Sidebar Navigation */}
       <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-30">
          <div className="p-6 font-bold text-xl flex items-center gap-2 border-b border-slate-800">
             <Icons.Chart className="text-indigo-400" /> Super Admin
          </div>
          <nav className="flex-1 p-4 space-y-2">
             <SidebarItem active={activeTab === 'OVERVIEW'} icon={<Icons.Dashboard size={18}/>} label="Overview" onClick={() => setActiveTab('OVERVIEW')} />
             <SidebarItem active={activeTab === 'USERS'} icon={<Icons.Users size={18}/>} label="User Management" onClick={() => setActiveTab('USERS')} />
             <SidebarItem active={activeTab === 'PAPERS'} icon={<Icons.File size={18}/>} label="Paper Overrides" onClick={() => setActiveTab('PAPERS')} />
          </nav>
          <div className="p-4 border-t border-slate-800">
             <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition w-full px-4 py-2 hover:bg-slate-800 rounded-lg">
                <Icons.Logout size={16} /> Sign Out
             </button>
          </div>
       </aside>

       {/* Main Content Area */}
       <main className="flex-1 ml-64 p-8 overflow-y-auto">
          <header className="flex justify-between items-center mb-8">
             <h1 className="text-2xl font-bold text-slate-900">
               {activeTab === 'OVERVIEW' && 'Dashboard Overview'}
               {activeTab === 'USERS' && 'User Management'}
               {activeTab === 'PAPERS' && 'System Paper Logs'}
             </h1>
             <div className="flex items-center gap-2 text-sm text-slate-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                Live System Status
             </div>
          </header>

          {activeTab === 'OVERVIEW' && (
            <div className="space-y-8">
               <div className="grid md:grid-cols-4 gap-6">
                  <StatCard label="Total Papers" value={stats.totalPapers} icon={<Icons.File className="text-blue-500" />} />
                  <StatCard label="Pending Review" value={stats.pendingReviews} icon={<Icons.Alert className="text-orange-500" />} />
                  <StatCard label="Active Faculties" value={stats.activeFaculties} icon={<Icons.Users className="text-green-500" />} />
                  <StatCard label="Total Questions" value={stats.totalQuestions} icon={<Icons.AI className="text-purple-500" />} />
               </div>

               <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Icons.Chart size={18} /> Activity</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={activityData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="papers" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2"><Icons.AI size={18} /> Difficulty</h3>
                      <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'USERS' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                   <h3 className="font-bold text-slate-700">Registered Users</h3>
                   <button 
                     onClick={() => { setEditingUser(null); setIsUserModalOpen(true); }}
                     className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                   >
                     <Icons.Plus size={16} /> Add New User
                   </button>
                </div>
                <table className="w-full text-left">
                   <thead className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                      <tr>
                         <th className="px-6 py-4">Name</th>
                         <th className="px-6 py-4">Email</th>
                         <th className="px-6 py-4">Role</th>
                         <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 text-sm">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50 transition group">
                           <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                           <td className="px-6 py-4 text-slate-500">{u.email}</td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                               u.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' :
                               u.role === 'ADMIN' ? 'bg-orange-100 text-orange-700' :
                               'bg-blue-100 text-blue-700'
                             }`}>
                               {u.role.replace('_', ' ')}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                                 <button 
                                   onClick={() => { setEditingUser(u); setIsUserModalOpen(true); }}
                                   className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                 >
                                    Edit
                                 </button>
                                 <button 
                                   onClick={() => { if(window.confirm('Delete user?')) onDeleteUser(u.id); }}
                                   className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                 >
                                    <Icons.Delete size={16} />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}

          {activeTab === 'PAPERS' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                   <h3 className="font-bold text-slate-700">All Papers (System Logs)</h3>
                   <p className="text-xs text-slate-500 mt-1">Super Admins can override approval status here.</p>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead className="bg-white border-b border-slate-100 text-slate-500 text-xs uppercase font-semibold">
                         <tr>
                            <th className="px-6 py-4">Title</th>
                            <th className="px-6 py-4">Faculty</th>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Current Status</th>
                            <th className="px-6 py-4 text-right">Override Actions</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                         {papers.map(p => (
                           <tr key={p.id} className="hover:bg-slate-50 transition">
                              <td className="px-6 py-4 font-medium text-slate-900">{p.title}</td>
                              <td className="px-6 py-4 text-slate-500">{p.facultyName}</td>
                              <td className="px-6 py-4 text-slate-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4">
                                 <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    p.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                    p.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                 }`}>
                                    {p.status}
                                 </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => onUpdatePaperStatus(p.id, 'APPROVED')}
                                      className="px-3 py-1 bg-white border border-green-200 text-green-700 hover:bg-green-50 rounded text-xs font-bold"
                                    >
                                       Approve
                                    </button>
                                    <button 
                                      onClick={() => onUpdatePaperStatus(p.id, 'REJECTED', 'Rejected by Super Admin Override')}
                                      className="px-3 py-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded text-xs font-bold"
                                    >
                                       Reject
                                    </button>
                                 </div>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             </div>
          )}
       </main>

       {/* User Modal */}
       {isUserModalOpen && (
         <UserModal 
           user={editingUser} 
           onClose={() => setIsUserModalOpen(false)} 
           onSave={(u) => {
              if (editingUser) onUpdateUser({ ...editingUser, ...u } as User);
              else onAddUser(u as Omit<User, 'id'>);
              setIsUserModalOpen(false);
           }} 
         />
       )}
    </div>
  );
};

// Sub-components for cleaner file
const SidebarItem = ({ active, icon, label, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const StatCard = ({ label, value, icon }: any) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
     <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
        {icon}
     </div>
     <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
     </div>
  </div>
);

const UserModal = ({ user, onClose, onSave }: { user: User | null, onClose: () => void, onSave: (u: Partial<User>) => void }) => {
   const [formData, setFormData] = useState({
      name: user?.name || '',
      email: user?.email || '',
      role: user?.role || 'FACULTY'
   });

   return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
         <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{user ? 'Edit User' : 'Add New User'}</h2>
            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                  <input className="w-full p-2 border rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input className="w-full p-2 border rounded-lg" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                  <select className="w-full p-2 border rounded-lg" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                     <option value="FACULTY">Faculty</option>
                     <option value="ADMIN">Admin</option>
                     <option value="SUPER_ADMIN">Super Admin</option>
                  </select>
               </div>
               <div className="flex gap-2 pt-4">
                  <button onClick={onClose} className="flex-1 py-2 text-slate-600 hover:bg-slate-50 rounded-lg">Cancel</button>
                  <button onClick={() => onSave(formData as any)} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Save</button>
               </div>
            </div>
         </div>
      </div>
   );
};
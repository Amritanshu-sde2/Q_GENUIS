import React, { useState } from 'react';
import { Icons } from './ui/Icons';
import { QuestionPaper } from '../types';

interface AdminDashboardProps {
  user: any;
  papers: QuestionPaper[];
  onUpdateStatus: (id: string, status: 'APPROVED' | 'REJECTED', feedback?: string) => void;
  onLogout: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, papers, onUpdateStatus, onLogout }) => {
  const [selectedPaper, setSelectedPaper] = useState<QuestionPaper | null>(null);
  const [feedback, setFeedback] = useState('');

  const pendingPapers = papers.filter(p => p.status === 'PENDING');

  return (
    <div className="flex h-screen bg-slate-50">
      <aside className="w-64 bg-slate-900 text-white hidden md:flex flex-col">
        <div className="p-6 font-bold text-xl flex items-center gap-2">
           <Icons.Check className="text-green-400" /> Admin Panel
        </div>
        <nav className="flex-1 p-4">
           <div className="px-3 py-2 bg-slate-800 rounded-lg text-white font-medium flex items-center gap-3">
              <Icons.File size={18} /> Review Queue 
              {pendingPapers.length > 0 && <span className="bg-red-500 text-xs px-2 py-0.5 rounded-full">{pendingPapers.length}</span>}
           </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
           <button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition">
             <Icons.Logout size={16} /> Logout
           </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        {!selectedPaper ? (
          <div>
            <h1 className="text-2xl font-bold mb-6">Pending Approvals</h1>
            {pendingPapers.length === 0 ? (
               <div className="text-center py-20 text-slate-400">
                  <Icons.Approve className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>All caught up! No papers pending review.</p>
               </div>
            ) : (
              <div className="grid gap-4">
                 {pendingPapers.map(paper => (
                   <div key={paper.id} className="bg-white p-6 rounded-lg shadow-sm border border-slate-200 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-lg">{paper.title}</h3>
                        <p className="text-sm text-slate-500">Submitted by {paper.facultyName} • {paper.questions.length} Questions</p>
                      </div>
                      <button 
                        onClick={() => setSelectedPaper(paper)}
                        className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-sm"
                      >
                        Review
                      </button>
                   </div>
                 ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-lg rounded-xl overflow-hidden">
             <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 sticky top-0 z-10">
                <button onClick={() => setSelectedPaper(null)} className="text-sm text-slate-500 hover:text-slate-900 font-medium">← Back to Queue</button>
                <div className="flex gap-2">
                   <button 
                     onClick={() => {
                        onUpdateStatus(selectedPaper.id, 'REJECTED', feedback || 'See comments');
                        setSelectedPaper(null);
                        setFeedback('');
                     }}
                     className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold hover:bg-red-200 flex items-center gap-2"
                   >
                     <Icons.Reject size={16} /> Reject
                   </button>
                   <button 
                     onClick={() => {
                        onUpdateStatus(selectedPaper.id, 'APPROVED');
                        setSelectedPaper(null);
                     }}
                     className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 flex items-center gap-2"
                   >
                     <Icons.Approve size={16} /> Approve
                   </button>
                </div>
             </div>

             <div className="p-8">
                <h1 className="text-3xl font-bold text-center mb-2">{selectedPaper.title}</h1>
                <p className="text-center text-slate-500 mb-8">{selectedPaper.subject} • 1 Hour • 50 Marks</p>
                
                <div className="space-y-6">
                   {selectedPaper.questions.map((q, i) => (
                     <div key={q.id} className="pb-4 border-b border-slate-100 last:border-0">
                        <div className="flex gap-3">
                           <span className="font-bold text-slate-400">{i + 1}.</span>
                           <div className="flex-1">
                              <p className="font-medium text-lg mb-2">{q.text}</p>
                              {q.type === 'MCQ' && (
                                <div className="ml-4 space-y-1">
                                   {q.options?.map((opt, idx) => (
                                      <div key={idx} className="text-slate-600 flex items-center gap-2">
                                         <div className="w-4 h-4 rounded-full border border-slate-300"></div> {opt}
                                      </div>
                                   ))}
                                </div>
                              )}
                              <p className="mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                                 {q.difficulty} • {q.marks} Marks
                              </p>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>

                <div className="mt-8 bg-slate-50 p-6 rounded-lg">
                   <h3 className="font-bold text-sm text-slate-700 mb-2">Feedback / Rejection Reason</h3>
                   <textarea 
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm"
                      placeholder="Enter feedback if rejecting..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                   />
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};
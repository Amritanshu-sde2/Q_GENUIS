import React, { useState, useRef } from 'react';
import { Icons } from './ui/Icons';
import { generateQuestionsFromPrompt, generateQuestionsFromCurriculum, parseQuestionsFromRawText } from '../lib/gemini';
import { Question, QuestionPaper, PaperTemplate } from '../types';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Fix for import structure differences in some ESM environments (esm.sh)
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Set worker source for PDF.js
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface FacultyDashboardProps {
  user: any;
  onLogout: () => void;
  onSubmitPaper: (paper: QuestionPaper) => void;
}

export const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ user, onLogout, onSubmitPaper }) => {
  const [view, setView] = useState<'HOME' | 'CREATE_PROMPT' | 'CREATE_CURRICULUM' | 'UPLOAD_PREVIOUS' | 'EDITOR'>('HOME');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Paper State
  const [currentPaper, setCurrentPaper] = useState<Partial<QuestionPaper>>({
    title: '',
    subject: '',
    questions: [],
    status: 'DRAFT'
  });

  // Template State
  const [savedTemplates, setSavedTemplates] = useState<PaperTemplate[]>([
    { id: 't1', name: 'University_Standard_A4.docx', type: 'DOCX', date: '2024-02-01' },
    { id: 't2', name: 'Internal_Assessment_Excel.xlsx', type: 'XLSX', date: '2024-01-20' },
    { id: 't3', name: 'Legacy_Format.pdf', type: 'PDF', date: '2023-11-15' }
  ]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  // Staging State for OCR/Selection
  const [extractedQuestions, setExtractedQuestions] = useState<Question[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  
  // Form Inputs
  const [subject, setSubject] = useState('');
  const [prompt, setPrompt] = useState('');
  
  // New Fields State
  const [universityName, setUniversityName] = useState('');
  const [examDate, setExamDate] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [enrollmentCode, setEnrollmentCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [uploadedFormatName, setUploadedFormatName] = useState('');

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);
  const formatInputRef = useRef<HTMLInputElement>(null);

  // -- Handlers --

  const handleGenerate = async (method: 'PROMPT' | 'CURRICULUM', input: string) => {
    setLoading(true);
    setLoadingText('Generating questions...');
    try {
      let questions: Question[] = [];
      if (method === 'PROMPT') {
        questions = await generateQuestionsFromPrompt(input, 10, subject || 'General');
      } else {
        questions = await generateQuestionsFromCurriculum(input);
      }
      setCurrentPaper({
        ...currentPaper,
        title: `Generated Paper - ${subject || 'Untitled'}`,
        subject: subject,
        questions,
        facultyId: user.id,
        facultyName: user.name,
        createdAt: new Date().toISOString(),
        status: 'DRAFT',
        // New Fields
        universityName,
        examDate,
        maxMarks,
        enrollmentCode,
        instructions,
        formatFile: uploadedFormatName,
        templateId: selectedTemplateId
      });
      setView('EDITOR');
    } catch (e) {
      console.error(e);
      alert("Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleCurriculumUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setLoading(true);
        setLoadingText('Analyzing curriculum...');
        setTimeout(() => {
            handleGenerate('CURRICULUM', "Simulated extracted text from " + file.name);
        }, 2000);
    }
  };

  const handleFormatUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const newTemplate: PaperTemplate = {
        id: `temp-${Date.now()}`,
        name: file.name,
        type: ext,
        date: new Date().toISOString().split('T')[0]
      };
      
      setSavedTemplates(prev => [...prev, newTemplate]);
      setSelectedTemplateId(newTemplate.id);
      setUploadedFormatName(file.name);
      
      alert(`Template "${file.name}" saved successfully!`);
    }
  };

  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLoadingText('Processing document (OCR)...');
    setExtractedQuestions([]);
    setSelectedQuestions(new Set());

    try {
      let text = '';
      if (file.type.includes('image')) {
         const result = await Tesseract.recognize(file, 'eng');
         text = result.data.text;
      } else if (file.type.includes('pdf')) {
         const arrayBuffer = await file.arrayBuffer();
         const pdf = await pdfjs.getDocument(arrayBuffer).promise;
         let fullText = '';
         for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n';
         }
         text = fullText;
      }

      setLoadingText('Parsing questions with AI...');
      const questions = await parseQuestionsFromRawText(text);
      setExtractedQuestions(questions);
      setSelectedQuestions(new Set(questions.map(q => q.id)));

    } catch (err) {
      console.error(err);
      alert("Failed to extract text. Please ensure the file is readable.");
    } finally {
      setLoading(false);
      setLoadingText('');
    }
  };

  const handleAddToPaper = () => {
    const selected = extractedQuestions.filter(q => selectedQuestions.has(q.id));
    setCurrentPaper({
       ...currentPaper,
       title: `Imported Paper - ${new Date().toLocaleDateString()}`,
       subject: 'Imported',
       questions: selected,
       facultyId: user.id,
       facultyName: user.name,
       createdAt: new Date().toISOString(),
       status: 'DRAFT',
       templateId: selectedTemplateId,
       formatFile: uploadedFormatName
    });
    setView('EDITOR');
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedQuestions);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQuestions(newSet);
  };

  const handleExport = () => {
    const template = savedTemplates.find(t => t.id === currentPaper.templateId);
    const fileName = template ? template.name : 'QuestionPaper.pdf';
    alert(`Exporting paper using template: ${fileName}\n\nThis will download the populated file in a real environment.`);
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2 text-indigo-600 font-bold text-xl">
           <Icons.AI className="w-6 h-6" /> Q-Genius
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <SidebarItem active={view === 'HOME'} icon={<Icons.Dashboard size={20} />} label="Dashboard" onClick={() => setView('HOME')} />
          <SidebarItem active={view === 'CREATE_PROMPT'} icon={<Icons.Plus size={20} />} label="New from Prompt" onClick={() => setView('CREATE_PROMPT')} />
          <SidebarItem active={view === 'CREATE_CURRICULUM'} icon={<Icons.Upload size={20} />} label="New from Curriculum" onClick={() => setView('CREATE_CURRICULUM')} />
          <SidebarItem active={view === 'UPLOAD_PREVIOUS'} icon={<Icons.File size={20} />} label="Previous Papers (OCR)" onClick={() => setView('UPLOAD_PREVIOUS')} />
        </nav>
        <div className="p-4 border-t border-slate-100">
           <div className="flex items-center gap-3 mb-4">
             <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
               {user.name[0]}
             </div>
             <div>
               <p className="text-sm font-medium text-slate-900">{user.name}</p>
               <p className="text-xs text-slate-500">Faculty</p>
             </div>
           </div>
           <button onClick={onLogout} className="flex items-center gap-2 text-slate-500 hover:text-red-600 transition text-sm">
             <Icons.Logout size={16} /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 p-6 md:hidden flex justify-between items-center">
             <div className="font-bold text-lg">Q-Genius</div>
             <button onClick={onLogout}><Icons.Logout /></button>
        </header>

        <div className="p-8 max-w-5xl mx-auto">
          {view === 'HOME' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">Welcome back, {user.name} 👋</h2>
              <div className="grid md:grid-cols-3 gap-6">
                 <ActionCard 
                   title="Create from Prompt" 
                   desc="Use AI to generate questions from text instructions."
                   icon={<Icons.AI className="text-purple-600" />}
                   onClick={() => setView('CREATE_PROMPT')}
                 />
                 <ActionCard 
                   title="Upload Curriculum" 
                   desc="Generate papers based on syllabus docs."
                   icon={<Icons.Upload className="text-blue-600" />}
                   onClick={() => setView('CREATE_CURRICULUM')}
                 />
                 <ActionCard 
                   title="Previous Papers (OCR)" 
                   desc="Extract questions from old PDFs or Scanned Images."
                   icon={<Icons.File className="text-orange-600" />}
                   onClick={() => setView('UPLOAD_PREVIOUS')}
                 />
              </div>
            </div>
          )}

          {view === 'CREATE_PROMPT' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
               <h2 className="text-xl font-bold mb-6 flex items-center gap-2"><Icons.AI /> AI Question Generator</h2>
               <div className="space-y-4">
                 {/* Row 0: University Name */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">University / College Name</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Global Tech University"
                      value={universityName}
                      onChange={(e) => setUniversityName(e.target.value)}
                    />
                 </div>

                 {/* Row 1: Subject */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Subject / Topic</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. Data Structures"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                 </div>

                 {/* Row 2: Date and Max Marks */}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Exam Date</label>
                        <input 
                          type="date" 
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={examDate}
                          onChange={(e) => setExamDate(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Maximum Marks</label>
                        <input 
                          type="number" 
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                          value={maxMarks}
                          onChange={(e) => setMaxMarks(Number(e.target.value))}
                        />
                    </div>
                 </div>

                 {/* Row 3: Enrollment Number (Header Field) */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Enrollment Number / Course Code</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      placeholder="e.g. CS-2024-001 or 'Start with Enrollment No.'"
                      value={enrollmentCode}
                      onChange={(e) => setEnrollmentCode(e.target.value)}
                    />
                 </div>

                 {/* Row 4: Upload Format (Updated) */}
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Paper Format / Template</label>
                     <div className="space-y-3">
                        <select 
                            className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                            value={selectedTemplateId}
                            onChange={(e) => {
                                setSelectedTemplateId(e.target.value);
                                const t = savedTemplates.find(t => t.id === e.target.value);
                                if(t) setUploadedFormatName(t.name);
                            }}
                        >
                            <option value="">-- Select Saved Template --</option>
                            {savedTemplates.map(t => (
                                <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                            ))}
                        </select>
                        
                        <div className="text-center text-xs text-slate-400 font-medium">- OR -</div>

                        <div 
                            onClick={() => formatInputRef.current?.click()}
                            className="w-full p-3 border border-dashed border-slate-300 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer text-slate-500 flex items-center justify-center gap-2 transition"
                        >
                            <Icons.Upload size={18} />
                            <span>Upload New Template (Save for future)</span>
                        </div>
                        <input 
                            type="file" 
                            ref={formatInputRef} 
                            className="hidden" 
                            accept=".doc,.docx,.xls,.xlsx,.pdf" 
                            onChange={handleFormatUpload} 
                        />
                     </div>
                 </div>

                 {/* Row 5: Prompt */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Prompt Instructions</label>
                    <textarea 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24"
                      placeholder="e.g. Create 10 MCQs about Binary Search Trees with medium difficulty..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                 </div>

                 {/* Row 6: Important Note */}
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Important Note / Instructions</label>
                    <textarea 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                      placeholder="e.g. All questions are compulsory. Use of calculator is allowed."
                      value={instructions}
                      onChange={(e) => setInstructions(e.target.value)}
                    />
                 </div>

                 <button 
                   onClick={() => handleGenerate('PROMPT', prompt)}
                   disabled={loading || !prompt}
                   className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                 >
                   {loading ? <Icons.Spinner className="animate-spin" /> : <><Icons.AI size={18} /> Generate Questions</>}
                 </button>
               </div>
            </div>
          )}

          {view === 'CREATE_CURRICULUM' && (
             <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                <h2 className="text-xl font-bold mb-6">Upload Curriculum</h2>
                <div 
                  className="border-2 border-dashed border-slate-300 rounded-xl p-12 hover:bg-slate-50 transition cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                   <Icons.Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                   <p className="text-slate-600 font-medium">Click to upload PDF or DOCX</p>
                   <p className="text-xs text-slate-400 mt-2">Max file size 10MB</p>
                   <input type="file" ref={fileInputRef} className="hidden" onChange={handleCurriculumUpload} accept=".pdf,.doc,.docx" />
                </div>
                {loading && <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600"><Icons.Spinner className="animate-spin" /> {loadingText}</div>}
             </div>
          )}

          {view === 'UPLOAD_PREVIOUS' && (
             <div className="max-w-4xl mx-auto space-y-6">
                {extractedQuestions.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center">
                        <h2 className="text-xl font-bold mb-6">Upload Previous Paper (OCR)</h2>
                        <div 
                          className="border-2 border-dashed border-slate-300 rounded-xl p-12 hover:bg-slate-50 transition cursor-pointer"
                          onClick={() => ocrInputRef.current?.click()}
                        >
                          <Icons.File className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                          <p className="text-slate-600 font-medium">Click to upload Scanned Image or PDF</p>
                          <p className="text-xs text-slate-400 mt-2">Supports JPG, PNG, PDF</p>
                          <input type="file" ref={ocrInputRef} className="hidden" onChange={handleOcrUpload} accept=".pdf,.jpg,.jpeg,.png" />
                        </div>
                        {loading && <div className="mt-4 flex items-center justify-center gap-2 text-indigo-600"><Icons.Spinner className="animate-spin" /> {loadingText}</div>}
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Select Questions to Import</h2>
                            <div className="flex gap-2">
                                <button onClick={() => setExtractedQuestions([])} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                                <button onClick={handleAddToPaper} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium">
                                    Import {selectedQuestions.size} Questions
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {extractedQuestions.map((q) => (
                                <div 
                                    key={q.id} 
                                    onClick={() => toggleSelection(q.id)}
                                    className={`p-4 border rounded-lg cursor-pointer transition flex gap-3 items-start ${selectedQuestions.has(q.id) ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}`}
                                >
                                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center mt-1 flex-shrink-0 ${selectedQuestions.has(q.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                        {selectedQuestions.has(q.id) && <Icons.Check size={12} className="text-white" />}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{q.text}</p>
                                        <div className="flex gap-2 mt-2 text-xs text-slate-500">
                                            <span className="bg-white border px-1 rounded">{q.type}</span>
                                            <span className="bg-white border px-1 rounded">{q.difficulty}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
             </div>
          )}

          {view === 'EDITOR' && (
            <div className="space-y-6">
               <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200">
                 {/* Question Paper Header */}
                 <div className="text-center border-b-2 border-slate-900 pb-4 mb-6 relative">
                    {currentPaper.universityName && (
                        <h1 className="text-2xl font-extrabold uppercase tracking-wide text-slate-900 mb-2">{currentPaper.universityName}</h1>
                    )}
                    <h2 className="text-xl font-bold text-slate-800 uppercase">{currentPaper.title}</h2>
                    <p className="text-lg font-medium text-slate-600">{currentPaper.subject}</p>
                    
                    {/* Template Badge */}
                    {currentPaper.formatFile && (
                        <div className="absolute top-0 right-0 hidden md:block">
                            <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded border border-indigo-100">
                                <Icons.File size={12} /> Template: {currentPaper.formatFile}
                            </span>
                        </div>
                    )}
                 </div>

                 <div className="flex justify-between items-start mb-6 text-sm font-medium text-slate-700">
                   <div className="space-y-1">
                      {currentPaper.enrollmentCode && <p>Enrollment No: <span className="border-b border-dotted border-slate-400 min-w-[100px] inline-block">{currentPaper.enrollmentCode}</span></p>}
                      {currentPaper.examDate && <p>Date: {currentPaper.examDate}</p>}
                   </div>
                   <div className="text-right space-y-1">
                      {currentPaper.maxMarks && <p>Max Marks: {currentPaper.maxMarks}</p>}
                      <p>Time: 1 Hour (Demo)</p>
                   </div>
                 </div>

                 {currentPaper.instructions && (
                    <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm italic text-slate-600">
                        <strong>Note:</strong> {currentPaper.instructions}
                    </div>
                 )}
                 
                 {/* Questions List */}
                 <div className="space-y-6">
                    {currentPaper.questions?.map((q, idx) => (
                      <div key={q.id} className="relative group">
                         <div className="absolute -left-8 top-0 text-slate-400 font-bold">{idx + 1}.</div>
                         <div className="flex gap-4">
                           <div className="flex-1">
                              <p className="font-medium text-slate-900 mb-2 text-lg">{q.text}</p>
                              {q.type === 'MCQ' && (
                                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-2 ml-4">
                                  {q.options?.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2 text-slate-700">
                                      <span className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-xs font-bold text-slate-500">{String.fromCharCode(65 + i)}</span>
                                      {opt}
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                           <div className="text-right w-16 text-sm font-bold text-slate-500">
                              [{q.marks}]
                           </div>
                         </div>
                         {/* Hover Actions */}
                         <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition flex gap-2">
                             <button className="p-1 text-slate-400 hover:text-red-500"><Icons.Delete size={16} /></button>
                         </div>
                      </div>
                    ))}
                 </div>
                 
                 <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-center no-print">
                     <div className="text-sm font-medium text-slate-500">{currentPaper.questions?.length} Questions Generated</div>
                     <div className="flex gap-2">
                        <button className="px-4 py-2 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium flex items-center gap-2">
                           <Icons.Plus size={16} /> Add Question
                        </button>
                        <button 
                           onClick={handleExport}
                           className="px-4 py-2 text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                            <Icons.Download size={16} /> Export
                        </button>
                        <button 
                          onClick={() => {
                            onSubmitPaper({ ...currentPaper, status: 'PENDING' } as QuestionPaper);
                            setView('HOME');
                          }}
                          className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium flex items-center gap-2"
                        >
                           <Icons.Send size={16} /> Submit for Approval
                        </button>
                     </div>
                 </div>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const SidebarItem = ({ active, icon, label, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition ${active ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
  >
    {icon}
    <span className="font-medium text-sm">{label}</span>
  </div>
);

const ActionCard = ({ title, desc, icon, onClick }: any) => (
  <div onClick={onClick} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 cursor-pointer transition group">
    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 group-hover:scale-110 transition">
      {icon}
    </div>
    <h3 className="font-bold text-slate-900 mb-1">{title}</h3>
    <p className="text-sm text-slate-500">{desc}</p>
  </div>
);
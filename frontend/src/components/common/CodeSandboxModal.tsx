import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Loader2, Sparkles, Terminal, CheckCircle2, AlertTriangle, Cpu, ChevronDown, Plus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ParsedTestCase {
  id: string;
  passed: boolean;
  input?: string;
  output?: string;
  expected?: string;
  details?: string;
}

const parseTestCases = (stdout: string): ParsedTestCase[] => {
  if (!stdout) return [];
  const cases: ParsedTestCase[] = [];
  const lines = stdout.split(/\r?\n/);
  
  let currentCase: ParsedTestCase | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const matchCase = line.match(/^(Case\s+\d+)\s*:\s*(Passed|Failed|Success)/i);
    if (matchCase) {
      if (currentCase) {
        cases.push(currentCase);
      }
      currentCase = {
        id: matchCase[1],
        passed: matchCase[2].toLowerCase() === 'passed' || matchCase[2].toLowerCase() === 'success'
      };
      continue;
    }
    
    if (currentCase) {
      if (line.toLowerCase().startsWith('input:')) {
        currentCase.input = line.substring(6).trim();
      } else if (line.toLowerCase().startsWith('output:')) {
        currentCase.output = line.substring(7).trim();
      } else if (line.toLowerCase().startsWith('expected:')) {
        currentCase.expected = line.substring(9).trim();
      } else if (line.toLowerCase().startsWith('actual:')) {
        currentCase.output = line.substring(7).trim();
      } else if (line.toLowerCase() === 'success') {
        continue;
      } else {
        if (!currentCase.passed) {
          if (!currentCase.details) currentCase.details = '';
          currentCase.details += (currentCase.details ? '\n' : '') + line;
        }
      }
    }
  }
  
  if (currentCase) {
    cases.push(currentCase);
  }
  
  return cases;
};

interface CodeSandboxModalProps {
  isOpen: boolean;
  questionId: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  onClose: () => void;
  onQuestionCompleted: (questionId: string) => void;
}

interface ProblemData {
  question_id: string;
  title: string;
  difficulty: string;
  description: string;
  templates: Record<string, string>;
  topics?: string[];
  companies?: string[];
  hints?: string[];
  default_input?: string;
}

interface SubmissionRecord {
  status: string;
  timestamp: string;
  language: string;
  passed: boolean;
  code: string;
  compile_output?: string;
  stderr?: string;
  stdout?: string;
}

interface TestcaseParam {
  name: string;
  value: string;
  hasEqual: boolean;
}

const getParamNames = (problem: ProblemData | null): string[] => {
  if (!problem || !problem.templates) return [];

  // Try Python template first
  const pyTemplate = problem.templates.python;
  if (pyTemplate) {
    const match = pyTemplate.match(/def\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/);
    if (match) {
      const params = match[1].split(',')
        .map(p => p.trim())
        .filter(p => p !== 'self' && p !== '')
        .map(p => {
          const colonIdx = p.indexOf(':');
          return colonIdx !== -1 ? p.substring(0, colonIdx).trim() : p;
        });
      if (params.length > 0) return params;
    }
  }

  // Fallback: try Java template
  const javaTemplate = problem.templates.java;
  if (javaTemplate) {
    const match = javaTemplate.match(/public\s+\S+\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/);
    if (match) {
      const params = match[1].split(',')
        .map(p => p.trim())
        .filter(p => p !== '')
        .map(p => {
          // Java params look like "int[] nums" or "int[][] intervals" — take last word
          const parts = p.trim().split(/\s+/);
          return parts[parts.length - 1];
        });
      if (params.length > 0) return params;
    }
  }

  // Fallback: try C++ template
  const cppTemplate = problem.templates.cpp;
  if (cppTemplate) {
    const match = cppTemplate.match(/\w[\w<>\[\]*&\s]+\s+[a-zA-Z0-9_]+\s*\(([^)]+)\)/);
    if (match) {
      const params = match[1].split(',')
        .map(p => p.trim())
        .filter(p => p !== '')
        .map(p => {
          const parts = p.trim().split(/\s+/);
          return parts[parts.length - 1].replace(/[&*]/, '');
        });
      if (params.length > 0) return params;
    }
  }

  return [];
};

const parseInputToParams = (inputStr: string, problem: ProblemData | null): TestcaseParam[] => {
  const paramNames = getParamNames(problem);

  // If input is empty but we know the param names, return empty fields for each param
  if (!inputStr || inputStr.trim() === '') {
    if (paramNames.length > 0) {
      return paramNames.map(name => ({ name, value: '', hasEqual: false }));
    }
    return [];
  }

  const lines = inputStr.split('\n').map(l => l.trim()).filter(l => l !== '');

  return lines.map((line, idx) => {
    if (line.includes('=') && !line.startsWith('[') && !line.startsWith('{') && !line.startsWith('"') && !line.startsWith("'")) {
      const eqIdx = line.indexOf('=');
      return {
        name: line.substring(0, eqIdx).trim(),
        value: line.substring(eqIdx + 1).trim(),
        hasEqual: true
      };
    }
    const name = paramNames[idx] || `param${idx + 1}`;
    return {
      name,
      value: line,
      hasEqual: false
    };
  });
};

export const CodeSandboxModal: React.FC<CodeSandboxModalProps> = ({
  isOpen,
  questionId,
  title,
  difficulty,
  onClose,
  onQuestionCompleted,
}) => {
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [language, setLanguage] = useState<'python' | 'java' | 'cpp'>('python');
  const [code, setCode] = useState('');
  
  // Tabs and pills states
  const [leftTab, setLeftTab] = useState<'description' | 'submissions'>('description');
  const [showTopics, setShowTopics] = useState(false);
  const [showCompanies, setShowCompanies] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [submissionsList, setSubmissionsList] = useState<SubmissionRecord[]>([]);
  const [expandedSubmissionIdx, setExpandedSubmissionIdx] = useState<number | null>(null);

  // Console execution output states
  const [runResult, setRunResult] = useState<{
    passed: boolean;
    stdout: string;
    stderr: string;
    compile_output: string;
    status_description?: string;
  } | null>(null);

  const [selectedCaseIndex, setSelectedCaseIndex] = useState<number>(0);
  const [consoleTab, setConsoleTab] = useState<'testcase' | 'results' | 'stdout'>('testcase');
  const [customInput, setCustomInput] = useState('');
  const [customCases, setCustomCases] = useState<string[]>([]);
  const [activeCaseIdx, setActiveCaseIdx] = useState<number>(0);
  const [consoleHeight, setConsoleHeight] = useState(280);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    setSelectedCaseIndex(0);
    if (runResult) {
      const parsed = parseTestCases(runResult.stdout);
      if (parsed.length > 0) {
        setConsoleTab('results');
      } else {
        setConsoleTab('stdout');
      }
    } else {
      setConsoleTab('testcase');
    }
  }, [runResult]);

  // Handle resizing mouse events
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newHeight = window.innerHeight - e.clientY;
      const clampedHeight = Math.max(44, Math.min(newHeight, window.innerHeight - 120));
      setConsoleHeight(clampedHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Load submissions and clear state on open
  useEffect(() => {
    if (!isOpen) return;
    const historyKey = `submissions_history_${questionId}`;
    const saved = localStorage.getItem(historyKey);
    if (saved) {
      try {
        setSubmissionsList(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse submissions history", e);
        setSubmissionsList([]);
      }
    } else {
      setSubmissionsList([]);
    }
    setLeftTab('description');
    setShowTopics(false);
    setShowCompanies(false);
    setShowHint(false);
    setExpandedSubmissionIdx(null);
  }, [isOpen, questionId]);

  // Fetch problem specs from backend
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchProblem = async () => {
      setLoading(true);
      setRunResult(null);
      try {
        const res = await api.get(`/api/coding/problem/${questionId}`, {
          params: { title, difficulty }
        });
        setProblem(res.data);
        const defaultInput = res.data.default_input || "";
        setCustomInput(defaultInput);
        setCustomCases([defaultInput]);
        setActiveCaseIdx(0);
        
        // Load default language or check saved draft
        const defaultLang = 'python';
        setLanguage(defaultLang);
        
        const savedDraft = localStorage.getItem(`code_draft_${questionId}_${defaultLang}`);
        if (savedDraft) {
          setCode(savedDraft);
        } else {
          setCode(res.data.templates[defaultLang] || '');
        }
      } catch (err) {
        console.error("Failed to load problem details:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProblem();
  }, [isOpen, questionId]);

  // Handle changing language and restore corresponding draft / template
  const handleLanguageChange = (newLang: 'python' | 'java' | 'cpp') => {
    // Save current draft first
    localStorage.setItem(`code_draft_${questionId}_${language}`, code);
    
    setLanguage(newLang);
    const savedDraft = localStorage.getItem(`code_draft_${questionId}_${newLang}`);
    if (savedDraft) {
      setCode(savedDraft);
    } else {
      setCode(problem?.templates[newLang] || '');
    }
  };

  // Helper to restore code draft from a past submission
  const handleRestoreSubmission = (subCode: string, subLang: 'python' | 'java' | 'cpp') => {
    localStorage.setItem(`code_draft_${questionId}_${language}`, code);
    setLanguage(subLang);
    setCode(subCode);
    localStorage.setItem(`code_draft_${questionId}_${subLang}`, subCode);
  };

  // Auto-save draft as user edits code
  const handleCodeChange = (val: string | undefined) => {
    const updatedCode = val || '';
    setCode(updatedCode);
    localStorage.setItem(`code_draft_${questionId}_${language}`, updatedCode);
  };

  // Run the code with custom testcase input
  const handleRunCode = async () => {
    if (!problem) return;
    setRunning(true);
    setRunResult(null);
    try {
      const promises = customCases.map(async (testcaseInput, idx) => {
        try {
          const res = await api.post(`/api/coding/problem/${questionId}/run`, {
            language,
            code,
            custom_input: testcaseInput
          });
          return { ...res.data, idx };
        } catch (e: any) {
          const errDetail = e.response?.data?.detail || "Execution failed.";
          return {
            passed: false,
            stdout: "",
            stderr: errDetail,
            compile_output: "",
            idx
          };
        }
      });
      
      const results = await Promise.all(promises);
      
      // Check if any had compilation output
      const compileErr = results.find(r => r.compile_output);
      if (compileErr) {
        setRunResult({
          passed: false,
          stdout: "",
          stderr: "",
          compile_output: compileErr.compile_output,
          status_description: "Compilation Error"
        });
        setConsoleTab('stdout');
        return;
      }
      
      // Concatenate results stdout/stderr
      let combinedStdout = "";
      let combinedStderr = "";
      let allPassed = true;
      
      results.forEach((r, i) => {
        let caseStdout = r.stdout || "";
        // Replace "Case 1" with "Case {i + 1}" in stdout to make the tabs parse properly
        caseStdout = caseStdout.replace(/Case\s+1/gi, `Case ${i + 1}`);
        
        combinedStdout += caseStdout + "\n";
        if (r.stderr) {
          combinedStderr += `Case ${i + 1} Error:\n${r.stderr}\n`;
        }
        if (!r.passed) {
          allPassed = false;
        }
      });
      
      setRunResult({
        passed: allPassed,
        stdout: combinedStdout.trim(),
        stderr: combinedStderr.trim(),
        compile_output: "",
        status_description: allPassed ? "Accepted" : "Wrong Answer"
      });
      
      setConsoleTab('results');
    } catch (err: any) {
      console.error("Execution request failed:", err);
      const errDetail = err.response?.data?.detail || "Failed to establish connection with execution service.";
      setRunResult({
        passed: false,
        stdout: "",
        stderr: errDetail,
        compile_output: ""
      });
      setConsoleTab('stdout');
    } finally {
      setRunning(false);
    }
  };

  // Submit and grade the code (run all assertions)
  const handleSubmitCode = async () => {
    if (!problem) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await api.post(`/api/coding/problem/${questionId}/run`, {
        language,
        code
      });
      setRunResult(res.data);
      
      // Save history record
      const runRecord: SubmissionRecord = {
        status: res.data.status_description || (res.data.passed ? "Accepted" : "Wrong Answer"),
        timestamp: new Date().toLocaleString(),
        language,
        passed: res.data.passed,
        code: code,
        compile_output: res.data.compile_output,
        stderr: res.data.stderr,
        stdout: res.data.stdout
      };
      const updatedList = [runRecord, ...submissionsList];
      setSubmissionsList(updatedList);
      localStorage.setItem(`submissions_history_${questionId}`, JSON.stringify(updatedList));

      // If code execution fully passed all assertions, mark it as completed
      if (res.data.passed) {
        onQuestionCompleted(questionId);
      }
      
      const parsed = parseTestCases(res.data.stdout);
      if (parsed.length > 0) {
        setConsoleTab('results');
      } else {
        setConsoleTab('stdout');
      }
    } catch (err: any) {
      console.error("Execution request failed:", err);
      const errDetail = err.response?.data?.detail || "Failed to establish connection with execution service.";
      
      const runRecord: SubmissionRecord = {
        status: "Runtime Error",
        timestamp: new Date().toLocaleString(),
        language,
        passed: false,
        code: code,
        stderr: errDetail
      };
      const updatedList = [runRecord, ...submissionsList];
      setSubmissionsList(updatedList);
      localStorage.setItem(`submissions_history_${questionId}`, JSON.stringify(updatedList));

      setRunResult({
        passed: false,
        stdout: "",
        stderr: errDetail,
        compile_output: ""
      });
      setConsoleTab('stdout');
    } finally {
      setRunning(false);
    }
  };

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !running) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, running, onClose]);

  if (!isOpen) return null;

  const parsedCases = runResult ? parseTestCases(runResult.stdout) : [];
  const activeCase = parsedCases[selectedCaseIndex];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col bg-slate-950 text-slate-100 transition-all duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-slate-900 bg-slate-900/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <Cpu className="text-primary w-5 h-5" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Placement Code Sandbox</span>
            <span className="text-[11px] font-bold text-slate-300">Interactive Developer Workspace</span>
          </div>
        </div>

        {/* Toolbar Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={running}
            className="p-1.5 rounded-lg bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-all border border-slate-750/50 cursor-pointer disabled:opacity-50"
            title="Close workspace"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        
        {/* Left Side: LeetCode-style Problem Description Pane */}
        <div className="w-full md:w-5/12 border-r border-slate-900 flex flex-col min-h-0 bg-slate-950">
          {/* Tabs at the top of the Left Pane */}
          <div className="flex items-center px-4 border-b border-slate-900 bg-slate-900/30 text-[11px] font-bold text-slate-400">
            <button 
              onClick={() => setLeftTab('description')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-semibold transition-all cursor-pointer ${
                leftTab === 'description' 
                  ? 'border-primary text-slate-100' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${leftTab === 'description' ? 'text-primary' : 'text-slate-400'}`} />
              <span>Description</span>
            </button>
            <button 
              onClick={() => setLeftTab('submissions')}
              className={`flex items-center gap-1.5 px-3 py-2.5 border-b-2 font-semibold transition-all cursor-pointer ${
                leftTab === 'submissions' 
                  ? 'border-primary text-slate-100' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className={`w-3.5 h-3.5 ${leftTab === 'submissions' ? 'text-primary' : 'text-slate-400'}`} />
              <span>Submissions ({submissionsList.length})</span>
            </button>
          </div>

          {/* Left Pane Tab Contents */}
          <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-slate-950/20 text-slate-300">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-xs text-slate-400 animate-pulse">Constructing coding workspace via AI...</p>
              </div>
            ) : problem ? (
              leftTab === 'description' ? (
                <div className="space-y-4">
                  {/* Title Section */}
                  <div className="space-y-2.5">
                    <h1 className="text-lg font-extrabold text-slate-100">{problem.title}</h1>
                    
                    {/* Tags: Easy/Medium/Hard, Topics, Companies, Hint */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold tracking-wider">
                      <span className={`px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        problem.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        problem.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {problem.difficulty}
                      </span>
                      
                      <button 
                        onClick={() => setShowTopics(!showTopics)}
                        className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                          showTopics 
                            ? 'bg-primary/10 text-primary border-primary/20 font-extrabold' 
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 font-bold'
                        }`}
                      >
                        <span>Topics</span>
                        <ChevronDown size={10} className={`transition-transform duration-250 ${showTopics ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <button 
                        onClick={() => setShowCompanies(!showCompanies)}
                        className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                          showCompanies 
                            ? 'bg-primary/10 text-primary border-primary/20 font-extrabold' 
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 font-bold'
                        }`}
                      >
                        <span>Companies</span>
                        <ChevronDown size={10} className={`transition-transform duration-250 ${showCompanies ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <button 
                        onClick={() => setShowHint(!showHint)}
                        className={`px-2.5 py-1 rounded-full border flex items-center gap-1 transition-all cursor-pointer ${
                          showHint 
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 font-extrabold' 
                            : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800/80 font-bold'
                        }`}
                      >
                        <span>Hint</span>
                        <ChevronDown size={10} className={`transition-transform duration-250 ${showHint ? 'rotate-180' : ''}`} />
                      </button>
                    </div>

                    {/* Expandable Tag Divs */}
                    {showTopics && (
                      <div className="mt-3 p-3.5 bg-slate-900/40 border border-slate-900/80 rounded-xl flex flex-wrap gap-2 animate-fadeIn transition-all">
                        {problem.topics && problem.topics.length > 0 ? (
                          problem.topics.map((t, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-900/80 text-slate-300 rounded-md text-[10px] font-medium border border-slate-800">
                              {t}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500">No topic tags cached for this problem.</span>
                        )}
                      </div>
                    )}

                    {showCompanies && (
                      <div className="mt-3 p-3.5 bg-slate-900/40 border border-slate-900/80 rounded-xl flex flex-wrap gap-2 animate-fadeIn transition-all">
                        {problem.companies && problem.companies.length > 0 ? (
                          problem.companies.map((c, idx) => (
                            <span key={idx} className="px-2.5 py-1 bg-slate-900/80 text-slate-300 rounded-md text-[10px] font-semibold border border-slate-800 hover:border-primary/20 transition-all">
                              {c}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-500">No company tags cached for this problem.</span>
                        )}
                      </div>
                    )}

                    {showHint && (
                      <div className="mt-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl space-y-2.5 text-[11px] leading-relaxed animate-fadeIn transition-all">
                        {problem.hints && problem.hints.length > 0 ? (
                          problem.hints.map((h, idx) => (
                            <div key={idx} className="flex gap-2 text-slate-300">
                              <span className="text-amber-400 font-bold whitespace-nowrap">Hint {idx + 1}:</span>
                              <span>{h}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-500">No hints available for this problem.</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <hr className="border-slate-900/80" />
                  
                  {/* Description Markdown */}
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed">
                    <MarkdownRenderer content={problem.description} />
                  </div>
                </div>
              ) : (
                /* Submissions History Pane */
                <div className="space-y-3">
                  {submissionsList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-2">
                      <Terminal className="w-8 h-8 opacity-35 text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">No submission history found for this problem.</span>
                    </div>
                  ) : (
                    submissionsList.map((sub, idx) => {
                      const isExpanded = expandedSubmissionIdx === idx;
                      return (
                        <div key={idx} className="border border-slate-900 bg-slate-900/10 rounded-xl overflow-hidden transition-all duration-200 animate-fadeIn">
                          <div 
                            onClick={() => setExpandedSubmissionIdx(isExpanded ? null : idx)}
                            className="flex items-center justify-between p-3.5 hover:bg-slate-900/30 cursor-pointer select-none text-xs"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full ${sub.passed ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-rose-500 shadow-sm shadow-rose-500/30'}`} />
                              <span className={`font-extrabold ${sub.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {sub.status}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">{sub.timestamp}</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-[10px] text-slate-400">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800/85 font-mono text-[9px] font-bold text-primary uppercase">{sub.language}</span>
                              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-slate-200' : 'text-slate-500'}`} />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-slate-900/50 bg-slate-950/60 p-4 space-y-3.5 animate-fadeIn">
                              {/* Output / Errors from past submission */}
                              {(sub.compile_output || sub.stderr) && (
                                <div className="text-[11px] font-mono rounded-lg overflow-hidden border border-rose-950/30">
                                  {sub.compile_output && (
                                    <div className="bg-rose-950/5 p-3">
                                      <div className="text-rose-400 font-bold mb-1 text-[9px] uppercase tracking-wider">Compile Error:</div>
                                      <pre className="text-rose-300/90 whitespace-pre-wrap select-all font-mono leading-relaxed">{sub.compile_output}</pre>
                                    </div>
                                  )}
                                  {sub.stderr && (
                                    <div className="bg-rose-950/5 p-3 border-t border-rose-950/20">
                                      <div className="text-rose-400 font-bold mb-1 text-[9px] uppercase tracking-wider">Runtime Error:</div>
                                      <pre className="text-rose-300/90 whitespace-pre-wrap select-all font-mono leading-relaxed">{sub.stderr}</pre>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Submitted Code Draft */}
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 tracking-wider">
                                  <span>SUBMITTED SOURCE CODE</span>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRestoreSubmission(sub.code, sub.language as any);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-primary border border-slate-800 hover:border-primary/20 text-[9px] font-bold transition-colors cursor-pointer"
                                  >
                                    Restore to Editor
                                  </button>
                                </div>
                                <pre className="p-3 bg-[#131722] border border-slate-900 rounded-lg text-[11px] font-mono text-slate-200 overflow-x-auto whitespace-pre select-all max-h-48 leading-relaxed">
                                  {sub.code}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                Failed to load challenge specifications.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Monaco Code Editor + Output Console */}
        <div className="w-full md:w-7/12 flex flex-col min-h-0 bg-[#1e1e1e]">
          {/* Editor Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-slate-900 bg-slate-900/40">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <span className="text-primary font-mono text-sm font-extrabold">&lt;/&gt;</span> Code
              </span>
              
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value as any)}
                disabled={running || loading}
                className="bg-slate-800/80 border border-slate-700/65 text-slate-250 text-[11px] font-semibold px-2.5 py-1 rounded-md focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer disabled:opacity-45"
              >
                <option value="python">Python 3</option>
                <option value="java">Java 13</option>
                <option value="cpp">C++ (GCC)</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunCode}
                disabled={running || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-[11px] font-bold rounded-md transition-all border border-slate-700/50 cursor-pointer"
              >
                {running ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Running...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 text-slate-400" />
                    <span>Run Code</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleSubmitCode}
                disabled={running || loading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-md transition-all shadow-sm shadow-emerald-750/20 cursor-pointer"
              >
                {running ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Submit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 min-h-0 relative border-b border-slate-900">
            {loading ? (
              <div className="absolute inset-0 bg-[#1e1e1e] z-10 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
              </div>
            ) : (
              <Editor
                height="100%"
                language={language === 'python' ? 'python' : language === 'cpp' ? 'cpp' : 'java'}
                theme="vs-dark"
                value={code}
                onChange={handleCodeChange}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  automaticLayout: true,
                  fontFamily: "Fira Code, JetBrains Mono, Monaco, Courier New, monospace",
                  lineHeight: 20,
                  cursorBlinking: "smooth",
                  smoothScrolling: true,
                  tabSize: 4,
                  padding: { top: 12, bottom: 12 },
                }}
              />
            )}
          </div>

          {/* Console / Output Drawer */}
          <div 
            style={{ height: `${consoleHeight}px` }} 
            className="relative bg-slate-950 border-t border-slate-900 flex flex-col min-h-0 shrink-0"
          >
            {/* Resize Drag Handle */}
            <div 
              onMouseDown={startResize}
              className={`absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-30 transition-colors select-none ${
                isResizing ? 'bg-primary' : 'bg-transparent hover:bg-slate-700/50'
              }`}
            />

            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-900/60 bg-slate-900/30 text-slate-400 font-bold uppercase tracking-wider text-[10px] select-none">
              <div className="flex items-center">
                <div className="flex items-center gap-1.5 text-slate-350">
                  <Terminal className="w-3.5 h-3.5 text-primary" />
                  <span className="font-extrabold tracking-widest text-[10px]">CONSOLE</span>
                </div>
                <div className="h-4 w-px bg-slate-800/80 mx-4" />
                {/* Console tabs */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setConsoleTab('testcase')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                      consoleTab === 'testcase'
                        ? 'bg-[#1a2234] text-slate-100 border border-slate-700/60 shadow-sm'
                        : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                    }`}
                  >
                    TESTCASE
                  </button>
                  {runResult && (
                    <>
                      <button
                        onClick={() => setConsoleTab('results')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                          consoleTab === 'results'
                            ? 'bg-[#1a2234] text-slate-100 border border-slate-700/60 shadow-sm'
                            : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                        }`}
                      >
                        TEST RESULTS
                      </button>
                      <button
                        onClick={() => setConsoleTab('stdout')}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase transition-all cursor-pointer ${
                          consoleTab === 'stdout'
                            ? 'bg-[#1a2234] text-slate-100 border border-slate-700/60 shadow-sm'
                            : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/40 border border-transparent'
                        }`}
                      >
                        RAW LOGS
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {runResult && consoleTab !== 'testcase' && (
                <div className="flex items-center gap-2">
                  {runResult.passed ? (
                    <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>ACCEPTED ({runResult.status_description || 'All tests passed'})</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-400 text-[10px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{runResult.status_description || 'REJECTED'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed bg-[#0b0f19] text-slate-350">
              {consoleTab === 'testcase' && (
                <div className="flex flex-col gap-4 font-sans h-full">
                  {/* Case button tab */}
                  <div className="flex items-center justify-between select-none">
                    <div className="flex items-center gap-2 flex-wrap">
                      {customCases.map((_, index) => (
                        <div
                          key={index}
                          onClick={() => {
                            setActiveCaseIdx(index);
                            setCustomInput(customCases[index]);
                          }}
                          className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-extrabold tracking-wider uppercase cursor-pointer border transition-all ${
                            activeCaseIdx === index
                              ? 'bg-[#1a2234] text-slate-100 border-slate-700/60 shadow-sm'
                              : 'bg-slate-900/50 text-slate-400 hover:text-slate-205 border-transparent'
                          }`}
                        >
                          <span>Case {index + 1}</span>
                          {customCases.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (customCases.length <= 1) return;
                                const updated = customCases.filter((_, idx) => idx !== index);
                                setCustomCases(updated);
                                if (activeCaseIdx >= updated.length) {
                                  const newIdx = updated.length - 1;
                                  setActiveCaseIdx(newIdx);
                                  setCustomInput(updated[newIdx]);
                                } else if (activeCaseIdx === index) {
                                  setCustomInput(updated[activeCaseIdx]);
                                }
                              }}
                              className="text-slate-500 hover:text-rose-450 transition-colors ml-1 p-0.5 rounded cursor-pointer"
                            >
                              <X size={10} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const defaultInput = problem?.default_input || "";
                          setCustomCases([...customCases, defaultInput]);
                          setActiveCaseIdx(customCases.length);
                          setCustomInput(defaultInput);
                        }}
                        className="p-1.5 rounded-lg bg-slate-900/40 hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition-all border border-slate-800 hover:border-slate-700 cursor-pointer"
                        title="Add new testcase"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const defaultInput = problem?.default_input || "";
                        setCustomInput(defaultInput);
                        const updatedCases = [...customCases];
                        updatedCases[activeCaseIdx] = defaultInput;
                        setCustomCases(updatedCases);
                      }}
                      className="text-[10px] text-slate-500 hover:text-primary transition-colors cursor-pointer font-bold lowercase tracking-normal"
                    >
                      [reset to default]
                    </button>
                  </div>

                  {/* Variables listing - LeetCode style */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1 pt-1">
                    {parseInputToParams(customInput, problem).length > 0 ? (
                      parseInputToParams(customInput, problem).map((param, idx) => (
                        <div key={idx} className="space-y-2">
                          {/* Label: "paramName =" */}
                          <div className="text-[12px] text-slate-400 font-normal">
                            {param.name} =
                          </div>
                          {/* Dark input box */}
                          <div className="relative rounded-lg overflow-hidden bg-[#1a1a1a] border border-transparent hover:border-slate-700/60 focus-within:border-slate-600/70 transition-all">
                            <textarea
                              rows={Math.max(1, param.value.split('\n').length)}
                              value={param.value}
                              onChange={(e) => {
                                const parsed = parseInputToParams(customInput, problem);
                                const updated = [...parsed];
                                updated[idx] = { ...updated[idx], value: e.target.value };
                                const newStr = updated.map(p => p.hasEqual ? `${p.name} = ${p.value}` : p.value).join('\n');
                                setCustomInput(newStr);
                                const updatedCases = [...customCases];
                                updatedCases[activeCaseIdx] = newStr;
                                setCustomCases(updatedCases);
                              }}
                              className="w-full bg-transparent text-[#5ccc8a] font-mono text-[13px] px-4 py-3 outline-none resize-none leading-relaxed placeholder-slate-600"
                              placeholder={`Enter value...`}
                              spellCheck={false}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      // Fallback: raw textarea when no params could be parsed
                      <div className="space-y-2">
                        <div className="text-[12px] text-slate-400 font-normal">
                          stdin =
                        </div>
                        <div className="relative rounded-lg overflow-hidden bg-[#1a1a1a] border border-transparent hover:border-slate-700/60 focus-within:border-slate-600/70 transition-all">
                          <textarea
                            rows={4}
                            value={customInput}
                            onChange={(e) => {
                              setCustomInput(e.target.value);
                              const updatedCases = [...customCases];
                              updatedCases[activeCaseIdx] = e.target.value;
                              setCustomCases(updatedCases);
                            }}
                            className="w-full bg-transparent text-[#5ccc8a] font-mono text-[13px] px-4 py-3 outline-none resize-y leading-relaxed placeholder-slate-600 min-h-[80px]"
                            placeholder="Enter your test input here..."
                            spellCheck={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {consoleTab !== 'testcase' && running && (
                <div className="flex items-center gap-2 text-slate-400 font-sans">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Compiling and running code assertions against test cases...</span>
                </div>
              )}
              
              {consoleTab !== 'testcase' && !running && !runResult && (
                <span className="text-slate-500 font-sans">Run code to see outputs and verification status here.</span>
              )}

              {consoleTab !== 'testcase' && runResult && (
                <div className="space-y-2 text-slate-300">
                  {/* Compilation Failures */}
                  {runResult.compile_output && (
                    <div className="space-y-1">
                      <h4 className="text-rose-400 font-semibold border-b border-rose-500/10 pb-0.5">Compilation Output:</h4>
                      <pre className="whitespace-pre-wrap text-rose-300 font-mono">{runResult.compile_output}</pre>
                    </div>
                  )}

                  {/* Runtime Errors */}
                  {runResult.stderr && (
                    <div className="space-y-1">
                      <h4 className="text-rose-400 font-semibold border-b border-rose-500/10 pb-0.5">Runtime Errors:</h4>
                      <pre className="whitespace-pre-wrap text-rose-300 font-mono">{runResult.stderr}</pre>
                    </div>
                  )}

                  {/* Standard output or test results based on tab selection */}
                  {!runResult.compile_output && !runResult.stderr && (
                    <>
                      {consoleTab === 'results' && parsedCases.length > 0 ? (
                        <div className="space-y-3">
                          {/* Case Buttons */}
                          <div className="flex gap-2">
                            {parsedCases.map((tc, idx) => (
                              <button
                                key={tc.id}
                                onClick={() => setSelectedCaseIndex(idx)}
                                className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                                  selectedCaseIndex === idx
                                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                                    : 'bg-slate-900/50 text-slate-400 hover:text-slate-200 border border-transparent'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${tc.passed ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                {tc.id}
                              </button>
                            ))}
                          </div>
                          
                          {/* Active Case Details */}
                          {activeCase && (
                            <div className="space-y-3 font-sans text-xs">
                              {activeCase.input && (
                                <div>
                                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Input</div>
                                  <pre className="mt-1 p-2 bg-slate-900/90 border border-slate-850 rounded-md font-mono text-[11px] text-slate-200 overflow-x-auto whitespace-pre-wrap select-all">
                                    {activeCase.input}
                                  </pre>
                                </div>
                              )}
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {activeCase.output && (
                                  <div>
                                    <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Output</div>
                                    <pre className={`mt-1 p-2 bg-slate-900/90 border rounded-md font-mono text-[11px] overflow-x-auto whitespace-pre-wrap select-all ${
                                      activeCase.passed ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-400'
                                    }`}>
                                      {activeCase.output}
                                    </pre>
                                  </div>
                                )}

                                {activeCase.expected && (
                                  <div>
                                    <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Expected</div>
                                    <pre className="mt-1 p-2 bg-slate-900/90 border border-emerald-500/20 rounded-md font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap select-all">
                                      {activeCase.expected}
                                    </pre>
                                  </div>
                                )}
                              </div>

                              {activeCase.details && (
                                <div>
                                  <div className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Details</div>
                                  <pre className="mt-1 p-2 bg-slate-900/90 border border-slate-855 rounded-md font-mono text-[11px] text-rose-300 overflow-x-auto whitespace-pre-wrap">
                                    {activeCase.details}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <h4 className="text-slate-400 font-semibold border-b border-slate-800 pb-0.5">Test Execution Logs:</h4>
                          <pre className="whitespace-pre-wrap text-slate-200 font-mono">{runResult.stdout || "No logs output."}</pre>
                        </div>
                      )}
                    </>
                  )}

                  {runResult.passed && !customInput && (
                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Congratulations! All test assertions executed successfully. This problem is now registered as completed.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};


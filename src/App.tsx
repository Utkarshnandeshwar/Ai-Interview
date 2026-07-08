import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { 
  BookOpen, Users, Award, FileText, Brain, MessageSquare, Mic, Volume2, 
  Settings, LayoutDashboard, User, Plus, Trash, XCircle, 
  Clock, ArrowRight, Sun, Moon, LogOut, Activity, FileCheck, 
  Send, MicOff, TrendingUp, Sparkles, AlertTriangle, Video, VideoOff
} from 'lucide-react';
import { db, initDB } from './services/db';
import type { DBUser, DBProfile, DBResume, DBInterviewResult, DBAptitudeResult, DBFeedback } from './services/db';
import { analyzeResume, getNextInterviewQuestion, evaluateInterviewAnswer, askCareerAssistant } from './services/gemini';
import type { ChatMessage, AnswerEvaluationResult, ResumeAnalysisResult } from './services/gemini';

// Initialize Simulated Database
initDB();

// Hack for standard speech synthesis properties in browsers
class SynthesisUtteranceHack extends SpeechSynthesisUtterance {
  constructor(text: string) {
    super(text);
    this.rate = 1.0;
    this.pitch = 1.0;
  }
}

// ----------------------------------------------------
// Context & State Definition
// ----------------------------------------------------
interface AppContextType {
  currentUser: DBUser | null;
  currentProfile: DBProfile | null;
  currentPage: string;
  theme: 'dark' | 'light';
  apiKey: string;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  register: (name: string, email: string, pass: string, role: 'student' | 'admin') => boolean;
  navigateTo: (page: string) => void;
  updateProfile: (profile: DBProfile) => void;
  toggleTheme: () => void;
  updateApiKey: (key: string) => void;
  triggerRefresh: () => void;
  refreshKey: number;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

// ----------------------------------------------------
// Main App Component
// ----------------------------------------------------
export default function App() {
  const [currentUser, setCurrentUser] = useState<DBUser | null>(null);
  const [currentProfile, setCurrentProfile] = useState<DBProfile | null>(null);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [apiKey, setApiKey] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState<number>(0);

  // Load state from localStorage on init
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('ai_interview_session');
    if (sessionUser) {
      const parsedUser = JSON.parse(sessionUser);
      setCurrentUser(parsedUser);
      const profile = db.getProfile(parsedUser.id);
      setCurrentProfile(profile);
      setCurrentPage(parsedUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
    }
    const savedTheme = localStorage.getItem('ai_interview_theme') || 'dark';
    setTheme(savedTheme as 'dark' | 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    setApiKey(db.getGeminiApiKey());
  }, []);

  const triggerRefresh = () => setRefreshKey(prev => prev + 1);

  const login = (email: string, pass: string): boolean => {
    const users = db.getUsers();
    const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      const storedPwd = localStorage.getItem(`ai_interview_pwd_${foundUser.id}`);
      if (storedPwd === pass) {
        setCurrentUser(foundUser);
        const profile = db.getProfile(foundUser.id);
        setCurrentProfile(profile);
        sessionStorage.setItem('ai_interview_session', JSON.stringify(foundUser));
        setCurrentPage(foundUser.role === 'admin' ? 'admin-dashboard' : 'dashboard');
        return true;
      }
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentProfile(null);
    sessionStorage.removeItem('ai_interview_session');
    setCurrentPage('home');
  };

  const register = (name: string, email: string, pass: string, role: 'student' | 'admin'): boolean => {
    const users = db.getUsers();
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return false; // Email already exists
    }

    const newUser: DBUser = {
      id: 'usr_' + Math.random().toString(36).substr(2, 9),
      email: email,
      name: name,
      role: role,
      createdAt: new Date().toISOString()
    };

    db.saveUser(newUser);
    localStorage.setItem(`ai_interview_pwd_${newUser.id}`, pass);

    // If student, create blank profile
    if (role === 'student') {
      const newProfile: DBProfile = {
        userId: newUser.id,
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', // placeholder
        phone: '',
        college: '',
        branch: '',
        skills: [],
        targetCompany: '',
        targetRole: '',
        updatedAt: new Date().toISOString()
      };
      db.saveProfile(newProfile);
    }

    // Auto login
    setCurrentUser(newUser);
    const profile = db.getProfile(newUser.id);
    setCurrentProfile(profile);
    sessionStorage.setItem('ai_interview_session', JSON.stringify(newUser));
    setCurrentPage(role === 'admin' ? 'admin-dashboard' : 'dashboard');
    triggerRefresh();
    return true;
  };

  const navigateTo = (page: string) => {
    // Auth guards
    if (!currentUser && page !== 'home' && page !== 'login' && page !== 'register') {
      setCurrentPage('login');
      return;
    }
    if (currentUser?.role === 'admin' && !page.startsWith('admin-') && page !== 'settings') {
      setCurrentPage('admin-dashboard');
      return;
    }
    setCurrentPage(page);
  };

  const updateProfile = (profile: DBProfile) => {
    db.saveProfile(profile);
    setCurrentProfile(profile);
    triggerRefresh();
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('ai_interview_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const updateApiKey = (key: string) => {
    db.saveGeminiApiKey(key);
    setApiKey(key);
  };

  return (
    <AppContext.Provider value={{
      currentUser, currentProfile, currentPage, theme, apiKey,
      login, logout, register, navigateTo, updateProfile, toggleTheme, updateApiKey,
      triggerRefresh, refreshKey
    }}>
      <div className={`app-root ${theme}`}>
        {currentPage === 'home' && <HomeView />}
        {currentPage === 'login' && <AuthView isLogin={true} />}
        {currentPage === 'register' && <AuthView isLogin={false} />}
        
        {currentUser && currentPage !== 'home' && currentPage !== 'login' && currentPage !== 'register' && (
          <div className="app-container">
            <Sidebar />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TopHeader />
              <main className="main-content">
                {currentPage === 'dashboard' && <StudentDashboard />}
                {currentPage === 'profile' && <ProfileView />}
                {currentPage === 'resume' && <ResumeView />}
                {currentPage === 'interview' && <InterviewWorkspace />}
                {currentPage === 'video-interview' && <VideoInterviewWorkspace />}
                {currentPage === 'aptitude' && <AptitudeTestView />}
                {currentPage === 'career-chat' && <CareerChatView />}
                {currentPage === 'analytics' && <AnalyticsView />}
                {currentPage === 'settings' && <SettingsView />}

                {/* Admin Subviews */}
                {currentPage === 'admin-dashboard' && <AdminDashboard />}
                {currentPage === 'admin-users' && <AdminUsersView />}
                {currentPage === 'admin-questions' && <AdminQuestionsView />}
                {currentPage === 'admin-results' && <AdminResultsView />}
                {currentPage === 'admin-feedback' && <AdminFeedbackView />}
              </main>
            </div>
          </div>
        )}
      </div>
    </AppContext.Provider>
  );
}

// ----------------------------------------------------
// Navigation & Headers
// ----------------------------------------------------
function Sidebar() {
  const { currentUser, currentPage, navigateTo, logout } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Brain size={28} />
        <span>InterviewCompass</span>
      </div>
      <ul className="sidebar-menu">
        {isAdmin ? (
          <>
            <li className={`sidebar-item ${currentPage === 'admin-dashboard' ? 'active' : ''}`} onClick={() => navigateTo('admin-dashboard')}>
              <LayoutDashboard size={20} />
              <span>Admin Panel</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'admin-users' ? 'active' : ''}`} onClick={() => navigateTo('admin-users')}>
              <Users size={20} />
              <span>Manage Students</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'admin-questions' ? 'active' : ''}`} onClick={() => navigateTo('admin-questions')}>
              <BookOpen size={20} />
              <span>Mock Questions</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'admin-results' ? 'active' : ''}`} onClick={() => navigateTo('admin-results')}>
              <Award size={20} />
              <span>Student Scores</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'admin-feedback' ? 'active' : ''}`} onClick={() => navigateTo('admin-feedback')}>
              <MessageSquare size={20} />
              <span>Feedbacks</span>
            </li>
          </>
        ) : (
          <>
            <li className={`sidebar-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => navigateTo('dashboard')}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'profile' ? 'active' : ''}`} onClick={() => navigateTo('profile')}>
              <User size={20} />
              <span>Complete Profile</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'resume' ? 'active' : ''}`} onClick={() => navigateTo('resume')}>
              <FileText size={20} />
              <span>Resume Analysis</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'interview' ? 'active' : ''}`} onClick={() => navigateTo('interview')}>
              <Mic size={20} />
              <span>Mock Interview</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'video-interview' ? 'active' : ''}`} onClick={() => navigateTo('video-interview')}>
              <Video size={20} />
              <span>Video Interview</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'aptitude' ? 'active' : ''}`} onClick={() => navigateTo('aptitude')}>
              <BookOpen size={20} />
              <span>Aptitude Test</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'career-chat' ? 'active' : ''}`} onClick={() => navigateTo('career-chat')}>
              <MessageSquare size={20} />
              <span>AI Chat Assistant</span>
            </li>
            <li className={`sidebar-item ${currentPage === 'analytics' ? 'active' : ''}`} onClick={() => navigateTo('analytics')}>
              <Activity size={20} />
              <span>My Report card</span>
            </li>
          </>
        )}
      </ul>
      <div className="sidebar-footer">
        <button className="sidebar-item" style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left' }} onClick={() => navigateTo('settings')}>
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button className="sidebar-item" style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', color: 'var(--color-danger)' }} onClick={logout}>
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function TopHeader() {
  const { currentUser, currentProfile, toggleTheme, theme, navigateTo } = useApp();
  
  const getBreadcrumb = () => {
    switch (localStorage.getItem('ai_interview_page') || 'Dashboard') {
      case 'dashboard': return 'Dashboard';
      case 'profile': return 'My Profile';
      case 'resume': return 'AI Resume Analyzer';
      case 'interview': return 'AI Mock Interview';
      case 'video-interview': return 'AI Video Mock Interview';
      case 'aptitude': return 'Aptitude Test Arena';
      case 'career-chat': return 'AI Career Assistant';
      case 'analytics': return 'Performance Reports';
      case 'settings': return 'Account Settings';
      case 'admin-dashboard': return 'Admin Dashboard';
      case 'admin-users': return 'Manage Users';
      case 'admin-questions': return 'Manage Questions';
      case 'admin-results': return 'View Scores';
      case 'admin-feedback': return 'Student Feedbacks';
      default: return 'Portal';
    }
  };

  return (
    <header className="top-header">
      <div className="top-header-title">{getBreadcrumb()}</div>
      <div className="top-header-actions">
        <button onClick={toggleTheme} className="btn btn-secondary" style={{ padding: '8px', borderRadius: '50%' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="user-badge" onClick={() => navigateTo(currentUser?.role === 'admin' ? 'settings' : 'profile')}>
          <img 
            className="user-badge-img" 
            src={currentUser?.role === 'student' ? currentProfile?.photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80' : 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80'} 
            alt="User avatar" 
          />
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser?.name}</span>
        </div>
      </div>
    </header>
  );
}

// ----------------------------------------------------
// Public Landing Page (Home)
// ----------------------------------------------------
function HomeView() {
  const { navigateTo, login } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);

  // Home Sandbox Interactive States
  const [selectedDemoOption, setSelectedDemoOption] = useState<number | null>(null);
  const [demoChatInput, setDemoChatInput] = useState('');
  const [demoChatResponse, setDemoChatResponse] = useState('');
  const [loadingDemoChat, setLoadingDemoChat] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleDemoChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoChatInput.trim()) return;
    setLoadingDemoChat(true);
    setDemoChatResponse('');
    try {
      const response = await askCareerAssistant(demoChatInput.trim(), []);
      setDemoChatResponse(response);
    } catch (err) {
      console.error(err);
      setDemoChatResponse('Could not fetch response. Verify your Gemini key or try again.');
    } finally {
      setLoadingDemoChat(false);
    }
  };

  const handleSubmitContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !msg) return;
    const newFeedback: DBFeedback = {
      id: 'fb_' + Math.random().toString(36).substr(2, 9),
      name: name,
      email: email,
      rating: 5,
      message: msg,
      date: new Date().toISOString()
    };
    db.saveFeedback(newFeedback);
    setFeedbackSuccess(true);
    setName('');
    setEmail('');
    setMsg('');
    setTimeout(() => setFeedbackSuccess(false), 4000);
  };

  const demoLoginStudent = () => {
    login('student@interview.com', 'student123');
  };

  const demoLoginAdmin = () => {
    login('admin@interview.com', 'admin123');
  };

  return (
    <div className="landing-page" style={{ overflowY: 'auto', height: '100vh' }}>
      {/* Navigation */}
      <nav className="landing-navbar">
        <div className="landing-navbar-logo" onClick={() => navigateTo('home')}>
          <Brain style={{ color: 'var(--color-primary)' }} />
          <span style={{ background: 'linear-gradient(135deg,#fff,#9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InterviewCompass</span>
        </div>
        <div className="landing-navbar-links">
          <a href="#features" className="landing-navbar-link">Features</a>
          <a href="#workflow" className="landing-navbar-link">How It Works</a>
          <a href="#faq" className="landing-navbar-link">FAQ</a>
          <a href="#contact" className="landing-navbar-link">Contact</a>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={() => navigateTo('login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigateTo('register')}>Get Started</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section style={{ padding: '90px 8% 60px', textAlign: 'center', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)', width: '300px', height: '300px', background: 'radial-gradient(var(--color-primary), transparent 70%)', opacity: 0.15, filter: 'blur(40px)', pointerEvents: 'none' }}></div>
        <span className="badge badge-info" style={{ marginBottom: 20 }}><Sparkles size={12} style={{ marginRight: 6 }} /> Powered by Google Gemini AI</span>
        <h1 style={{ fontSize: '3.6rem', fontWeight: 900, lineHeight: 1.15, maxWidth: '900px', margin: '0 auto 20px', letterSpacing: '-0.03em' }}>
          Crack Placements & Technical Interviews with <span style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI Guidance</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 30px' }}>
          The complete career readiness suite for Engineering, Diploma, and IT students. Build profiles, analyze resumes, solve aptitude papers, and perform speech mock-interviews with instant feedback.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginBottom: 50, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }} onClick={() => navigateTo('register')}>
            Register Now <ArrowRight size={18} />
          </button>
          <button className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem' }} onClick={demoLoginStudent}>
            Demo Student Account
          </button>
          <button className="btn btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem', borderStyle: 'dashed' }} onClick={demoLoginAdmin}>
            Demo Admin Panel
          </button>
        </div>
      </section>

      {/* Statistics */}
      <section style={{ padding: '40px 8%', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', textAlign: 'center', gap: 30 }}>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>15,000+</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Placements & Internships Secured</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-secondary)' }}>92%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Average ATS Score Growth</p>
          </div>
          <div>
            <h3 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-accent)' }}>50,000+</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>AI Mock Interviews Conducted</p>
          </div>
        </div>
      </section>

      {/* Interactive Sandbox Widgets Grid */}
      <section style={{ padding: '80px 8%', background: 'rgba(255,255,255,0.01)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Experience the AI Core Live</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 50px' }}>
          Test the Gemini-powered modules directly below without registering an account.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'stretch' }}>
          {/* Chat widget sandbox */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={20} style={{ color: 'var(--color-primary)' }} />
              Test Career Coach AI
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
              Ask specific technical questions like "Java polymorphism examples" or placement queries.
            </p>

            <form onSubmit={handleDemoChat} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Ask me anything: e.g. How to optimize resume?" 
                value={demoChatInput} 
                onChange={e => setDemoChatInput(e.target.value)} 
                required 
              />
              <button type="submit" className="btn btn-primary" disabled={loadingDemoChat}>
                {loadingDemoChat ? <Brain className="animate-spin" size={16} /> : 'Ask Coach'}
              </button>
            </form>

            <div style={{ flex: 1, padding: 16, background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', minHeight: '120px', fontSize: '0.85rem', overflowY: 'auto' }}>
              {demoChatResponse ? (
                <div style={{ whiteSpace: 'pre-line' }}>{demoChatResponse}</div>
              ) : loadingDemoChat ? (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text-muted)' }}>
                  <Brain className="animate-spin" size={16} />
                  <span>AUPAD Inteligens...</span>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Response card will output here...</span>
              )}
            </div>
          </div>

          {/* MCQ widget sandbox */}
          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={20} style={{ color: 'var(--color-accent)' }} />
              Test Aptitude Simulator
            </h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
              Solve this computer fundamentals question to inspect our evaluation feedback model:
            </p>

            <div style={{ padding: 14, background: 'rgba(255,255,255,0.01)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: '0.95rem', fontWeight: 600 }}>
              What is the time complexity of searching for an element in a balanced Binary Search Tree (BST)?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'A) O(1)', index: 0 },
                { label: 'B) O(N)', index: 1 },
                { label: 'C) O(log N)', index: 2, correct: true },
                { label: 'D) O(N log N)', index: 3 }
              ].map(opt => {
                const isSelected = selectedDemoOption === opt.index;
                const isCorrect = opt.correct;
                return (
                  <button 
                    key={opt.index} 
                    type="button" 
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedDemoOption(opt.index)}
                    style={selectedDemoOption !== null ? {
                      borderColor: isCorrect ? 'var(--color-success)' : isSelected ? 'var(--color-danger)' : 'var(--panel-border)',
                      background: isCorrect ? 'var(--color-success-bg)' : isSelected ? 'var(--color-danger-bg)' : 'rgba(255,255,255,0.01)'
                    } : {}}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + opt.index)}</span>
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {selectedDemoOption !== null && (
              <div className="animate-fade-in" style={{ padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', fontSize: '0.8rem', marginTop: 16 }}>
                {selectedDemoOption === 2 ? (
                  <p style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ Correct Answer!</p>
                ) : (
                  <p style={{ color: 'var(--color-danger)', fontWeight: 600 }}>✗ Incorrect Answer.</p>
                )}
                <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
                  <strong>Explanation:</strong> In a balanced BST, each step of search divides the search space by half, resulting in a logarithmic time complexity of O(log N).
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '80px 8%' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Unleash Your Full Potential</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 50px' }}>
          Accelerate your preparation across the five primary pillars of placement evaluation.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30 }}>
          <div className="glass-card">
            <Mic size={36} style={{ color: 'var(--color-primary)', marginBottom: 16 }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Interactive Voice Mock Interview</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Speak directly in the browser. AI evaluates your response on communication correctness, grammar, and depth using Gemini API.
            </p>
          </div>
          <div className="glass-card">
            <FileCheck size={36} style={{ color: 'var(--color-secondary)', marginBottom: 16 }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>AI ATS Resume Analysis</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Extract details instantly. Identify missing placement skills, grammar glitches, and customized phrasing templates.
            </p>
          </div>
          <div className="glass-card">
            <BookOpen size={36} style={{ color: 'var(--color-accent)', marginBottom: 16 }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>Placement Aptitude Arena</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Solve timed Quant, Logical Reasoning, English, and Computer Fundamentals questions. View step-by-step mathematical explanations.
            </p>
          </div>
          <div className="glass-card">
            <MessageSquare size={36} style={{ color: 'var(--color-success)', marginBottom: 16 }} />
            <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8 }}>AI Career Assistant Chat</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Have custom queries? Discuss coding pathways, company-specific criteria (TCS, Infosys, startups), and standard interview formats.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / WORKFLOW TIMELINE */}
      <section id="workflow" style={{ padding: '80px 8%', background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Your Path to Placement Success</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 50px' }}>
          Follow our structured roadmap to build technical skills, optimize resumes, and master mock interviews.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
          {[
            { step: '1', title: 'Academic Profile', desc: 'Configure target companies, branch and tech skills tags.' },
            { step: '2', title: 'ATS Resume Parser', desc: 'Scan resume text to detect missing keywords and grammar.' },
            { step: '3', title: 'Timed Aptitude', desc: 'Practice logical & quantitative mathematical MCQ questions.' },
            { step: '4', title: 'Speech Mock Interview', desc: 'Speak answers. Gemini conducts iterative domain evaluation.' },
            { step: '5', title: 'Score Reports', desc: 'Track technical/communication growth with charts.' }
          ].map(item => (
            <div key={item.step} className="glass-card" style={{ textAlign: 'center', borderTop: '3px solid var(--color-primary)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontWeight: 800, color: 'var(--color-primary)', border: '1px solid var(--color-primary)' }}>
                {item.step}
              </div>
              <h5 style={{ fontWeight: 700, marginBottom: 8 }}>{item.title}</h5>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="faq" style={{ padding: '80px 8%' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 12 }}>Frequently Asked Questions</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: '600px', margin: '0 auto 50px' }}>
          Find answers to general questions about our simulated placement preparation portal.
        </p>

        <div style={{ maxWidth: '750px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            {
              q: 'How does the interactive Speech Mock Interview evaluate my voice?',
              a: 'The system uses the built-in browser Web Speech API (SpeechRecognition) to transcribe your speech to text in real-time. Once submitted, Google Gemini API processes the textual input, comparing it to core technical concepts, and grades correctness, communication pacing, and grammatical structures.'
            },
            {
              q: 'Can I upload files for resume parsing?',
              a: 'Yes! You can copy-paste the plain text of your resume or paste parsed content directly into our ATS scanner zone. Gemini will analyze the text structure, locate missing keywords, and suggest improvements.'
            },
            {
              q: 'How do I activate live AI features?',
              a: 'By default, the platform runs with high-fidelity local fallback algorithms so you can test features offline. To enable live, dynamic responses powered directly by Google, navigate to the Settings tab in your sidebar and configure your personal Google Gemini API Key.'
            },
            {
              q: 'Is the Aptitude quiz score logged in the database?',
              a: 'Yes. Every time you complete a timed Quantitative, Logical, English, or Fundamentals MCQ paper, the score is automatically logged in the simulated database. You can track your scoring charts inside the My Report Card analytics page.'
            }
          ].map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div key={i} className="glass-card" style={{ padding: '18px 24px', cursor: 'pointer' }} onClick={() => setActiveFaq(isOpen ? null : i)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h5 style={{ fontSize: '1rem', fontWeight: 700, color: isOpen ? 'var(--color-primary)' : 'var(--text-primary)' }}>{faq.q}</h5>
                  <span style={{ fontSize: '1.2rem', fontWeight: 800, transition: 'transform 0.3s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                </div>
                {isOpen && (
                  <p className="animate-fade-in" style={{ marginTop: 12, color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.6, borderTop: '1px solid var(--panel-border)', paddingTop: 12 }}>
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* About */}
      <section id="about" style={{ padding: '80px 8%', background: 'rgba(255, 255, 255, 0.01)', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 20 }}>Tailored Specifically for Engineering & Diploma Students</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Most placement preparation platforms are generic. InterviewCompass is customized around standard university syllabi (CSE, IT, Electrical, Mechanical) and entry-level IT tests.
            </p>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
              The profile-driven system ensures you only prepare for relevant skills and companies, maximizing the conversion rate for your dream job or internship!
            </p>
            <button className="btn btn-primary" onClick={() => navigateTo('register')}>Complete Your Profile Now</button>
          </div>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '100%', height: '300px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(217, 70, 239, 0.2))', border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Brain size={48} style={{ color: 'var(--color-primary)', animation: 'pulse 2s infinite' }} />
                <h4 style={{ marginTop: 12, fontWeight: 700 }}>AI Recruitment Engine</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 4 }}>Simulating standard campus drives</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ padding: '80px 8%' }}>
        <div className="glass-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>Send Us a Message</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 24, textAlign: 'center' }}>
            Have a question, feature request, or feedback? Write to the admin logs below.
          </p>
          {feedbackSuccess && (
            <div className="badge badge-success" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginBottom: 16 }}>
              Thank you! Your feedback has been saved successfully in the Admin logs.
            </div>
          )}
          <form onSubmit={handleSubmitContact}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Your message / Question</label>
              <textarea className="form-input" rows={4} value={msg} onChange={e => setMsg(e.target.value)} required style={{ resize: 'vertical' }}></textarea>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Send Message</button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div>
            <div className="footer-brand-title">
              <Brain style={{ color: 'var(--color-primary)' }} />
              <span>InterviewCompass</span>
            </div>
            <p className="footer-text">
              The premium Google Gemini AI Powered placement preparation workspace. Practice live speech mock interviews, run ATS checks on resumes, solve aptitude quiz sets, and review targeted suggestions.
            </p>
            <div className="footer-social-row">
              <div className="footer-social-icon">💼</div>
              <div className="footer-social-icon">💬</div>
              <div className="footer-social-icon">🌐</div>
            </div>
          </div>

          <div className="footer-links-column">
            <h5>Navigation</h5>
            <ul className="footer-links-list">
              <li className="footer-link-item"><a href="#features">Platform Features</a></li>
              <li className="footer-link-item"><a href="#workflow">How It Works</a></li>
              <li className="footer-link-item"><a href="#faq">FAQ</a></li>
              <li className="footer-link-item" onClick={() => navigateTo('login')}>Student Login</li>
            </ul>
          </div>

          <div className="footer-stats-column">
            <h5>Placement Stats</h5>
            <div className="footer-stats-list">
              <div className="footer-stat-item">
                <span>Placement Rate Growth</span>
                <strong style={{ color: 'var(--color-success)' }}>+92%</strong>
              </div>
              <div className="footer-stat-item">
                <span>Active Preparing Students</span>
                <strong style={{ color: 'var(--text-primary)' }}>12,400+</strong>
              </div>
              <div className="footer-stat-item">
                <span>Mock Assessments Daily</span>
                <strong style={{ color: 'var(--color-accent)' }}>1,500+</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-copyright">
          <p>&copy; 2026 InterviewCompass Systems. All rights reserved. Empowering Engineering, Diploma, and IT careers.</p>
        </div>
      </footer>
    </div>
  );
}

// ----------------------------------------------------
// Authentication (Login/Register)
// ----------------------------------------------------
function AuthView({ isLogin }: { isLogin: boolean }) {
  const { login, register, navigateTo } = useApp();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (isLogin) {
      const success = login(email, password);
      if (!success) {
        setErrorMsg('Invalid email or password. Hint: student@interview.com / student123 or admin@interview.com / admin123');
      }
    } else {
      if (!email || !name || !password) {
        setErrorMsg('All fields are required.');
        return;
      }
      const success = register(name, email, password, role);
      if (!success) {
        setErrorMsg('Email address already registered.');
      }
    }
  };

  const handleGoogleLogin = () => {
    // Mock Google OAuth login
    const randomId = 'google_' + Math.random().toString(36).substr(2, 9);
    const mockUser: DBUser = {
      id: randomId,
      email: 'google.user@example.com',
      name: 'Google User',
      role: 'student',
      createdAt: new Date().toISOString()
    };
    db.saveUser(mockUser);
    
    // Create profile
    const newProfile: DBProfile = {
      userId: mockUser.id,
      photo: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
      phone: '',
      college: 'Mock University',
      branch: 'Information Technology',
      skills: ['HTML', 'CSS', 'JavaScript'],
      targetCompany: 'Google',
      targetRole: 'Software Engineer',
      updatedAt: new Date().toISOString()
    };
    db.saveProfile(newProfile);

    // Session save
    sessionStorage.setItem('ai_interview_session', JSON.stringify(mockUser));
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div className="glass-card gradient-border-card animate-fade-in" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Brain size={42} style={{ color: 'var(--color-primary)', marginBottom: 8 }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{isLogin ? 'Sign In' : 'Create Account'}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>to access your placement panel</p>
        </div>

        {errorMsg && (
          <div className="badge badge-danger" style={{ width: '100%', padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 6, alignItems: 'flex-start', textTransform: 'none', borderRadius: 'var(--border-radius-sm)' }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" placeholder="Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-input" placeholder="student@interview.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value as any)}>
                <option value="student">Student (Mock Interviews, Aptitude, Resume)</option>
                <option value="admin">System Administrator (CRUD Dashboard)</option>
              </select>
            </div>
          )}

          {isLogin && (
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', cursor: 'pointer' }} onClick={() => setShowForgot(true)}>
                Forgot Password?
              </span>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            {isLogin ? 'Sign In' : 'Register Account'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
          <span style={{ padding: '0 12px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
        </div>

        <button className="btn btn-secondary" style={{ width: '100%', gap: 10 }} onClick={handleGoogleLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ fill: 'currentColor' }}>
            <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.888H12.24z"/>
          </svg>
          Sign In with Google
        </button>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigateTo('register')}>
                Register
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span style={{ color: 'var(--color-primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => navigateTo('login')}>
                Sign In
              </span>
            </>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }} onClick={() => navigateTo('home')}>
            ← Back to Landing Page
          </span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ maxWidth: '380px', margin: '20px' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 12 }}>Password Reset Link Sent</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 20 }}>
              We have dispatched a simulated validation pin code to your email. Check your simulated mailbox, or just use the demo login values.
            </p>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setShowForgot(false)}>
              Okay, Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Student Dashboard
// ----------------------------------------------------
function StudentDashboard() {
  const { currentUser, currentProfile, navigateTo } = useApp();
  const [interviews, setInterviews] = useState<DBInterviewResult[]>([]);
  const [aptitudes, setAptitudes] = useState<DBAptitudeResult[]>([]);
  const [resumes, setResumes] = useState<DBResume[]>([]);

  useEffect(() => {
    if (currentUser) {
      setInterviews(db.getInterviewResults(currentUser.id));
      setAptitudes(db.getAptitudeResults(currentUser.id));
      setResumes(db.getResumes(currentUser.id));
    }
  }, [currentUser]);

  // Aggregate scores
  const avgScore = interviews.length > 0 
    ? Math.round(interviews.reduce((acc, curr) => acc + curr.score, 0) / interviews.length)
    : 0;

  const latestResume = resumes[resumes.length - 1];
  const resumeStatus = latestResume ? `ATS: ${latestResume.atsScore}%` : 'Not Uploaded';

  // Custom AI Action Recommendations
  const getSuggestions = () => {
    const list = [];
    if (!latestResume) {
      list.push({ text: 'Your resume has not been uploaded. Upload a resume to run the ATS checker.', action: 'resume', type: 'warning' });
    } else if (latestResume.atsScore < 75) {
      list.push({ text: `Your Resume ATS score is low (${latestResume.atsScore}%). Read our recommendations to fix format guidelines.`, action: 'resume', type: 'info' });
    }

    if (interviews.length === 0) {
      list.push({ text: 'You have not completed any mock interviews. Select a coding or HR category to start.', action: 'interview', type: 'primary' });
    } else {
      const lastInt = interviews[interviews.length - 1];
      if (lastInt.communicationScore < 75) {
        list.push({ text: `Your last interview (${lastInt.category}) communication index was ${lastInt.communicationScore}%. Try an HR Interview to boost confidence.`, action: 'interview', type: 'info' });
      }
    }

    if (aptitudes.length === 0) {
      list.push({ text: 'Aptitude tests are crucial for placement screening. Attempt our Logical Reasoning challenge today.', action: 'aptitude', type: 'primary' });
    }

    return list.slice(0, 3);
  };

  const suggestionsList = getSuggestions();

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-card gradient-border-card" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20 }}>
        <div>
          <h2 className="text-shimmer" style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>
            Welcome back, {currentUser?.name}! 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '600px' }}>
            {currentProfile?.college ? `Preparing for ${currentProfile.targetCompany || 'Top Tech Companies'} • ${currentProfile.branch}` : 'Complete your academic profile details so our AI can prepare customized interview questions.'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigateTo(currentProfile?.college ? 'interview' : 'profile')}>
          {currentProfile?.college ? 'Start Mock Interview' : 'Complete Profile'}
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Resume Status</span>
          <div className="stat-card-value">{resumeStatus}</div>
          <span className="badge badge-info" style={{ cursor: 'pointer' }} onClick={() => navigateTo('resume')}>Manage Resume</span>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Total Interviews</span>
          <div className="stat-card-value">{interviews.length}</div>
          <span className="badge badge-success">Active</span>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Average Score</span>
          <div className="stat-card-value">{avgScore}%</div>
          <span className={`badge ${avgScore >= 80 ? 'badge-success' : avgScore >= 60 ? 'badge-warning' : 'badge-danger'}`}>
            {avgScore >= 80 ? 'Excellent' : avgScore >= 60 ? 'Passing' : 'Needs Practice'}
          </span>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Daily Progress</span>
          <div className="stat-card-value">70%</div>
          <div style={{ width: '100%', height: '6px', background: 'var(--panel-border)', borderRadius: '4px', marginTop: 10, overflow: 'hidden' }}>
            <div style={{ width: '70%', height: '100%', background: 'var(--color-primary)' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: 32, marginBottom: 32 }}>
        {/* Analytics mini SVG Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h4 style={{ fontWeight: 700 }}>Performance Progress</h4>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Interview Performance Score</span>
          </div>
          {interviews.length > 0 ? (
            <div className="chart-container">
              {interviews.map((item) => {
                const heightPercent = `${item.score}%`;
                return (
                  <div key={item.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 700 }}>{item.score}%</div>
                    <div style={{ width: '40px', height: '180px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', display: 'flex', alignItems: 'flex-end', overflow: 'hidden', border: '1px solid var(--panel-border)' }}>
                      <div style={{ width: '100%', height: heightPercent, background: 'linear-gradient(180deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}></div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{item.category}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <TrendingUp size={36} style={{ marginBottom: 10 }} />
              <p style={{ fontSize: '0.9rem' }}>No data points. Complete an interview to see trends.</p>
            </div>
          )}
        </div>

        {/* AI suggestions Card */}
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} style={{ color: 'var(--color-secondary)' }} />
            AI Suggestions
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {suggestionsList.map((s, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 14, background: 'rgba(255,255,255,0.02)', cursor: 'pointer', borderLeft: `3px solid ${s.type === 'warning' ? 'var(--color-warning)' : s.type === 'primary' ? 'var(--color-primary)' : 'var(--color-accent)'}` }} onClick={() => navigateTo(s.action)}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 6 }}>{s.text}</p>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  Action now <ArrowRight size={12} />
                </span>
              </div>
            ))}
            {suggestionsList.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
                All systems optimal! You are ready to crack your interview.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card">
        <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Recent Activity</h4>
        <div className="data-table-wrapper" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Test / Interview</th>
                <th>Category</th>
                <th>Score</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {interviews.slice(0, 3).map((item) => (
                <tr key={item.id}>
                  <td>Mock Interview</td>
                  <td>{item.category}</td>
                  <td>{item.score}%</td>
                  <td><span className="badge badge-success">Completed</span></td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                </tr>
              ))}
              {aptitudes.slice(0, 3).map((item) => (
                <tr key={item.id}>
                  <td>Aptitude MCQ Test</td>
                  <td>{item.category}</td>
                  <td>{item.score}%</td>
                  <td><span className="badge badge-success">Completed</span></td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                </tr>
              ))}
              {interviews.length === 0 && aptitudes.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No recent activities recorded. Start practicing now!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Complete Profile View
// ----------------------------------------------------
function ProfileView() {
  const { currentUser, currentProfile, updateProfile } = useApp();
  const [photo, setPhoto] = useState(currentProfile?.photo || '');
  const [phone, setPhone] = useState(currentProfile?.phone || '');
  const [college, setCollege] = useState(currentProfile?.college || '');
  const [branch, setBranch] = useState(currentProfile?.branch || '');
  const [targetCompany, setTargetCompany] = useState(currentProfile?.targetCompany || '');
  const [targetRole, setTargetRole] = useState(currentProfile?.targetRole || '');
  const [skillInput, setSkillInput] = useState('');
  const [skills, setSkills] = useState<string[]>(currentProfile?.skills || []);
  const [success, setSuccess] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Str = reader.result;
        
        // Compress image using HTML5 Canvas to fit LocalStorage limits
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const max_size = 150; // Maximum avatar dimension
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > max_size) {
              height *= max_size / width;
              width = max_size;
            }
          } else {
            if (height > max_size) {
              width *= max_size / height;
              height = max_size;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.7); // 70% quality JPEG
            setPhoto(compressed);
          } else {
            setPhoto(base64Str);
          }
        };
        img.onerror = () => {
          setPhoto(base64Str);
        };
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillInput.trim()) return;
    const item = skillInput.trim();
    if (!skills.includes(item)) {
      setSkills([...skills, item]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    const newProfile: DBProfile = {
      userId: currentUser.id,
      photo: photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      phone: phone,
      college: college,
      branch: branch,
      skills: skills,
      targetCompany: targetCompany,
      targetRole: targetRole,
      updatedAt: new Date().toISOString()
    };

    updateProfile(newProfile);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '700px', margin: '0 auto' }}>
      <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Academic Profile Setup</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
        This profile configures our Google Gemini AI. The AI will target its Mock Interview questions and Resume ATS recommendations directly to match these skills, college, and roles.
      </p>

      {success && (
        <div className="badge badge-success" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginBottom: 20 }}>
          Academic Profile Updated Successfully!
        </div>
      )}

      <form onSubmit={handleSave}>
        <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: 24, marginBottom: 24, alignItems: 'center' }}>
          <img 
            src={photo || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
            alt="Profile Preview" 
            style={{ width: '130px', height: '130px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--panel-border)' }} 
          />
          <div>
            <div className="form-group">
              <label className="form-label">Upload Profile Photo</label>
              <input 
                type="file" 
                className="form-input" 
                accept="image/*" 
                onChange={handlePhotoUpload} 
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">College Name</label>
            <input type="text" className="form-input" placeholder="GEC, Mumbai" value={college} onChange={e => setCollege(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Branch / Specialization</label>
            <input type="text" className="form-input" placeholder="Computer Engineering" value={branch} onChange={e => setBranch(e.target.value)} required />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input type="text" className="form-input" placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Target Role</label>
              <input type="text" className="form-input" placeholder="Software Engineer" value={targetRole} onChange={e => setTargetRole(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Target Company</label>
              <input type="text" className="form-input" placeholder="TCS / Google" value={targetCompany} onChange={e => setTargetCompany(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Skills Tag System */}
        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Core Placement Skills</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Java, Python, SQL" 
              value={skillInput} 
              onChange={e => setSkillInput(e.target.value)} 
            />
            <button type="button" className="btn btn-secondary" onClick={handleAddSkill}>
              <Plus size={18} /> Add
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.map(s => (
              <span key={s} className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', textTransform: 'none' }}>
                {s}
                <XCircle size={14} style={{ cursor: 'pointer' }} onClick={() => handleRemoveSkill(s)} />
              </span>
            ))}
            {skills.length === 0 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No skills added. Add coding, web dev, or soft skills!</span>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          Save & Update Profile
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------
// Resume Module View
// ----------------------------------------------------
function ResumeView() {
  const { currentUser, currentProfile, updateProfile } = useApp();
  const [resumes, setResumes] = useState<DBResume[]>([]);
  const [resumeText, setResumeText] = useState('');
  const [fileName, setFileName] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ResumeAnalysisResult | null>(null);

  useEffect(() => {
    if (currentUser) {
      setResumes(db.getResumes(currentUser.id));
    }
  }, [currentUser]);

  const handleUploadResumeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim() || !currentUser) return;
    
    setIsAnalyzing(true);
    setAnalysisResult(null);

    const actualFileName = fileName || 'Uploaded_Resume_Text.txt';

    try {
      const analysis = await analyzeResume(resumeText);
      const newResume: DBResume = {
        id: 'res_' + Math.random().toString(36).substr(2, 9),
        userId: currentUser.id,
        fileName: actualFileName,
        fileSize: `${Math.round(resumeText.length / 1024)} KB`,
        uploadDate: new Date().toISOString(),
        parsedText: resumeText,
        summary: analysis.summary,
        atsScore: analysis.atsScore,
        skillsDetected: analysis.skillsDetected,
        missingSkills: analysis.missingSkills,
        grammarMistakes: analysis.grammarMistakes,
        improvementSuggestions: analysis.improvementSuggestions
      };

      db.saveResume(newResume);
      setResumes(prev => [...prev, newResume]);
      setAnalysisResult(analysis);
      setResumeText('');
      setFileName('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDelete = (id: string) => {
    db.deleteResume(id);
    setResumes(resumes.filter(r => r.id !== id));
    if (analysisResult) setAnalysisResult(null);
  };

  const handleQuickAddSkills = (missing: string[]) => {
    if (!currentUser || !currentProfile) return;
    const combined = [...new Set([...currentProfile.skills, ...missing])];
    const updated: DBProfile = {
      ...currentProfile,
      skills: combined,
      updatedAt: new Date().toISOString()
    };
    updateProfile(updated);
    alert('Missing skills successfully incorporated into your Academic Profile tags!');
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: 32 }}>
        
        {/* Upload Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: 6 }}>Resume ATS Parser</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
              Paste your resume plain text or copy key blocks to run the Google Gemini ATS analyzer.
            </p>

            <form onSubmit={handleUploadResumeText}>
              <div className="form-group">
                <label className="form-label">Resume Filename</label>
                <input type="text" className="form-input" placeholder="Rahul_Sharma_Resume.pdf" value={fileName} onChange={e => setFileName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Resume Text Content</label>
                <textarea 
                  className="form-input" 
                  rows={8} 
                  placeholder="Paste complete resume content including education, work experience, projects, and tech stack details..." 
                  value={resumeText} 
                  onChange={e => setResumeText(e.target.value)} 
                  required
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={isAnalyzing}>
                {isAnalyzing ? 'AUPAD Inteligens Parsing Content...' : 'Run ATS Scanner'}
              </button>
            </form>
          </div>

          {/* History */}
          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Upload History</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {resumes.map(r => (
                <div key={r.id} style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', padding: 12, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-sm)', border: '1px solid var(--panel-border)' }}>
                  <div style={{ cursor: 'pointer' }} onClick={() => setAnalysisResult(r)}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{r.fileName}</div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Score: {r.atsScore}% • {new Date(r.uploadDate).toLocaleDateString()}</span>
                  </div>
                  <button className="btn btn-secondary" style={{ padding: 6, color: 'var(--color-danger)' }} onClick={() => handleDelete(r.id)}>
                    <Trash size={16} />
                  </button>
                </div>
              ))}
              {resumes.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>No resume files scanned yet.</p>
              )}
            </div>
          </div>
        </div>

        {/* Results Analysis Column */}
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 20 }}>ATS Analysis Report</h4>
          
          {isAnalyzing && (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Brain size={48} style={{ color: 'var(--color-primary)', animation: 'pulse 1.5s infinite' }} />
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>AUPAD Inteligens is scanning resume structure, detecting placement keywords...</p>
            </div>
          )}

          {!isAnalyzing && !analysisResult && (
            <div style={{ height: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center' }}>
              <FileCheck size={48} style={{ marginBottom: 12 }} />
              <p style={{ fontSize: '0.95rem' }}>No active report. Paste resume details and click Scan.</p>
            </div>
          )}

          {!isAnalyzing && analysisResult && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              
              {/* ATS SCORE */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--panel-border)' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-primary)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{analysisResult.atsScore}%</div>
                </div>
                <div>
                  <h5 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>ATS Compliance Index</h5>
                  <span className={`badge ${analysisResult.atsScore >= 75 ? 'badge-success' : 'badge-warning'}`}>
                    {analysisResult.atsScore >= 75 ? 'ATS Optimized' : 'Needs Optimization'}
                  </span>
                </div>
              </div>

              {/* SUMMARY */}
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: 'var(--text-secondary)' }}>Professional Summary</h5>
                <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>{analysisResult.summary}</p>
              </div>

              {/* SKILLS DETECTED */}
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-secondary)' }}>Detected Tech Stack</h5>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {analysisResult.skillsDetected.map((s: string) => (
                    <span key={s} className="badge badge-success" style={{ textTransform: 'none' }}>{s}</span>
                  ))}
                </div>
              </div>

              {/* MISSING SKILLS */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h5 style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Missing Placement Skills</h5>
                  {analysisResult.missingSkills.length > 0 && (
                    <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleQuickAddSkills(analysisResult.missingSkills)}>
                      + Add to Profile
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {analysisResult.missingSkills.map((s: string) => (
                    <span key={s} className="badge badge-danger" style={{ textTransform: 'none' }}>{s}</span>
                  ))}
                  {analysisResult.missingSkills.length === 0 && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>None! Your profile matches typical IT criteria perfectly.</span>
                  )}
                </div>
              </div>

              {/* GRAMMAR MISTAKES */}
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: 'var(--text-secondary)' }}>Grammar & Formatting Edits</h5>
                <ul style={{ paddingLeft: 18, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysisResult.grammarMistakes.map((g: string, i: number) => (
                    <li key={i} style={{ color: 'var(--color-warning)' }}>{g}</li>
                  ))}
                </ul>
              </div>

              {/* TIPS */}
              <div>
                <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 6, color: 'var(--text-secondary)' }}>Actionable Improvement Tips</h5>
                <ul style={{ paddingLeft: 18, fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysisResult.improvementSuggestions.map((t: string, i: number) => (
                    <li key={i} style={{ color: 'var(--text-primary)' }}>{t}</li>
                  ))}
                </ul>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// AI Mock Interview Workspace
// ----------------------------------------------------
interface InterviewHistoryItem {
  question: string;
  answer: string;
  analysis?: AnswerEvaluationResult;
}

function InterviewWorkspace() {
  const { currentUser, currentProfile } = useApp();
  const [step, setStep] = useState<'category' | 'interview' | 'report'>('category');
  const [category, setCategory] = useState('');
  
  // Active Interview states
  const [questionsHistory, setQuestionsHistory] = useState<InterviewHistoryItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  
  // Voice settings
  const [isRecording, setIsRecording] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setAnswerInput(prev => prev + ' ' + text);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Speak question
  const speakQuestion = (text: string) => {
    if (voicePlayback && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SynthesisUtteranceHack(text);
      window.speechSynthesis.speak(utterance);
    }
  };


  const handleStartInterview = async (cat: string) => {
    setCategory(cat);
    setStep('interview');
    setLoadingQuestion(true);
    setQuestionsHistory([]);
    setAnswerInput('');

    try {
      const q = await getNextInterviewQuestion(cat, [], currentProfile);
      setCurrentQuestion(q);
      setTimeout(() => speakQuestion(q), 500);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome/Microsoft Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || !currentUser) return;
    
    // Stop recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setLoadingEvaluation(true);
    const candidateAnswer = answerInput.trim();
    
    try {
      // Evaluate current answer
      const evalReport = await evaluateInterviewAnswer(category, currentQuestion, candidateAnswer);
      
      const updatedHistory = [
        ...questionsHistory, 
        { question: currentQuestion, answer: candidateAnswer, analysis: evalReport }
      ];
      setQuestionsHistory(updatedHistory);
      setAnswerInput('');

      // If we completed 3 questions, finish interview
      if (updatedHistory.length >= 3) {
        // Calculate average metrics
        const avgScore = Math.round(updatedHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / updatedHistory.length);
        const finalReport: DBInterviewResult = {
          id: 'int_' + Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          category: category,
          date: new Date().toISOString(),
          score: avgScore,
          technicalScore: Math.min(100, avgScore + Math.floor(Math.random() * 8) - 4),
          communicationScore: Math.min(100, avgScore + Math.floor(Math.random() * 10) - 5),
          grammarScore: Math.min(100, avgScore + Math.floor(Math.random() * 6) - 3),
          answers: updatedHistory.map(h => ({
            question: h.question,
            answer: h.answer,
            analysis: {
              correctness: h.analysis?.correctness || 'Completed',
              communication: h.analysis?.communication || 'Good',
              grammar: h.analysis?.grammar || 'Proper',
              technicalKnowledge: h.analysis?.technicalKnowledge || 'Strong',
              suggestions: h.analysis?.suggestions || 'None',
              score: h.analysis?.score || 70
            }
          })),
          suggestions: `Strengthen coding foundations in ${category}. Practice formatting structures during final assessments.`
        };

        db.saveInterviewResult(finalReport);
        setStep('report');
      } else {
        // Fetch next question
        setLoadingQuestion(true);
        const historyParam = updatedHistory.map(h => ({ question: h.question, answer: h.answer }));
        const nextQ = await getNextInterviewQuestion(category, historyParam, currentProfile);
        setCurrentQuestion(nextQ);
        setTimeout(() => speakQuestion(nextQ), 500);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvaluation(false);
      setLoadingQuestion(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* STEP 1: Select Category */}
      {step === 'category' && (
        <div>
          <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Mock Interview Workspace</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 28 }}>
            Choose a domain to start a simulated mock interview. Gemini AI will ask questions sequentially, capture your replies via text or voice, and compile a final performance card.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {['HR Interview', 'Java', 'C Programming', 'Python', 'HTML', 'CSS', 'JavaScript', 'Web Development', 'Authentication', 'React UI & Routing', 'Testing & Deployment'].map(cat => (
              <div key={cat} className="glass-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '30px 20px' }} onClick={() => handleStartInterview(cat)}>
                <Mic size={32} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
                <h5 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{cat}</h5>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Start Simulator</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Interactive Interview Workspace */}
      {step === 'interview' && (
        <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          {/* Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--panel-border)', marginBottom: 20 }}>
            <div>
              <span className="badge badge-info" style={{ marginBottom: 4 }}>{category} Category</span>
              <h4 style={{ fontWeight: 700 }}>Question {questionsHistory.length + 1} of 3</h4>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button className="btn btn-secondary" style={{ padding: 8, borderRadius: '50%' }} onClick={() => setVoicePlayback(!voicePlayback)}>
                {voicePlayback ? <Volume2 size={18} style={{ color: 'var(--color-primary)' }} /> : <Volume2 size={18} style={{ color: 'var(--text-muted)' }} />}
              </button>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Voice Playback</span>
            </div>
          </div>

          {/* Question Display */}
          <div className="glass-card animate-fade-in" style={{ background: 'rgba(255,255,255,0.02)', marginBottom: 24, minHeight: '100px', display: 'flex', alignItems: 'center', padding: '20px' }}>
            {loadingQuestion ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: 'var(--text-muted)' }}>
                <Brain size={20} className="animate-spin" />
                <span>AI Recruiter generating next question...</span>
              </div>
            ) : (
              <p style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5 }}>
                {currentQuestion || 'Please prepare...'}
              </p>
            )}
          </div>

          {/* Answer Input */}
          <div className="form-group" style={{ position: 'relative' }}>
            <label className="form-label">Your Response (Type or Record Voice)</label>
            <textarea 
              className="form-input" 
              rows={6} 
              placeholder="Structure your answer clearly. Speak or write key technical details..." 
              value={answerInput}
              onChange={e => setAnswerInput(e.target.value)}
              disabled={loadingEvaluation}
            ></textarea>
            
            {/* Recording Controls */}
            <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
              {isRecording && <span style={{ fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 600 }}>Listening...</span>}
              <button 
                type="button" 
                className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: 8, borderRadius: '50%' }}
                onClick={handleToggleRecord}
                disabled={loadingEvaluation}
              >
                {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setStep('category')} disabled={loadingEvaluation}>
              Cancel Interview
            </button>
            <button className="btn btn-primary" onClick={handleSubmitAnswer} disabled={loadingEvaluation || !answerInput.trim()}>
              {loadingEvaluation ? 'AUPAD Inteligens Evaluating Response...' : 'Submit Answer & Continue'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Interview Report Card */}
      {step === 'report' && (
        <div style={{ maxWidth: '850px', margin: '0 auto' }}>
          <div className="glass-card gradient-border-card" style={{ marginBottom: 30, textAlign: 'center', padding: '40px' }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }}>Interview Performance Completed! 🎉</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: 30 }}>
              Here is the detailed scorecard evaluated by Gemini AI matching college-placement expectations.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
              <div>
                <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid var(--color-primary)', margin: '0 auto 10px' }}>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                    {questionsHistory.length > 0 ? Math.round(questionsHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / questionsHistory.length) : 0}%
                  </div>
                </div>
                <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Overall Score</h5>
              </div>
            </div>
          </div>

          {/* Detailed Question Review */}
          <h4 style={{ fontWeight: 800, marginBottom: 16 }}>Detailed Answer Breakdown</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {questionsHistory.map((item, idx) => (
              <div key={idx} className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
                <h5 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, color: 'var(--text-secondary)' }}>Question {idx + 1}: {item.question}</h5>
                <p style={{ fontSize: '0.9rem', padding: 12, background: 'rgba(0,0,0,0.15)', borderRadius: 'var(--border-radius-sm)', marginBottom: 16 }}>
                  <strong style={{ color: 'var(--color-primary)' }}>Your Answer:</strong> {item.answer}
                </p>

                {item.analysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: 'var(--color-success)' }}>Correctness:</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{item.analysis.correctness}</p>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-accent)' }}>Communication style:</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{item.analysis.communication}</p>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-warning)' }}>Grammar Check:</strong>
                      <p style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{item.analysis.grammar}</p>
                    </div>
                    <div>
                      <strong style={{ color: 'var(--color-primary)' }}>Improvement Tip:</strong>
                      <p style={{ color: 'var(--text-primary)', marginTop: 2 }}>{item.analysis.suggestions}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn-primary animate-fade-in" onClick={() => setStep('category')}>
              Practice Another Domain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// AI Video Mock Interview Workspace
// ----------------------------------------------------
function VideoInterviewWorkspace() {
  const { currentUser, currentProfile } = useApp();
  const [step, setStep] = useState<'category' | 'camera-setup' | 'interview' | 'report'>('category');
  const [category, setCategory] = useState('');
  
  // Active Interview states
  const [questionsHistory, setQuestionsHistory] = useState<InterviewHistoryItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answerInput, setAnswerInput] = useState('');
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingEvaluation, setLoadingEvaluation] = useState(false);
  
  // Camera & voice stream settings
  const [isRecording, setIsRecording] = useState(false);
  const [voicePlayback, setVoicePlayback] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        const text = event.results[event.results.length - 1][0].transcript;
        setAnswerInput(prev => prev + ' ' + text);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Clean up stream, speech synthesis and speech recognition on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore already stopped recognition errors
        }
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [stream]);

  // Speak question helper
  const speakQuestion = (text: string) => {
    if (voicePlayback && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SynthesisUtteranceHack(text);
      window.speechSynthesis.speak(utterance);
    }
  };


  const handleStartCameraSetup = (cat: string) => {
    setCategory(cat);
    setStep('camera-setup');
    startWebcam();
  };

  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setStream(mediaStream);
      setCameraError(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 300);
    } catch (err) {
      console.error('Error accessing webcam/mic:', err);
      setCameraError(true);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleLaunchInterview = async () => {
    setStep('interview');
    setLoadingQuestion(true);
    setQuestionsHistory([]);
    setAnswerInput('');

    try {
      const q = await getNextInterviewQuestion(category, [], currentProfile);
      setCurrentQuestion(q);
      setTimeout(() => speakQuestion(q), 500);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleToggleRecord = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome/Microsoft Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setIsRecording(true);
      recognitionRef.current.start();
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerInput.trim() || !currentUser) return;
    
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setLoadingEvaluation(true);
    const candidateAnswer = answerInput.trim();
    
    try {
      const evalReport = await evaluateInterviewAnswer(category, currentQuestion, candidateAnswer);
      
      const updatedHistory = [
        ...questionsHistory, 
        { question: currentQuestion, answer: candidateAnswer, analysis: evalReport }
      ];
      setQuestionsHistory(updatedHistory);
      setAnswerInput('');

      if (updatedHistory.length >= 3) {
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }

        const avgScore = Math.round(updatedHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / updatedHistory.length);
        const finalReport: DBInterviewResult = {
          id: 'int_' + Math.random().toString(36).substr(2, 9),
          userId: currentUser.id,
          category: `Video Interview - ${category}`,
          date: new Date().toISOString(),
          score: avgScore,
          technicalScore: Math.min(100, avgScore + Math.floor(Math.random() * 8) - 4),
          communicationScore: Math.min(100, avgScore + Math.floor(Math.random() * 10) - 5),
          grammarScore: Math.min(100, avgScore + Math.floor(Math.random() * 6) - 3),
          answers: updatedHistory.map(h => ({
            question: h.question,
            answer: h.answer,
            analysis: {
              correctness: h.analysis?.correctness || 'Completed',
              communication: h.analysis?.communication || 'Good',
              grammar: h.analysis?.grammar || 'Proper',
              technicalKnowledge: h.analysis?.technicalKnowledge || 'Strong',
              suggestions: h.analysis?.suggestions || 'None',
              score: h.analysis?.score || 70
            }
          })),
          suggestions: `Strengthen coding foundations in ${category}. Enhance non-verbal body language cues in video reviews.`
        };

        db.saveInterviewResult(finalReport);
        setStep('report');
      } else {
        setLoadingQuestion(true);
        const historyParam = updatedHistory.map(h => ({ question: h.question, answer: h.answer }));
        const nextQ = await getNextInterviewQuestion(category, historyParam, currentProfile);
        setCurrentQuestion(nextQ);
        setTimeout(() => speakQuestion(nextQ), 500);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEvaluation(false);
      setLoadingQuestion(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.1; }
        }
        .recording-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: var(--color-danger);
          display: inline-block;
          margin-right: 6px;
          animation: blink 1.2s infinite;
        }
      `}</style>

      {/* STEP 1: Select Category */}
      {step === 'category' && (
        <div>
          <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Video Mock Interview Workspace</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 28 }}>
            Simulate a real video panel interview. Turn on your webcam and answer coding or behavioral questions. Gemini AI will evaluate your communication and correctness details.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {['HR Interview', 'Java', 'C Programming', 'Python', 'HTML', 'CSS', 'JavaScript', 'Web Development', 'Authentication', 'React UI & Routing', 'Testing & Deployment'].map(cat => (
              <div key={cat} className="glass-card" style={{ cursor: 'pointer', textAlign: 'center', padding: '30px 20px' }} onClick={() => handleStartCameraSetup(cat)}>
                <Video size={32} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
                <h5 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{cat}</h5>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Select & Set Camera</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: Camera & Mic Permission setup */}
      {step === 'camera-setup' && (
        <div className="glass-card" style={{ maxWidth: '650px', margin: '0 auto', textAlign: 'center' }}>
          <h4 style={{ fontWeight: 800, marginBottom: 10 }}>Verify Webcam & Mic Access</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
            Ensure your web camera is connected and you grant browser permissions for the simulated coding panel interview.
          </p>

          <div style={{ width: '100%', height: '320px', borderRadius: 'var(--radius-md)', background: '#0a0d24', border: '1px solid var(--panel-border)', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {cameraError ? (
              <div style={{ padding: 20 }}>
                <VideoOff size={48} style={{ color: 'var(--color-danger)', marginBottom: 12, margin: '0 auto' }} />
                <p style={{ color: 'var(--color-danger)', fontSize: '0.9rem', fontWeight: 600 }}>Webcam access failed.</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: 4 }}>Please verify browser device settings or connect a camera.</p>
              </div>
            ) : stream ? (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div>
                <Video size={48} style={{ color: 'var(--color-primary)', marginBottom: 12, margin: '0 auto' }} />
                <p style={{ fontSize: '0.9rem' }}>Accessing media devices...</p>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            <button className="btn btn-secondary" onClick={() => { stopCamera(); setStep('category'); }}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleLaunchInterview} disabled={cameraError || !stream}>
              Launch Panel Interview
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Video Workspace simulator */}
      {step === 'interview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr', gap: 32 }}>
          {/* Left Column: Video Feed & badging */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="badge badge-info">{category} Stream</span>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-danger)', fontWeight: 700 }}>
                  <span className="recording-dot"></span>
                  <span>● LIVE RECORDING</span>
                </div>
              )}
            </div>

            <div style={{ width: '100%', height: '300px', borderRadius: 'var(--radius-md)', background: '#0a0d24', border: '1px solid var(--panel-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {stream ? (
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div>
                  <VideoOff size={48} style={{ color: 'var(--text-muted)', marginBottom: 12, margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Camera inactive.</p>
                </div>
              )}
            </div>

            {/* Recruiter Avatar Box */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-sm)' }}>
              <Brain size={24} style={{ color: 'var(--color-primary)' }} />
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>AI Recruitment Examiner</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Evaluating answer grammar, logic, and presentation indices.</div>
              </div>
            </div>
          </div>

          {/* Right Column: AI Workspace Questions */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--panel-border)', marginBottom: 20 }}>
                <h4 style={{ fontWeight: 700 }}>Question {questionsHistory.length + 1} of 3</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Volume2 size={16} style={{ color: voicePlayback ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Audio Readout</span>
                  <input type="checkbox" checked={voicePlayback} onChange={e => setVoicePlayback(e.target.checked)} />
                </div>
              </div>

              {loadingQuestion ? (
                <div style={{ padding: '40px 0', textAlign: 'center' }}>
                  <Brain className="animate-spin" size={32} style={{ color: 'var(--color-primary)', marginBottom: 12, margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-muted)' }}>AUPAD Inteligens formulating technical question...</p>
                </div>
              ) : (
                <div className="animate-fade-in">
                  <p style={{ fontSize: '1.1rem', fontWeight: 600, lineHeight: 1.5, marginBottom: 24, padding: 16, background: 'rgba(99, 102, 241, 0.05)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-primary)' }}>
                    {currentQuestion}
                  </p>

                  <div className="form-group">
                    <label className="form-label">Your Response</label>
                    <textarea 
                      className="form-input" 
                      rows={5} 
                      placeholder="Click Record Response to speak, or write your answer manually..." 
                      value={answerInput}
                      onChange={e => setAnswerInput(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 14, marginTop: 24 }}>
              <button 
                type="button" 
                className={`btn ${isRecording ? 'btn-danger' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={handleToggleRecord}
                disabled={loadingQuestion || loadingEvaluation}
              >
                {isRecording ? 'Stop Recording' : 'Record Response'}
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={handleSubmitAnswer}
                disabled={loadingQuestion || loadingEvaluation || !answerInput.trim()}
              >
                {loadingEvaluation ? 'AUPAD Inteligens Evaluating...' : 'Submit Response'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: Mock Performance Report Card */}
      {step === 'report' && (
        <div className="glass-card animate-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <Award size={48} style={{ color: 'var(--color-success)', marginBottom: 12, margin: '0 auto' }} />
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Video Mock Assessment Complete</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Below is the comprehensive evaluation of your answers by AUPAD Inteligens.</p>
          </div>

          {/* Performance scorecard details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>AGGREGATE SCORE</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-success)', marginTop: 8 }}>
                {questionsHistory.length > 0 ? Math.round(questionsHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / questionsHistory.length) : 0}%
              </div>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>TECHNICAL INDEX</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-primary)', marginTop: 8 }}>
                {questionsHistory.length > 0 ? Math.min(100, Math.round(questionsHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / questionsHistory.length) + 4) : 0}%
              </div>
            </div>
            <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--panel-border)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMMUNICATION INDEX</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--color-accent)', marginTop: 8 }}>
                {questionsHistory.length > 0 ? Math.min(100, Math.round(questionsHistory.reduce((acc, curr) => acc + (curr.analysis?.score || 0), 0) / questionsHistory.length) + 6) : 0}%
              </div>
            </div>
          </div>

          {/* Expanded answers listing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {questionsHistory.map((item, idx) => (
              <div key={idx} style={{ padding: 20, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h5 style={{ fontWeight: 700, color: 'var(--color-primary)' }}>Q{idx + 1}: {item.question}</h5>
                  <span className="badge badge-info">Score: {item.analysis?.score || 70}%</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  <strong>Your Answer:</strong> "{item.answer}"
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.85rem', borderTop: '1px solid var(--panel-border)', paddingTop: 12 }}>
                  <div>
                    <strong style={{ color: 'var(--color-accent)' }}>Technical Feedback:</strong>
                    <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{item.analysis?.correctness}</p>
                  </div>
                  <div>
                    <strong style={{ color: 'var(--color-secondary)' }}>Pacing & Suggestions:</strong>
                    <p style={{ marginTop: 4, color: 'var(--text-secondary)' }}>{item.analysis?.suggestions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn-primary animate-fade-in" onClick={() => setStep('category')}>
              Practice Another Video Domain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// AI Career Assistant Chatbot
// ----------------------------------------------------
function CareerChatView() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'assistant', text: 'Hello! I am your AI Career Assistant. Ask me anything about placements, coding prep pathways (Java, C, Web), resume checklists, or companies!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      sender: 'user',
      text: textToSend.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal('');
    setIsTyping(true);

    try {
      const response = await askCareerAssistant(userMsg.text, messages);
      const assistantMsg: ChatMessage = {
        sender: 'assistant',
        text: response,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  return (
    <div className="test-layout animate-fade-in">
      
      {/* Chat Window Column */}
      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.sender}`}>
              <div style={{ whiteSpace: 'pre-line' }}>{m.text}</div>
              <span style={{ fontSize: '0.65rem', display: 'block', textAlign: 'right', marginTop: 4, opacity: 0.6 }}>{m.time}</span>
            </div>
          ))}
          {isTyping && (
            <div className="chat-bubble assistant" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Brain size={16} className="animate-spin" />
              <span>AUPAD Inteligens...</span>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="chat-input-bar">
          <input 
            type="text" 
            className="form-input" 
            placeholder="Write your career questions here..." 
            value={inputVal} 
            onChange={e => setInputVal(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSendMessage(inputVal)}
          />
          <button className="btn btn-primary" onClick={() => handleSendMessage(inputVal)} disabled={!inputVal.trim() || isTyping}>
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* Suggested Topics Column */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Suggested Quick Prompts</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 16 }}>
            Click any prompt below to get instant guidance cards.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Give me Java multi-threading interview questions.',
              'What is the typical recruitment process for TCS?',
              'How should I structure my resume projects section?',
              'Explain how to answer: "What are your weaknesses?"',
              'What core DSA topics are asked in startup placements?'
            ].map(p => (
              <button 
                key={p} 
                className="btn btn-secondary" 
                style={{ textAlign: 'left', fontSize: '0.8rem', padding: '12px' }}
                onClick={() => handleQuickPrompt(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

// ----------------------------------------------------
// Aptitude Test Arena
// ----------------------------------------------------
function AptitudeTestView() {
  const { currentUser } = useApp();
  const [step, setStep] = useState<'intro' | 'test' | 'results'>('intro');
  const [category, setCategory] = useState<'Quantitative' | 'Logical Reasoning' | 'English' | 'Computer Fundamentals'>('Quantitative');
  
  // Test run states
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(300); // 5 mins
  const timerRef = useRef<any>(null);

  const startTest = (cat: typeof category) => {
    setCategory(cat);
    const dbQuestions = db.getAptitudeQuestions().filter(q => q.category === cat);
    setQuestions(dbQuestions);
    setSelectedAnswers({});
    setCurrentIndex(0);
    setTimeLeft(300);
    setStep('test');
    
    // Clear old timers
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Start countdown
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Auto submit
          setStep('results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const selectAnswer = (ansIdx: number) => {
    setSelectedAnswers({
      ...selectedAnswers,
      [currentIndex]: ansIdx
    });
  };

  const calculateResults = (): DBAptitudeResult | null => {
    if (!currentUser) return null;
    let correct = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correct++;
      }
    });

    const scorePct = Math.round((correct / questions.length) * 100);
    const result: DBAptitudeResult = {
      id: 'ar_' + Math.random().toString(36).substr(2, 9),
      userId: currentUser.id,
      category: category,
      score: scorePct,
      correctAnswers: correct,
      totalQuestions: questions.length,
      date: new Date().toISOString()
    };

    db.saveAptitudeResult(result);
    return result;
  };

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    calculateResults();
    setStep('results');
  };

  const getTimerString = () => {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="animate-fade-in">
      {step === 'intro' && (
        <div>
          <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Aptitude Test Arena</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 28 }}>
            Practicing MCQs daily is necessary for passing the initial screening round of tech companies. Start a quick 5-minute timed challenge.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
            {['Quantitative', 'Logical Reasoning', 'English', 'Computer Fundamentals'].map(cat => (
              <div key={cat} className="glass-card" style={{ textAlign: 'center', padding: '30px 20px', cursor: 'pointer' }} onClick={() => startTest(cat as any)}>
                <BookOpen size={32} style={{ color: 'var(--color-primary)', marginBottom: 12 }} />
                <h5 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 8 }}>{cat}</h5>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Launch Paper</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 'test' && questions.length > 0 && (
        <div className="test-layout">
          
          {/* Active Question Box */}
          <div className="glass-card">
            <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--panel-border)', marginBottom: 20 }}>
              <span className="badge badge-info">Question {currentIndex + 1} of {questions.length}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: timeLeft < 60 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                <Clock size={16} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{getTimerString()}</span>
              </div>
            </div>

            <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 24, lineHeight: 1.5 }}>
              {questions[currentIndex].question}
            </p>

            <div style={{ marginBottom: 24 }}>
              {questions[currentIndex].options.map((opt: string, idx: number) => {
                const isSelected = selectedAnswers[currentIndex] === idx;
                return (
                  <button 
                    key={idx}
                    className={`option-button ${isSelected ? 'selected' : ''}`}
                    onClick={() => selectAnswer(idx)}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + idx)}</span>
                    <span>{opt}</span>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                Previous Question
              </button>

              {currentIndex === questions.length - 1 ? (
                <button className="btn btn-primary" onClick={handleSubmit}>
                  Submit Test Paper
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}>
                  Next Question
                </button>
              )}
            </div>
          </div>

          {/* Sidebar Navigation */}
          <div className="glass-card">
            <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Overview</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
              {questions.map((_, idx) => {
                const isAnswered = selectedAnswers[idx] !== undefined;
                const isActive = currentIndex === idx;
                return (
                  <button 
                    key={idx}
                    className="btn btn-secondary"
                    style={{ 
                      padding: 10, 
                      borderRadius: 'var(--border-radius-sm)', 
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      background: isActive ? 'var(--color-primary)' : isAnswered ? 'rgba(var(--color-primary-rgb), 0.15)' : 'rgba(255,255,255,0.03)',
                      borderColor: isActive ? 'var(--color-primary)' : isAnswered ? 'var(--color-primary)' : 'var(--panel-border)',
                      color: isActive ? 'white' : 'var(--text-primary)'
                    }}
                    onClick={() => setCurrentIndex(idx)}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleSubmit}>
              Force Submit Now
            </button>
          </div>

        </div>
      )}

      {step === 'results' && questions.length > 0 && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          
          <div className="glass-card gradient-border-card animate-fade-in" style={{ textAlign: 'center', padding: '40px', marginBottom: 30 }}>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Test Assessment Complete</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>Category: {category}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 40, margin: '20px 0' }}>
              <div>
                <h4 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                  {questions.filter((q, idx) => selectedAnswers[idx] === q.correctAnswerIndex).length} / {questions.length}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Correct Answers</span>
              </div>
              <div>
                <h4 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                  {Math.round((questions.filter((q, idx) => selectedAnswers[idx] === q.correctAnswerIndex).length / questions.length) * 100)}%
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Score Percent</span>
              </div>
            </div>
          </div>

          <h4 style={{ fontWeight: 800, marginBottom: 16 }}>Answer Explanations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {questions.map((q, idx) => {
              const userAnsIdx = selectedAnswers[idx];
              const isCorrect = userAnsIdx === q.correctAnswerIndex;
              return (
                <div key={q.id} className="glass-card" style={{ borderLeft: `4px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
                  <h5 style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>Question {idx + 1}: {q.question}</h5>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                    <p>Your Answer: <strong style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>{userAnsIdx !== undefined ? q.options[userAnsIdx] : 'Unanswered'}</strong></p>
                    <p>Correct Answer: <strong style={{ color: 'var(--color-success)' }}>{q.options[q.correctAnswerIndex]}</strong></p>
                  </div>
                  <div style={{ padding: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: 'var(--border-radius-sm)', fontSize: '0.85rem' }}>
                    <strong style={{ color: 'var(--color-primary)', display: 'block', marginBottom: 4 }}>Logical Steps Explanation:</strong>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="btn btn-primary" onClick={() => setStep('intro')}>
              Return to Test Arena
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------
// Performance Report card / Analytics View
// ----------------------------------------------------
function AnalyticsView() {
  const { currentUser } = useApp();
  const [interviews, setInterviews] = useState<DBInterviewResult[]>([]);

  useEffect(() => {
    if (currentUser) {
      setInterviews(db.getInterviewResults(currentUser.id));
    }
  }, [currentUser]);

  // Aggregate math
  const totalInterviews = interviews.length;
  const avgIntScore = totalInterviews > 0 
    ? Math.round(interviews.reduce((acc, curr) => acc + curr.score, 0) / totalInterviews)
    : 0;

  const avgTechScore = totalInterviews > 0 
    ? Math.round(interviews.reduce((acc, curr) => acc + curr.technicalScore, 0) / totalInterviews)
    : 0;

  const avgCommScore = totalInterviews > 0 
    ? Math.round(interviews.reduce((acc, curr) => acc + curr.communicationScore, 0) / totalInterviews)
    : 0;

  return (
    <div className="animate-fade-in">
      <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Academic Performance Scorecard</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 28 }}>
        This page logs your overall scoring metrics. Track details below to identify technical flaws or communication gaps before final placement exams.
      </p>

      {/* Aggregate Cards */}
      <div className="stats-grid">
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Interviews Conducted</span>
          <div className="stat-card-value">{totalInterviews}</div>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Average Score</span>
          <div className="stat-card-value">{avgIntScore}%</div>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Technical Index</span>
          <div className="stat-card-value">{avgTechScore}%</div>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Communication Index</span>
          <div className="stat-card-value">{avgCommScore}%</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 32 }}>
        
        {/* Strong/Weak Skills */}
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Skills Assessment Analysis</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <strong style={{ color: 'var(--color-success)', display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Strong Skills Detected</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {avgTechScore >= 75 ? (
                  <span className="badge badge-success" style={{ textTransform: 'none' }}>Logical Coding Architecture</span>
                ) : null}
                <span className="badge badge-success" style={{ textTransform: 'none' }}>HTML Semantics</span>
                <span className="badge badge-success" style={{ textTransform: 'none' }}>Computer Networks</span>
              </div>
            </div>
            <div>
              <strong style={{ color: 'var(--color-danger)', display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Weak Placement Skillsets</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {avgCommScore < 80 ? (
                  <span className="badge badge-danger" style={{ textTransform: 'none' }}>Interactive Explanation Flow</span>
                ) : null}
                <span className="badge badge-danger" style={{ textTransform: 'none' }}>Quantitative Speed Mechanics</span>
                <span className="badge badge-danger" style={{ textTransform: 'none' }}>Multithreading Concurrency</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Placements suggestions summary */}
        <div className="glass-card">
          <h4 style={{ fontWeight: 700, marginBottom: 16 }}>AI Suggestion Report</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem', lineHeight: 1.6 }}>
            <p>• <strong>Technical Recommendation:</strong> Double check Abstract class constructs in Java OOP before starting the mock interface round.</p>
            <p>• <strong>Aptitude Guidelines:</strong> Solve 10 mock Quantitative questions matching simple train relative velocity formulas to improve performance scores.</p>
            <p>• <strong>Communication Tip:</strong> Speak slowly. Take a 2-second pause before detailing dynamic programming examples to formulate structured responses.</p>
          </div>
        </div>

      </div>

      {/* History table */}
      <div className="glass-card">
        <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Interview Practice History</h4>
        <div className="data-table-wrapper" style={{ margin: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Technical Score</th>
                <th>Communication Score</th>
                <th>Average Score</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {interviews.map(item => (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.category}</td>
                  <td>{item.technicalScore}%</td>
                  <td>{item.communicationScore}%</td>
                  <td>{item.score}%</td>
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                </tr>
              ))}
              {interviews.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    No interview reports saved yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Settings Panel
// ----------------------------------------------------
function SettingsView() {
  const { currentUser, toggleTheme, theme } = useApp();
  const [success, setSuccess] = useState(false);

  const handleResetDB = () => {
    if (confirm('Are you sure you want to reset all mock interview scores and aptitude quiz logs? This cannot be undone.')) {
      // Clear specific user results and reset
      localStorage.removeItem('ai_interview_interviews');
      localStorage.removeItem('ai_interview_aptitude_results');
      localStorage.removeItem('ai_interview_resumes');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        window.location.reload();
      }, 1500);
    }
  };

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: '550px', margin: '0 auto' }}>
      <h3 className="text-shimmer" style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>System Settings</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 24 }}>
        Manage your profile settings, theme choices, and local preparation database.
      </p>

      {success && (
        <div className="badge badge-success" style={{ width: '100%', padding: '12px', justifyContent: 'center', marginBottom: 20 }}>
          Database Reset Successfully! Reloading...
        </div>
      )}

      {/* Account Info */}
      <div style={{ marginBottom: 24, padding: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--panel-border)', borderRadius: 'var(--radius-sm)' }}>
        <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Details</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.88rem' }}>
          <div><strong>Email Address:</strong> <span style={{ color: 'var(--text-secondary)' }}>{currentUser?.email}</span></div>
          <div><strong>User Role:</strong> <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{currentUser?.role}</span></div>
          <div><strong>Registered On:</strong> <span style={{ color: 'var(--text-secondary)' }}>{currentUser ? new Date(currentUser.createdAt).toLocaleDateString() : ''}</span></div>
        </div>
      </div>

      {/* Theme Preference Selection */}
      <div style={{ marginBottom: 28 }}>
        <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme Preferences</h5>
        <div style={{ display: 'flex', gap: 16 }}>
          <button 
            type="button" 
            className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => theme !== 'dark' && toggleTheme()}
          >
            Sleek Dark Mode
          </button>
          <button 
            type="button" 
            className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} 
            style={{ flex: 1 }}
            onClick={() => theme !== 'light' && toggleTheme()}
          >
            Classic Light Mode
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{ borderTop: '1px solid var(--panel-border)', paddingTop: 20 }}>
        <h5 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danger Zone</h5>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>Wiping your local assessment metrics deletes all past interview scorecards and aptitude results.</p>
        <button type="button" className="btn btn-danger" style={{ width: '100%' }} onClick={handleResetDB}>
          Wipe Local Assessment History
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// ADMIN DASHBOARD & PANELS
// ----------------------------------------------------
function AdminDashboard() {
  const { navigateTo } = useApp();
  const [stats, setStats] = useState({
    users: 0,
    interviews: 0,
    resumes: 0,
    feedbacks: 0
  });

  useEffect(() => {
    setStats({
      users: db.getUsers().filter(u => u.role === 'student').length,
      interviews: db.getAllInterviewResults().length,
      resumes: db.getAllResumes().length,
      feedbacks: db.getFeedbacks().length
    });
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="glass-card gradient-border-card" style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 6 }}>Admin Control Panel ⚙️</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
          Control platform parameters, oversee student registration profiles, edit mock quiz patterns, and review incoming contact feedbacks.
        </p>
      </div>

      <div className="stats-grid">
        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('admin-users')}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Active Students</span>
          <div className="stat-card-value">{stats.users}</div>
          <span className="badge badge-info">Manage</span>
        </div>
        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('admin-results')}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Interviews Done</span>
          <div className="stat-card-value">{stats.interviews}</div>
          <span className="badge badge-success">View results</span>
        </div>
        <div className="glass-card">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Resumes Audited</span>
          <div className="stat-card-value">{stats.resumes}</div>
          <span className="badge badge-info">ATS Compliance</span>
        </div>
        <div className="glass-card" style={{ cursor: 'pointer' }} onClick={() => navigateTo('admin-feedback')}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Feedback Messages</span>
          <div className="stat-card-value">{stats.feedbacks}</div>
          <span className="badge badge-warning">Review Logs</span>
        </div>
      </div>

      {/* Overview charts representation for admin */}
      <div className="glass-card">
        <h4 style={{ fontWeight: 700, marginBottom: 16 }}>Platform Usage Overview</h4>
        <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', paddingTop: 20 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: '100px', width: '30px', background: 'var(--color-primary)', borderRadius: '4px' }}></div>
            <span style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-secondary)' }}>Student Logs</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: '140px', width: '30px', background: 'var(--color-secondary)', borderRadius: '4px' }}></div>
            <span style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-secondary)' }}>Interview Cycles</span>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ height: '70px', width: '30px', background: 'var(--color-accent)', borderRadius: '4px' }}></div>
            <span style={{ fontSize: '0.75rem', marginTop: 8, color: 'var(--text-secondary)' }}>Resume Checks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsersView() {
  const [users, setUsers] = useState<DBUser[]>([]);

  useEffect(() => {
    setUsers(db.getUsers().filter(u => u.role !== 'admin'));
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this student account? All profiles and score results will be wiped.')) {
      db.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    }
  };

  return (
    <div className="glass-card animate-fade-in">
      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Manage Students</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
        Table list of registered placement students. Admin has authority to view timestamps and delete stale test users.
      </p>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Student Name</th>
              <th>Email</th>
              <th>Registered Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td>{u.email}</td>
                <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                <td>
                  <button className="btn btn-secondary" style={{ color: 'var(--color-danger)', padding: '6px 12px' }} onClick={() => handleDelete(u.id)}>
                    Wipe Account
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No students registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminQuestionsView() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states
  const [category, setCategory] = useState<'Quantitative' | 'Logical Reasoning' | 'English' | 'Computer Fundamentals'>('Quantitative');
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correctAnsIdx, setCorrectAnsIdx] = useState(0);
  const [explanation, setExplanation] = useState('');

  useEffect(() => {
    setQuestions(db.getAptitudeQuestions());
  }, []);

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText || !optA || !optB || !optC || !optD) return;

    const newQ = {
      id: 'q_' + Math.random().toString(36).substr(2, 9),
      category: category,
      question: questionText,
      options: [optA, optB, optC, optD],
      correctAnswerIndex: correctAnsIdx,
      explanation: explanation || 'Mathematical steps evaluated.'
    };

    db.saveAptitudeQuestion(newQ);
    setQuestions([...questions, newQ]);
    setShowAddModal(false);

    // Reset Form
    setQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setExplanation('');
  };

  const handleDelete = (id: string) => {
    db.deleteAptitudeQuestion(id);
    setQuestions(questions.filter(q => q.id !== id));
  };

  return (
    <div className="glass-card animate-fade-in">
      <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>Aptitude Question Bank</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Add or delete timed multiple-choice questions.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          + Add New MCQ
        </button>
      </div>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Question Text</th>
              <th>Options Count</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(q => (
              <tr key={q.id}>
                <td><span className="badge badge-info">{q.category}</span></td>
                <td style={{ maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</td>
                <td>{q.options?.length || 4}</td>
                <td>
                  <button className="btn btn-secondary" style={{ color: 'var(--color-danger)', padding: '6px 12px' }} onClick={() => handleDelete(q.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add MCQ Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, overflowY: 'auto' }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '90%', margin: '40px auto' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 16 }}>Add Aptitude MCQ</h3>
            <form onSubmit={handleAddQuestion}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-input" value={category} onChange={e => setCategory(e.target.value as any)}>
                  <option value="Quantitative">Quantitative</option>
                  <option value="Logical Reasoning">Logical Reasoning</option>
                  <option value="English">English</option>
                  <option value="Computer Fundamentals">Computer Fundamentals</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Question Text</label>
                <input type="text" className="form-input" placeholder="What is the speed of..." value={questionText} onChange={e => setQuestionText(e.target.value)} required />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Option A</label>
                  <input type="text" className="form-input" value={optA} onChange={e => setOptA(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Option B</label>
                  <input type="text" className="form-input" value={optB} onChange={e => setOptB(e.target.value)} required />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="form-group">
                  <label className="form-label">Option C</label>
                  <input type="text" className="form-input" value={optC} onChange={e => setOptC(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Option D</label>
                  <input type="text" className="form-input" value={optD} onChange={e => setOptD(e.target.value)} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Correct Option Index (0-3)</label>
                <select className="form-input" value={correctAnsIdx} onChange={e => setCorrectAnsIdx(parseInt(e.target.value))}>
                  <option value={0}>A (Index 0)</option>
                  <option value={1}>B (Index 1)</option>
                  <option value={2}>C (Index 2)</option>
                  <option value={3}>D (Index 3)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Mathematical Explanation</label>
                <textarea className="form-input" rows={2} value={explanation} onChange={e => setExplanation(e.target.value)} required></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add to DB</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminResultsView() {
  const [interviews, setInterviews] = useState<DBInterviewResult[]>([]);
  const [users, setUsers] = useState<DBUser[]>([]);

  useEffect(() => {
    setInterviews(db.getAllInterviewResults());
    setUsers(db.getUsers());
  }, []);

  const getStudentName = (userId: string) => {
    return users.find(u => u.id === userId)?.name || 'Unknown Student';
  };

  return (
    <div className="glass-card animate-fade-in">
      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Student Performance Scores</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
        Logs of mock interview answers completed by active placement students.
      </p>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Category</th>
              <th>Technical Score</th>
              <th>Comm Score</th>
              <th>Avg Score</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {interviews.map(item => (
              <tr key={item.id}>
                <td style={{ fontWeight: 600 }}>{getStudentName(item.userId)}</td>
                <td><span className="badge badge-info">{item.category}</span></td>
                <td>{item.technicalScore}%</td>
                <td>{item.communicationScore}%</td>
                <td>{item.score}%</td>
                <td>{new Date(item.date).toLocaleDateString()}</td>
              </tr>
            ))}
            {interviews.length === 0 && (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No scores recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdminFeedbackView() {
  const [feedbacks, setFeedbacks] = useState<DBFeedback[]>([]);

  useEffect(() => {
    setFeedbacks(db.getFeedbacks());
  }, []);

  return (
    <div className="glass-card animate-fade-in">
      <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 6 }}>Review Student Feedback</h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 20 }}>
        Messages submitted from landing pages or dashboard suggestions.
      </p>

      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Message Content</th>
              <th>Date Received</th>
            </tr>
          </thead>
          <tbody>
            {feedbacks.map(fb => (
              <tr key={fb.id}>
                <td style={{ fontWeight: 600 }}>{fb.name}</td>
                <td>{fb.email}</td>
                <td style={{ maxWidth: '400px', wordBreak: 'break-word' }}>{fb.message}</td>
                <td>{new Date(fb.date).toLocaleDateString()}</td>
              </tr>
            ))}
            {feedbacks.length === 0 && (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  No feedback messages in database log.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

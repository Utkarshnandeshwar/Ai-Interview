import { type AptitudeQuestion, defaultAptitudeQuestions } from '../data/mockData';

// Simulated DB Schemas
export interface DBUser {
  id: string;
  email: string;
  name: string;
  role: 'student' | 'admin';
  createdAt: string;
}

export interface DBProfile {
  userId: string;
  photo: string;
  phone: string;
  college: string;
  branch: string;
  skills: string[];
  targetCompany: string;
  targetRole: string;
  updatedAt: string;
}

export interface DBResume {
  id: string;
  userId: string;
  fileName: string;
  fileSize: string;
  uploadDate: string;
  parsedText: string;
  summary: string;
  atsScore: number;
  skillsDetected: string[];
  missingSkills: string[];
  grammarMistakes: string[];
  improvementSuggestions: string[];
}

export interface DBInterviewResult {
  id: string;
  userId: string;
  category: string;
  date: string;
  score: number; // average
  technicalScore: number;
  communicationScore: number;
  grammarScore: number;
  answers: {
    question: string;
    answer: string;
    analysis: {
      correctness: string;
      communication: string;
      grammar: string;
      technicalKnowledge: string;
      suggestions: string;
      score: number; // 0-100
    };
  }[];
  suggestions: string;
}

export interface DBAptitudeResult {
  id: string;
  userId: string;
  category: string;
  score: number; // percentage
  correctAnswers: number;
  totalQuestions: number;
  date: string;
}

export interface DBFeedback {
  id: string;
  name: string;
  email: string;
  rating: number;
  message: string;
  date: string;
}

// LocalStorage Keys
const KEYS = {
  USERS: 'ai_interview_users',
  PROFILES: 'ai_interview_profiles',
  RESUMES: 'ai_interview_resumes',
  INTERVIEWS: 'ai_interview_interviews',
  APTITUDE_RESULTS: 'ai_interview_aptitude_results',
  APTITUDE_QUESTIONS: 'ai_interview_aptitude_questions',
  FEEDBACKS: 'ai_interview_feedbacks',
  API_KEY: 'ai_interview_gemini_key'
};

// Initialize DB with dummy data if empty
export function initDB() {
  // 1. Users
  if (!localStorage.getItem(KEYS.USERS)) {
    const defaultUsers = [
      { id: 'usr_admin', email: 'admin@interview.com', name: 'System Admin', role: 'admin', createdAt: new Date().toISOString() },
      { id: 'usr_student', email: 'student@interview.com', name: 'Rahul Sharma', role: 'student', createdAt: new Date().toISOString() }
    ];
    localStorage.setItem(KEYS.USERS, JSON.stringify(defaultUsers));
    
    // Add simple login mapping for mock verification
    localStorage.setItem('ai_interview_pwd_usr_admin', 'admin123');
    localStorage.setItem('ai_interview_pwd_usr_student', 'student123');
  }

  // 2. Profiles
  if (!localStorage.getItem(KEYS.PROFILES)) {
    const defaultProfiles = [
      {
        userId: 'usr_student',
        photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150',
        phone: '9876543210',
        college: 'Government Engineering College',
        branch: 'Computer Science & Engineering',
        skills: ['Java', 'HTML', 'CSS', 'JavaScript', 'SQL'],
        targetCompany: 'TCS',
        targetRole: 'Software Engineer',
        updatedAt: new Date().toISOString()
      }
    ];
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(defaultProfiles));
  }

  // 3. Resumes
  if (!localStorage.getItem(KEYS.RESUMES)) {
    const defaultResumes: DBResume[] = [
      {
        id: 'res_1',
        userId: 'usr_student',
        fileName: 'Rahul_Sharma_Resume.pdf',
        fileSize: '184 KB',
        uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
        parsedText: 'Rahul Sharma - Software Engineer. Skills: Java, JavaScript, HTML, CSS, SQL. Education: GEC B.Tech CSE. Experience: Built Web Applications.',
        summary: 'Undergraduate student with experience in frontend technologies and foundational Java programming. Demonstrates academic project work in website deployment.',
        atsScore: 72,
        skillsDetected: ['Java', 'HTML', 'CSS', 'JavaScript', 'SQL'],
        missingSkills: ['React', 'Git', 'Data Structures', 'REST APIs'],
        grammarMistakes: ['"Experience in built..." -> "Experience in building..."'],
        improvementSuggestions: ['Add links to GitHub profiles.', 'Highlight problem-solving metrics.', 'Quantify project accomplishments.']
      }
    ];
    localStorage.setItem(KEYS.RESUMES, JSON.stringify(defaultResumes));
  }

  // 4. Aptitude Questions
  if (!localStorage.getItem(KEYS.APTITUDE_QUESTIONS)) {
    localStorage.setItem(KEYS.APTITUDE_QUESTIONS, JSON.stringify(defaultAptitudeQuestions));
  }

  // 5. Aptitude Results
  if (!localStorage.getItem(KEYS.APTITUDE_RESULTS)) {
    const defaultAptitudeResults: DBAptitudeResult[] = [
      {
        id: 'ar_1',
        userId: 'usr_student',
        category: 'Quantitative',
        score: 66,
        correctAnswers: 2,
        totalQuestions: 3,
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'ar_2',
        userId: 'usr_student',
        category: 'Computer Fundamentals',
        score: 100,
        correctAnswers: 3,
        totalQuestions: 3,
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem(KEYS.APTITUDE_RESULTS, JSON.stringify(defaultAptitudeResults));
  }

  // 6. Interview Results
  if (!localStorage.getItem(KEYS.INTERVIEWS)) {
    const defaultInterviews: DBInterviewResult[] = [
      {
        id: 'int_1',
        userId: 'usr_student',
        category: 'Java',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        score: 75,
        technicalScore: 80,
        communicationScore: 70,
        grammarScore: 75,
        answers: [
          {
            question: 'What is OOP?',
            answer: 'OOP is object oriented programming which uses classes and objects. It has inheritance, polymorphism, encapsulation, and abstraction.',
            analysis: {
              correctness: 'High - Correctly identified the definition and core pillars.',
              communication: 'Good, but could be structured better.',
              grammar: 'Perfect.',
              technicalKnowledge: 'Accurate and covered all pillars.',
              suggestions: 'Give real world examples like "Car" or "Employee" to make the explanation more practical.',
              score: 85
            }
          },
          {
            question: 'Difference between abstract class and interface?',
            answer: 'Abstract class can have instance variables and constructors. Interface cannot have variables, only final static variables. Interface supports multiple inheritance.',
            analysis: {
              correctness: 'Medium - Correct points, but misses Java 8 default/static methods.',
              communication: 'Adequate.',
              grammar: 'A bit fragmented.',
              technicalKnowledge: 'Missed default methods and differences in syntax.',
              suggestions: 'Mention default and static methods in Interfaces, and the `extends` vs `implements` keyword.',
              score: 65
            }
          }
        ],
        suggestions: 'Strong technical base in Java OOP. Focus on improving explanation details and speaking with more structural flows.'
      },
      {
        id: 'int_2',
        userId: 'usr_student',
        category: 'HR Interview',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        score: 82,
        technicalScore: 75,
        communicationScore: 88,
        grammarScore: 84,
        answers: [
          {
            question: 'Tell me about yourself.',
            answer: 'My name is Rahul Sharma. I am doing BTech in GEC college. I am passionate about technology and software development. I know Java and Javascript and I like to build websites.',
            analysis: {
              correctness: 'High - Good introduction.',
              communication: 'Very expressive, enthusiastic and clear.',
              grammar: 'Good.',
              technicalKnowledge: 'Mentions relevant tools.',
              suggestions: 'Structure it using the Present-Past-Future model: What you do now, past projects/achievements, and your future career path.',
              score: 82
            }
          }
        ],
        suggestions: 'Your communication is excellent! Work on structural models for HR answers to sound even more professional.'
      }
    ];
    localStorage.setItem(KEYS.INTERVIEWS, JSON.stringify(defaultInterviews));
  }

  // 7. Feedbacks
  if (!localStorage.getItem(KEYS.FEEDBACKS)) {
    const defaultFeedbacks: DBFeedback[] = [
      {
        id: 'fb_1',
        name: 'Rahul Sharma',
        email: 'student@interview.com',
        rating: 5,
        message: 'The AI mock interview gives feedback immediately, which is very helpful for my TCS preparation. Love the Speech-to-Text feature!',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(defaultFeedbacks));
  }
}

// DB helper methods
export const db = {
  // Users
  getUsers(): DBUser[] {
    return JSON.parse(localStorage.getItem(KEYS.USERS) || '[]');
  },
  saveUser(user: DBUser) {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
  },
  deleteUser(id: string) {
    const users = this.getUsers().filter(u => u.id !== id);
    localStorage.setItem(KEYS.USERS, JSON.stringify(users));
    
    // Also delete password mapping and profile
    localStorage.removeItem(`ai_interview_pwd_${id}`);
    const profiles = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]').filter((p: any) => p.userId !== id);
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
  },

  // Profiles
  getProfile(userId: string): DBProfile | null {
    const profiles: DBProfile[] = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]');
    return profiles.find(p => p.userId === userId) || null;
  },
  saveProfile(profile: DBProfile) {
    const profiles: DBProfile[] = JSON.parse(localStorage.getItem(KEYS.PROFILES) || '[]');
    const idx = profiles.findIndex(p => p.userId === profile.userId);
    if (idx !== -1) profiles[idx] = profile;
    else profiles.push(profile);
    localStorage.setItem(KEYS.PROFILES, JSON.stringify(profiles));
  },

  // Resumes
  getResumes(userId: string): DBResume[] {
    const resumes: DBResume[] = JSON.parse(localStorage.getItem(KEYS.RESUMES) || '[]');
    return resumes.filter(r => r.userId === userId);
  },
  getAllResumes(): DBResume[] {
    return JSON.parse(localStorage.getItem(KEYS.RESUMES) || '[]');
  },
  saveResume(resume: DBResume) {
    const resumes: DBResume[] = JSON.parse(localStorage.getItem(KEYS.RESUMES) || '[]');
    resumes.push(resume);
    localStorage.setItem(KEYS.RESUMES, JSON.stringify(resumes));
  },
  deleteResume(id: string) {
    const resumes: DBResume[] = JSON.parse(localStorage.getItem(KEYS.RESUMES) || '[]');
    const filtered = resumes.filter(r => r.id !== id);
    localStorage.setItem(KEYS.RESUMES, JSON.stringify(filtered));
  },

  // Aptitude Questions
  getAptitudeQuestions(): AptitudeQuestion[] {
    return JSON.parse(localStorage.getItem(KEYS.APTITUDE_QUESTIONS) || '[]');
  },
  saveAptitudeQuestion(q: AptitudeQuestion) {
    const questions = this.getAptitudeQuestions();
    const idx = questions.findIndex(item => item.id === q.id);
    if (idx !== -1) questions[idx] = q;
    else questions.push(q);
    localStorage.setItem(KEYS.APTITUDE_QUESTIONS, JSON.stringify(questions));
  },
  deleteAptitudeQuestion(id: string) {
    const questions = this.getAptitudeQuestions().filter(item => item.id !== id);
    localStorage.setItem(KEYS.APTITUDE_QUESTIONS, JSON.stringify(questions));
  },

  // Aptitude Results
  getAptitudeResults(userId: string): DBAptitudeResult[] {
    const results: DBAptitudeResult[] = JSON.parse(localStorage.getItem(KEYS.APTITUDE_RESULTS) || '[]');
    return results.filter(r => r.userId === userId);
  },
  getAllAptitudeResults(): DBAptitudeResult[] {
    return JSON.parse(localStorage.getItem(KEYS.APTITUDE_RESULTS) || '[]');
  },
  saveAptitudeResult(res: DBAptitudeResult) {
    const results: DBAptitudeResult[] = JSON.parse(localStorage.getItem(KEYS.APTITUDE_RESULTS) || '[]');
    results.push(res);
    localStorage.setItem(KEYS.APTITUDE_RESULTS, JSON.stringify(results));
  },

  // Interview Results
  getInterviewResults(userId: string): DBInterviewResult[] {
    const results: DBInterviewResult[] = JSON.parse(localStorage.getItem(KEYS.INTERVIEWS) || '[]');
    return results.filter(r => r.userId === userId);
  },
  getAllInterviewResults(): DBInterviewResult[] {
    return JSON.parse(localStorage.getItem(KEYS.INTERVIEWS) || '[]');
  },
  saveInterviewResult(res: DBInterviewResult) {
    const results: DBInterviewResult[] = JSON.parse(localStorage.getItem(KEYS.INTERVIEWS) || '[]');
    results.push(res);
    localStorage.setItem(KEYS.INTERVIEWS, JSON.stringify(results));
  },

  // Feedbacks
  getFeedbacks(): DBFeedback[] {
    return JSON.parse(localStorage.getItem(KEYS.FEEDBACKS) || '[]');
  },
  saveFeedback(fb: DBFeedback) {
    const feedbacks = this.getFeedbacks();
    feedbacks.push(fb);
    localStorage.setItem(KEYS.FEEDBACKS, JSON.stringify(feedbacks));
  },

  // API Key Settings
  getGeminiApiKey(): string {
    return localStorage.getItem(KEYS.API_KEY) || 'AQ.Ab8RN6IEpzOMeRaJwxTtigt3XqlrAvXV6pIjVG80S88AoEsUdA';
  },
  saveGeminiApiKey(key: string) {
    localStorage.setItem(KEYS.API_KEY, key);
  }
};

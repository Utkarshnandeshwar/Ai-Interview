import { db } from './db';
import { defaultInterviewQuestions } from '../data/mockData';

// HTTP client for Gemini API
async function callGemini(prompt: string, jsonMode = false, systemInstruction = ''): Promise<string> {
  const apiKey = db.getGeminiApiKey();
  if (!apiKey) {
    throw new Error('API_KEY_MISSING');
  }

  const model = 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const payload: any = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ]
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (jsonMode) {
    payload.generationConfig = {
      responseMimeType: 'application/json'
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }
  return text;
}

// ----------------------------------------------------
// 1. Resume Analysis Service
// ----------------------------------------------------
export interface ResumeAnalysisResult {
  summary: string;
  atsScore: number;
  skillsDetected: string[];
  missingSkills: string[];
  grammarMistakes: string[];
  improvementSuggestions: string[];
}

export async function analyzeResume(resumeText: string): Promise<ResumeAnalysisResult> {
  try {
    const systemPrompt = `You are an expert ATS (Applicant Tracking System) parser and experienced technical hiring manager.
Analyze the provided resume text. Output a JSON object matching this schema EXACTLY:
{
  "summary": "2-3 sentences summarizing the candidate's professional profile",
  "atsScore": 45-100 (integer representing ATS compliance score),
  "skillsDetected": ["list", "of", "detected", "technical", "skills"],
  "missingSkills": ["list", "of", "essential", "industry-standard", "skills", "for", "the", "targeted", "roles", "that", "are", "missing"],
  "grammarMistakes": ["list", "of", "found", "typos", "or", "grammatical", "issues", "or", "awkward", "phrasings"],
  "improvementSuggestions": ["3-5 actionable recommendations to make the resume stand out and improve ATS parsing"]
}`;

    const prompt = `Resume Content to Analyze:\n${resumeText}`;
    const resultJson = await callGemini(prompt, true, systemPrompt);
    return JSON.parse(resultJson);
  } catch (error: any) {
    console.error('Gemini Resume Analysis failed:', error);
    if (error.message === 'API_KEY_MISSING') {
      return simulateMockResumeAnalysis(resumeText);
    }
    // Fallback if JSON parse or other network issue occurs
    return simulateMockResumeAnalysis(resumeText);
  }
}

function simulateMockResumeAnalysis(text: string): ResumeAnalysisResult {
  // Simple heuristic analysis for local testing
  const lowercaseText = text.toLowerCase();
  const allSkills = ['java', 'python', 'c++', 'javascript', 'html', 'css', 'react', 'node', 'sql', 'git', 'mongodb', 'docker', 'aws', 'kubernetes', 'typescript', 'php', 'c#'];
  const detected = allSkills.filter(skill => lowercaseText.includes(skill));
  const missing = allSkills.filter(skill => !detected.includes(skill)).slice(0, 4);

  // Capitalize detected skills
  const skillsDetected = detected.map(s => s === 'html' || s === 'css' || s === 'sql' || s === 'aws' ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));
  const missingSkills = missing.map(s => s === 'html' || s === 'css' || s === 'sql' || s === 'aws' ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1));

  const score = Math.min(95, 50 + skillsDetected.length * 7 + (text.length > 200 ? 10 : 0));

  return {
    summary: `Resume details a student with skills in ${skillsDetected.slice(0, 3).join(', ') || 'basic technology'}. Focuses on projects and educational background.`,
    atsScore: score,
    skillsDetected: skillsDetected.length > 0 ? skillsDetected : ['General IT Skills'],
    missingSkills: missingSkills,
    grammarMistakes: [
      'Formatting matches default styling; verify header alignment.',
      'Check tense consistency across past projects (e.g. use "Developed" instead of "Develop").'
    ],
    improvementSuggestions: [
      'Quantify your accomplishments (e.g., "Improved load time by 30%" instead of just "Optimized website").',
      'Add a dedicated Projects section highlighting Github source links.',
      'Include industry-standard keywords like "RESTful APIs", "Agile", or "Data Structures".'
    ]
  };
}

// ----------------------------------------------------
// 2. Interactive Mock Interview Service
// ----------------------------------------------------
export interface AnswerEvaluationResult {
  correctness: string;
  communication: string;
  grammar: string;
  technicalKnowledge: string;
  suggestions: string;
  score: number; // 0-100
}

export async function getNextInterviewQuestion(
  category: string,
  history: { question: string; answer: string }[],
  profile: any
): Promise<string> {
  try {
    const profileDetails = profile
      ? `Student Profile - college: ${profile.college}, branch: ${profile.branch}, target role: ${profile.targetRole}, skills: ${profile.skills.join(', ')}`
      : 'Student Profile: Not complete.';

    const systemPrompt = `You are an expert tech recruiter and technical examiner conducting a mock interview for the category: "${category}".
Using the student's profile information, you will ask them professional, standard interview questions.
Ask only ONE single question at a time. Do not include introductory notes, just ask the question.
If the history is empty, ask a fundamental question. If they have answered previous questions, adapt your next question based on the conversation flow.`;

    let historyText = '';
    history.forEach((h, i) => {
      historyText += `\nQ${i + 1}: ${h.question}\nUser A${i + 1}: ${h.answer}\n`;
    });

    const prompt = `Student Information: ${profileDetails}\nInterview History:${historyText || ' No questions asked yet. Start the interview.'}\n\nAsk the next single interview question for category "${category}":`;
    return await callGemini(prompt, false, systemPrompt);
  } catch (error: any) {
    console.error('Gemini Question Generation failed:', error);
    // Offline fallback: cycle through predefined questions
    const categoryQuestions = defaultInterviewQuestions[category] || defaultInterviewQuestions['HR Interview'];
    const count = history.length;
    return categoryQuestions[count % categoryQuestions.length];
  }
}

export async function evaluateInterviewAnswer(
  category: string,
  question: string,
  answer: string
): Promise<AnswerEvaluationResult> {
  try {
    const systemPrompt = `You are a technical examiner and communication coach reviewing a mock interview answer.
Evaluate the candidate's answer to the question under the category "${category}".
Analyze correctness, communication style, grammar, and technical knowledge.
Provide score from 0 to 100 based on accuracy and maturity.
Output a JSON object matching this schema EXACTLY:
{
  "correctness": "Brief assessment of correctness",
  "communication": "Feedback on communication style (clarity, confidence)",
  "grammar": "Assessment of grammar and spelling issues, if any",
  "technicalKnowledge": "Feedback on technical depth",
  "suggestions": "Actionable advice to improve this answer",
  "score": 0-100 (integer)
}`;

    const prompt = `Category: ${category}\nQuestion: ${question}\nCandidate Answer: ${answer}`;
    const resultJson = await callGemini(prompt, true, systemPrompt);
    return JSON.parse(resultJson);
  } catch (error: any) {
    console.error('Gemini Answer Evaluation failed:', error);
    return simulateMockAnswerEvaluation(category, question, answer);
  }
}

function simulateMockAnswerEvaluation(category: string, _question: string, answer: string): AnswerEvaluationResult {
  const words = answer.trim().split(/\s+/).length;
  let score = 50;

  if (words > 5) score += 10;
  if (words > 15) score += 15;
  if (words > 30) score += 10;

  // Keyword check for better scoring
  const keywords: Record<string, string[]> = {
    'java': ['class', 'object', 'oop', 'jvm', 'inheritance', 'polymorphism', 'encapsulation', 'interface', 'abstract'],
    'c programming': ['pointer', 'memory', 'malloc', 'structure', 'union', 'address'],
    'python': ['list', 'tuple', 'decorator', 'gil', 'memory', 'indentation'],
    'html': ['tag', 'semantic', 'seo', 'storage', 'element', 'canvas'],
    'css': ['flexbox', 'grid', 'box model', 'specificity', 'responsive', 'animation'],
    'javascript': ['closure', 'promise', 'async', 'await', 'event', 'prototype', 'scope'],
    'web development': ['rest', 'api', 'http', 'websocket', 'server', 'mvc', 'client']
  };

  const keyList = keywords[category.toLowerCase()] || [];
  let foundKeywords = 0;
  keyList.forEach(kw => {
    if (answer.toLowerCase().includes(kw)) {
      score += 5;
      foundKeywords++;
    }
  });

  score = Math.min(98, score);

  return {
    correctness: foundKeywords > 0 
      ? `Satisfactory correctness. Identified key concepts related to ${category}.`
      : 'Answer is generic and lacks technical details. Try to cover core architectural components.',
    communication: words > 15
      ? 'Good structural response. Explained the point clearly.'
      : 'Answer is too short. Try to elaborate on your answer with details or examples.',
    grammar: 'Grammar looks appropriate. Minor phrasings could be polished.',
    technicalKnowledge: foundKeywords > 1
      ? `Strong. Used correct terminology like ${keyList.filter(k => answer.toLowerCase().includes(k)).slice(0, 2).join(', ')}.`
      : 'Needs depth. Focus on how memory or compile-time structures operate here.',
    suggestions: words < 15 
      ? 'Elaborate further. Follow the structure: 1) Core definition, 2) Key properties, 3) Real-world usage or coding example.'
      : 'Excellent start. Incorporating a code snippet in your explanation would make this answer stand out.',
    score: score
  };
}

// ----------------------------------------------------
// 3. Career Assistant Service
// ----------------------------------------------------
export interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export async function askCareerAssistant(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  try {
    const systemPrompt = `You are a helpful, encouraging, and highly professional AI Career Assistant for IT and engineering students.
Provide expert guidance on:
- Career planning (frontend, backend, full stack, DevOps, QA, product manager)
- Interview tips & strategies (TCS, Infosys, Wipro, Accenture, tech startups)
- Java, Python, C, Web Development tech questions
- Resume review suggestions
Answer clearly, concisely, and use bullet points where helpful. If they ask in Hinglish or Hindi, you can respond in a friendly blend of English and Hindi for ease of reading.`;

    // Map history to standard contents structure if possible
    let chatHistoryPrompt = 'Conversations so far:\n';
    history.slice(-6).forEach(msg => {
      chatHistoryPrompt += `${msg.sender === 'user' ? 'Student' : 'Assistant'}: ${msg.text}\n`;
    });

    const prompt = `${chatHistoryPrompt}\nStudent current message: ${message}\n\nAssistant response:`;
    return await callGemini(prompt, false, systemPrompt);
  } catch (error: any) {
    console.error('Gemini Career Assistant failed:', error);
    return simulateMockCareerAssistant(message);
  }
}

function simulateMockCareerAssistant(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('java')) {
    return `### Recommended Java Interview Topics ☕
For placement interviews (TCS, Infosys, startups), focus on these core areas:
1. **Object-Oriented Programming (OOPs)**: Polymorphism (overloading vs overriding), Abstraction vs Interface, and Encapsulation.
2. **Collections Framework**: Difference between List/Set/Map, and specifically \`HashMap\` working principles.
3. **Exception Handling**: Checked vs Unchecked exceptions, and use of try-catch-finally block.
4. **Multithreading**: Lifecycle of a thread, Runnable interface vs Thread class, synchronization.

Would you like to practice a Java mock interview question? Select the **Mock Interview** tab!`;
  }
  
  if (msg.includes('python')) {
    return `### Recommended Python Interview Topics 🐍
For python developer interviews, prepare these key concepts:
1. **List Comprehensions & Generators**: Memory differences and syntax.
2. **Global Interpreter Lock (GIL)**: How it impacts multi-threaded executions.
3. **Decorators**: Dynamic decorators wrapping functions.
4. **Memory Management**: Reference counting and automatic garbage collection.`;
  }

  if (msg.includes('css')) {
    return `### What is CSS? 🎨
CSS (Cascading Style Sheets) is a stylesheet language used to style and layout web pages. Key interview topics:
1. **CSS Box Model**: Margin, border, padding, and content sizing.
2. **Flexbox & Grid Layouts**: 1-dimensional and 2-dimensional layouts.
3. **Specificity**: Calculations (Inline, ID, Class, Type) determining rule application.
4. **Transitions & Animations**: Implementing micro-interactions.`;
  }

  if (msg.includes('html')) {
    return `### What is HTML? 🌐
HTML (HyperText Markup Language) is the standard markup language for documents designed to be displayed in a web browser. Key interview topics:
1. **Semantic HTML**: Tags like \`<header>\`, \`<article>\`, \`<section>\` improving SEO and Accessibility.
2. **Web Storage**: Differences between localStorage, sessionStorage, and cookies.
3. **DOCTYPE**: Declaring document type to triggers standard rendering mode.`;
  }

  if (msg.includes('javascript') || msg.includes(' js')) {
    return `### What is JavaScript? ⚡
JavaScript is a high-level, single-threaded, compiled language. Key interview topics:
1. **Closures**: Functions retaining reference to outer lexical scopes.
2. **Event Loop**: Call Stack, Task Queue, Microtask Queue processing async loops.
3. **Promises & Async/Await**: Handling async executions cleanly.`;
  }

  if (msg.includes('react')) {
    return `### Recommended React Interview Topics ⚛️
For React UI roles, master these core concepts:
1. **Virtual DOM & Reconciliation**: React Fiber updating only changed nodes.
2. **State & Props**: Controlled vs uncontrolled elements.
3. **React Hooks**: Rules of hooks, useEffect dependency arrays, useMemo, and useCallback.`;
  }

  if (msg.includes('sql') || msg.includes('database') || msg.includes('db')) {
    return `### Database & SQL Interview Topics 📊
Prepare these areas for technical rounds:
1. **SQL Joins**: Inner, Left, Right, Full Joins merging records.
2. **Normalization**: 1NF, 2NF, 3NF reducing data redundancy.
3. **Indexing**: Primary and secondary indexes speeding up queries.`;
  }

  if (msg.includes('resume') || msg.includes('cv')) {
    return `### Essential Resume Tips for Students 📄
1. **Aesthetics & Layout**: Keep it strictly 1-page. Use a clean, black-and-white layout with modern fonts (Inter, Arial).
2. **ATS Optimization**: Detect keywords in job descriptions and naturally add them to your skills list.
3. **Projects**: Highlight 2-3 dynamic web/software projects. Provide links to GitHub repositories.
4. **Quantify achievements**: Use the X-Y-Z formula: "Accomplished [X] as measured by [Y], by doing [Z]" (e.g. "Optimized API speeds by 15% using Redis caching").

Upload your resume in the **Resume Module** to get a full ATS report!`;
  }
  
  if (msg.includes('career') || msg.includes('guidance') || msg.includes('job') || msg.includes('placement')) {
    return `### Placement Preparation Plan 🚀
For securing a Software Engineer role, follow this 3-step preparation plan:
1. **Step 1: Aptitude & Logic**: Practice Quant & Logical Reasoning daily. Start with Time & Work, Speed, Coding-decoding.
2. **Step 2: DSA & Coding**: Master basic Data Structures (Arrays, Strings, Stacks, Queues) and SQL Queries.
3. **Step 3: Core subjects**: Revise Computer Networks, OS, and Database Management Systems (DBMS).

Utilize our **Aptitude Test** and **Mock Interview** modules to track your daily score and check your readiness index. Let me know if you want to explore a specific profile (e.g. Frontend developer, Backend engineer)!`;
  }

  return `🤖 **AUPAD Inteligens Offline Assistant**

Currently, the server is running in offline mode due to **Gemini API rate limits (Daily Free-tier Quota Exceeded)**. 

I received your question: "${message}"

You can:
1. **Configure custom API key**: Navigate to the Settings tab in your sidebar to set up your personal Google Gemini API Key.
2. **Ask about specific topics**: Try asking about **Java**, **Python**, **HTML**, **CSS**, **JavaScript**, **React**, **SQL**, or **Resume tips** to get instant mock responses!`;
}

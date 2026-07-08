export interface AptitudeQuestion {
  id: string;
  category: 'Quantitative' | 'Logical Reasoning' | 'English' | 'Computer Fundamentals';
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface InterviewQuestion {
  id: string;
  category: string;
  question: string;
}

export const defaultAptitudeQuestions: AptitudeQuestion[] = [
  // Quantitative
  {
    id: 'q1',
    category: 'Quantitative',
    question: 'A train 120 m long passes a telegraph post in 6 seconds. Find the speed of the train in km/h.',
    options: ['72 km/h', '60 km/h', '80 km/h', '90 km/h'],
    correctAnswerIndex: 0,
    explanation: 'Speed = Distance / Time = 120 / 6 = 20 m/s. To convert m/s to km/h, multiply by 18/5. So, 20 * (18/5) = 72 km/h.'
  },
  {
    id: 'q2',
    category: 'Quantitative',
    question: 'If a work can be completed by 10 men in 15 days, how many days will it take for 15 men to complete the same work?',
    options: ['8 days', '10 days', '12 days', '15 days'],
    correctAnswerIndex: 1,
    explanation: 'Using the formula M1 * D1 = M2 * D2. So, 10 * 15 = 15 * D2 => D2 = 10 days.'
  },
  {
    id: 'q3',
    category: 'Quantitative',
    question: 'A sum of money at simple interest amounts to $815 in 3 years and to $854 in 4 years. What is the principal sum?',
    options: ['$650', '$690', '$698', '$700'],
    correctAnswerIndex: 2,
    explanation: 'Interest for 1 year = $854 - $815 = $39. Interest for 3 years = $39 * 3 = $117. Principal = Amount after 3 years - Interest for 3 years = $815 - $117 = $698.'
  },

  // Logical Reasoning
  {
    id: 'lr1',
    category: 'Logical Reasoning',
    question: 'Look at this series: 2, 1, (1/2), (1/4), ... What number should come next?',
    options: ['1/3', '1/8', '2/8', '1/16'],
    correctAnswerIndex: 1,
    explanation: 'This is a geometric progression where each term is half of the previous term. So, 1/4 divided by 2 is 1/8.'
  },
  {
    id: 'lr2',
    category: 'Logical Reasoning',
    question: 'Pointing to a photograph, Vipul said, "She is the daughter of my grandfather\'s only son." How is Vipul related to the girl in the photograph?',
    options: ['Father', 'Brother', 'Uncle', 'Cousin'],
    correctAnswerIndex: 1,
    explanation: 'Grandfather\'s only son is Vipul\'s father. The girl is the daughter of Vipul\'s father, making her Vipul\'s sister, and Vipul is her brother.'
  },
  {
    id: 'lr3',
    category: 'Logical Reasoning',
    question: 'If in a certain code language, "ROSE" is written as "TQUG", how is "BISCUIT" written in that code?',
    options: ['DKUEWKV', 'DKVEXLV', 'DKUEWKY', 'DKUEWJV'],
    correctAnswerIndex: 0,
    explanation: 'Each letter is shifted 2 positions forward: R(+2)->T, O(+2)->Q, S(+2)->U, E(+2)->G. Similarly, B(+2)->D, I(+2)->K, S(+2)->U, C(+2)->E, U(+2)->W, I(+2)->K, T(+2)->V. So, DKUEWKV.'
  },

  // English
  {
    id: 'eng1',
    category: 'English',
    question: 'Choose the word that is most nearly similar in meaning to "CANDID".',
    options: ['Dishonest', 'Frank', 'Secretive', 'Guarded'],
    correctAnswerIndex: 1,
    explanation: '"Candid" means truthful and straightforward; frank.'
  },
  {
    id: 'eng2',
    category: 'English',
    question: 'Fill in the blank: "If I _____ you, I would accept the job offer immediately."',
    options: ['am', 'was', 'were', 'had been'],
    correctAnswerIndex: 2,
    explanation: 'In subjunctive mood (conditional sentences representing hypothetical situations), we use "were" for all pronouns (e.g., If I were, If he were).'
  },
  {
    id: 'eng3',
    category: 'English',
    question: 'Select the antonym of the word "OBSTINATE".',
    options: ['Stubborn', 'Flexible', 'Inflexible', 'Adamant'],
    correctAnswerIndex: 1,
    explanation: '"Obstinate" means stubbornly refusing to change one\'s opinion. "Flexible" is the direct opposite.'
  },

  // Computer Fundamentals
  {
    id: 'cf1',
    category: 'Computer Fundamentals',
    question: 'Which of the following is NOT a pillar of Object-Oriented Programming (OOP)?',
    options: ['Compilation', 'Encapsulation', 'Inheritance', 'Polymorphism'],
    correctAnswerIndex: 0,
    explanation: 'The four fundamental concepts of OOP are Encapsulation, Abstraction, Inheritance, and Polymorphism. Compilation is a process of converting code to machine-readable format, not an OOP pillar.'
  },
  {
    id: 'cf2',
    category: 'Computer Fundamentals',
    question: 'Which database normalization form ensures there are no transitive functional dependencies?',
    options: ['First Normal Form (1NF)', 'Second Normal Form (2NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)'],
    correctAnswerIndex: 2,
    explanation: 'Third Normal Form (3NF) requires the table to be in 2NF and ensures that no non-prime attribute is transitively dependent on the primary key.'
  },
  {
    id: 'cf3',
    category: 'Computer Fundamentals',
    question: 'What is the primary role of the Transport Layer in the OSI reference model?',
    options: ['Routing packets across networks', 'Process-to-process delivery of messages', 'Physical data transmission over media', 'Syntax translation of data representations'],
    correctAnswerIndex: 1,
    explanation: 'The Transport Layer is responsible for process-to-process delivery (end-to-end reliability, flow control, and error recovery) of the complete message. The Network layer handles routing.'
  }
];

export const defaultInterviewQuestions: Record<string, string[]> = {
  'HR Interview': [
    'Tell me about yourself. What are your key achievements?',
    'What are your greatest strengths and weaknesses, and how do you work on them?',
    'Why should we hire you for this role? What makes you unique?',
    'Where do you see yourself in 5 years? What are your career aspirations?',
    'Describe a time when you had a conflict in a team. How did you resolve it?',
    'How do you handle working under tight deadlines? Can you give an example?',
    'Why do you want to work for our company specifically? What do you know about us?',
    'Describe a challenge or project failure you experienced. What did you learn from it?',
    'How do you handle constructive criticism from your peers or team lead?',
    'Are you comfortable working in a cross-functional environment? Explain a past project.',
    'What motivates you to perform your best at work every day?',
    'How do you prioritize your tasks when juggling multiple assignments?',
    'Describe a situation where you had to quickly adapt to a major change in a project.',
    'What is your idea of an ideal manager/team lead?',
    'Do you plan to pursue higher education, or are you focused on professional career growth?'
  ],
  'Java': [
    'What are the main OOP concepts in Java and how are they implemented?',
    'Explain the difference between an Abstract Class and an Interface in Java.',
    'What is Garbage Collection in Java, and how does the JVM manage memory?',
    'Explain the difference between HashMap and Hashtable.',
    'What is the difference between Checked and Unchecked exceptions?',
    'What is the JVM ClassLoader, and how does it load class files at runtime?',
    'Explain the Stream API in Java. What is the difference between intermediate and terminal operations?',
    'What is the difference between String, StringBuilder, and StringBuffer in memory allocation?',
    'Explain method overloading vs. method overriding in Java.',
    'Explain Java Thread synchronization and how to prevent deadlocks in multi-threaded code.',
    'What is a static block, static variable, and static method in Java? What is their lifecycle?',
    'What is serialization in Java? How do you exclude a field from serialization using transient?',
    'What is the Java Collection Framework? Compare ArrayList vs. LinkedList performance.',
    'Explain the concept of Generics in Java. What are wildcards like ? extends T?',
    'What is the difference between fail-fast and fail-safe iterators in Java collections?',
    'Explain the Java Memory Model (Heap vs. Stack). Where are object references and primitives stored?',
    'How does exception propagation work in Java nested method invocations?'
  ],
  'C Programming': [
    'Explain pointers in C and how they are used. What is a wild pointer?',
    'What is the difference between a Structure and a Union in C?',
    'How do dynamic memory allocation functions (malloc, calloc, realloc, free) work?',
    'What is a segmentation fault in C, and what are its common causes?',
    'Explain the storage classes (auto, register, static, extern) in C.',
    'Explain pointer arithmetic in C. How does adding 1 to an integer pointer differ from a char pointer?',
    'What is a function pointer in C, and how is it used for callback mechanisms?',
    'Explain struct padding and alignment in C. Why does the size of a structure vary with member order?',
    'Explain the phases of C compilation: Preprocessing, Compiling, Assembly, and Linking.',
    'How do preprocessor directives like #define, #include, #ifdef, and #ifndef work?',
    'What is a memory leak in C? How do tools like Valgrind help identify them?',
    'Explain call by value vs. call by reference using pointers in C functions.',
    'What are command line arguments in C? Explain the parameters argc and argv.',
    'Explain volatile and const keywords in C. How do they affect compiler optimization?',
    'What is a dangling pointer in C, and how can it be avoided in heap management?',
    'Explain file handling functions in C (fopen, fread, fwrite, fclose, fseek). What is EOF?'
  ],
  'Python': [
    'What is the difference between a List and a Tuple in Python?',
    'What are Python decorators, and how do you write a custom decorator?',
    'Explain GIL (Global Interpreter Lock) in Python. How does it affect multi-threading?',
    'How is memory managed in Python? Explain reference counting and garbage collection.',
    'What is the difference between copy and deepcopy in Python?',
    'Explain the difference between args and kwargs parameters in Python function signatures.',
    'What are dunder (double underscore) or magic methods in Python (e.g. __str__, __init__, __repr__)?',
    'How do local, global, and nonlocal scope bindings work in Python nested functions?',
    'Explain Python Exception handling hierarchy (try-except-else-finally). When is "else" executed?',
    'What is a lambda function in Python? When should you use it over a normal def function?',
    'Explain the difference between the "is" operator and "==" operator in Python comparisons.',
    'What are Python list comprehensions and generators? What are the memory advantages of generators?',
    'How does multithreading differ from multiprocessing in Python? When should you use which?',
    'What is the purpose of virtual environments (venv) in Python project setups?',
    'Explain how the with statement works in Python. What magic methods make a class a Context Manager?',
    'What are namespaces and modules in Python? How does sys.path affect module imports?'
  ],
  'HTML': [
    'What is Semantic HTML? Why is it important for SEO and accessibility?',
    'Explain the differences between localStorage, sessionStorage, and cookies.',
    'What are HTML5 custom data attributes (data-*) and how are they used?',
    'Compare SVG vs. Canvas in HTML5. When would you use one over the other?',
    'What is the purpose of the doctype declaration in HTML?',
    'What are the new form input types introduced in HTML5 (email, url, date, etc.)?',
    'Explain the difference between block-level elements and inline elements in HTML.',
    'What is the HTML5 Web Storage API? How does it differ from traditional server cookies?',
    'What is the role of meta viewport tags in building responsive web structures?',
    'How do standard HTML anchor link attributes like target="_blank" and rel="noopener" protect users?',
    'Explain the difference between div and span tags in document layout hierarchy.',
    'What is the purpose of the figure and figcaption semantic elements in HTML5?',
    'How do browsers handle unrecognized tags in an HTML document layout?',
    'What is the difference between src and href attributes in resource declarations?',
    'What is critical rendering path in browser page layout paints?'
  ],
  'CSS': [
    'Explain the CSS Box Model and how box-sizing affects layout width and height.',
    'What are the differences between Flexbox and Grid? When do you choose each?',
    'Explain CSS Specificity and how it determines which styling rules are applied.',
    'What is the difference between transition and animation in CSS?',
    'How do CSS variables (custom properties) work, and what are their benefits?',
    'Explain the difference between absolute, relative, fixed, sticky, and static positioning.',
    'What are media queries in CSS? How do you write a mobile-first responsive query?',
    'What is a CSS preprocessor (like SASS or LESS)? What advantages does it offer?',
    'Explain the difference between display: none and visibility: hidden in layouts.',
    'What are CSS pseudo-classes and pseudo-elements? Give examples of both.',
    'Explain layout reflows and repaints. What styling rules cause reflows?',
    'What is the difference between CSS grid-template-columns and grid-auto-flow attributes?',
    'How do rem, em, px, and vh/vw units differ in responsive font sizing?',
    'Explain the concept of Flexbox wrapping (flex-wrap) and alignment (align-content vs. align-items).',
    'What is Z-Index in CSS? How does stacking context affect element overlaps?'
  ],
  'JavaScript': [
    'What is a Closure in JavaScript? Can you give an example of its use case?',
    'Explain the difference between "==" and "===" in JavaScript.',
    'What is the difference between Event Bubbling and Event Capturing?',
    'Explain Promises in JavaScript and how async/await simplifies asynchronous code.',
    'What is prototype-based inheritance in JavaScript?',
    'What is variable hoisting in JavaScript? How does it differ for var, let, and const?',
    'Explain the JavaScript Event Loop, call stack, task queue, and microtask queue.',
    'How does the "this" keyword work in different execution contexts (object method, arrow function, constructor)?',
    'What is Event Delegation in JavaScript DOM manipulation? What are its benefits?',
    'Explain throttle vs. debounce concepts in JavaScript performance optimization.',
    'What is the difference between call, apply, and bind methods in function scope binding?',
    'Explain the differences between Server-Sent Events (SSE) and WebSockets.',
    'What is the difference between map, filter, and reduce array methods in JavaScript?',
    'What is the Temporal Dead Zone (TDZ) in ES6 variable declaration?',
    'Explain the difference between shallow copy and deep copy of JavaScript objects.',
    'What is strict mode ("use strict") in JavaScript? What are its benefits?',
    'Explain JavaScript module patterns (CommonJS vs. ES6 Import/Export modules).'
  ],
  'Web Development': [
    'What is MVC (Model-View-Controller) architecture, and how does it separate concerns?',
    'What are the principles of a RESTful API? What are the key HTTP methods?',
    'Explain WebSockets. How do they differ from HTTP polling?',
    'What techniques would you use to optimize the load performance of a web page?',
    'What is Cross-Origin Resource Sharing (CORS) and why is it required by browsers?',
    'What is JWT (JSON Web Token)? How is it structured and used for session authentication?',
    'Explain the differences between SQL and NoSQL databases. When would you use which?',
    'What is the DOM (Document Object Model)? How does a browser paint a web page?',
    'Explain Client-side Rendering (CSR) vs. Server-side Rendering (SSR) in web frameworks.',
    'Explain API rate limiting and typical techniques (token bucket, leaky bucket) used to enforce it.',
    'What is CSS blocking and JavaScript blocking? How do async and defer attributes resolve this?',
    'What is the purpose of HTTP status codes: 200, 201, 301, 400, 401, 403, 404, 500?',
    'What is DNS (Domain Name System) resolution? What happens when you search a URL in a browser?',
    'Explain the difference between symmetric and asymmetric encryption in HTTPS protocols.',
    'What are Web Workers? How do they allow running JavaScript in background threads?',
    'What is a CDN (Content Delivery Network)? How does it optimize global content delivery?'
  ],
  'Authentication': [
    'What is the difference between Authentication and Authorization?',
    'Explain how OAuth 2.0 works under the hood. What are its core flows?',
    'What is session-based authentication? How does it differ from token-based (JWT) authentication?',
    'Explain SSO (Single Sign-On). How do SAML and OIDC facilitate it?',
    'What is MFA (Multi-Factor Authentication)? What are the typical channels used?',
    'Explain password hashing algorithms. Why are bcrypt and Argon2 preferred over MD5/SHA256?',
    'What is a CSRF (Cross-Site Request Forgery) attack, and how do anti-CSRF tokens prevent it?',
    'How do you secure JWT tokens against XSS attacks? Compare localStorage vs. HttpOnly cookies.',
    'What is role-based access control (RBAC) vs. attribute-based access control (ABAC)?',
    'Explain token rotation and refresh tokens. Why is reuse detection critical?',
    'What is the purpose of CORS headers in securing cross-origin API calls?',
    'Explain rate limiting and account lockout policies to prevent brute force login attempts.',
    'What is open redirect vulnerability in authentication callback routes?',
    'Explain the PKCE (Proof Key for Code Exchange) extension in OAuth 2.0 and why it is used for mobile/SPA.',
    'What are the security implications of storing JWTs in cookies with SameSite=Strict and Secure attributes?'
  ],
  'React UI & Routing': [
    'Explain React Virtual DOM and the reconciliation algorithm (Fiber) under the hood.',
    'What is the difference between controlled and uncontrolled components in React forms?',
    'Explain the React component lifecycle methods in class components vs. Hooks in functional components.',
    'What are React hooks? Explain the rules of hooks and how useEffect dependency arrays work.',
    'What is React Context API, and when would you use it over a state management library like Redux?',
    'Explain the difference between client-side routing (React Router) vs. traditional server-side routing.',
    'How do you optimize React render performance? Compare React.memo, useMemo, and useCallback.',
    'What is the purpose of keys in React lists? Why is using array index as key discouraged?',
    'Explain code splitting in React. How do React.lazy and Suspense work?',
    'What is the difference between Server Components and Client Components in React frameworks (like Next.js)?',
    'How does state batching work in React 18? How does it optimize render cycles?',
    'What is the difference between useLayoutEffect and useEffect in React?',
    'Explain how React Router handles dynamic route parameters (e.g. /user/:id) and query parameters.',
    'What is prop drilling in React, and how can it be avoided?',
    'How do you implement protected routes (auth guards) in a React Router setup?'
  ],
  'Testing & Deployment': [
    'What are the differences between Unit Testing, Integration Testing, and End-to-End (E2E) Testing?',
    'What is Test-Driven Development (TDD)? Explain the Red-Green-Refactor cycle.',
    'What is the role of continuous integration and continuous deployment (CI/CD) pipelines in software delivery?',
    'Explain containerization. What is Docker, and how does it differ from traditional virtual machines?',
    'What is container orchestration? What is the role of Kubernetes in deploying applications at scale?',
    'Explain the difference between Blue-Green Deployment and Canary Deployment strategies.',
    'What are mocking and stubbing in unit testing? When and why would you use them?',
    'Explain serverless deployment. What are the advantages and drawbacks of AWS Lambda or Vercel functions?',
    'What is regression testing, and why is it automated in CI pipelines?',
    'How do you handle secrets management (API keys, database credentials) during deployments?',
    'What is the difference between horizontal scaling and vertical scaling of applications?',
    'Explain blue/green deployment strategy. How does it ensure zero-downtime releases?',
    'What is static site generation (SSG) vs. incremental static regeneration (ISR) during deployment?',
    'What are linting and formatting (e.g. ESLint, Prettier)? Why are they integrated into pre-commit hooks?',
    'Explain application logging and monitoring. What is the role of tools like Sentry, Datadog, or Prometheus?'
  ]
};

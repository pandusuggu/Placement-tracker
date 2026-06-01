import React, { useState, useEffect } from 'react'
import {
  GraduationCap, Award, Compass, RefreshCw, Send, CheckCircle2,
  Sliders, ChevronDown, ChevronUp, Flame, ExternalLink,
  Plus, FolderOpen, FileText, Kanban, ArrowUpRight, Check, Calendar, Star,
  Activity, Clock, Award as AwardIcon, CheckSquare as CheckSquareIcon, Trash2,
  Brain, X, UploadCloud, AlertTriangle, Sparkles, Youtube, Edit
} from 'lucide-react'
import api from '../../services/api'
import { DSA_QUESTIONS } from './neetcodeQuestions'
import { BLIND75_QUESTIONS } from './blind75Questions'

interface Project {
  name: string
  description: string
  completion_percentage: number
}

interface ProgressData {
  leetcode_username: string
  codechef_username: string
  hackerrank_username: string
  easy_solved: number
  medium_solved: number
  hard_solved: number
  current_streak: number
  longest_streak: number
  dsa_progress: Record<string, string>
  core_subjects_progress: Record<string, number>
  core_subjects_questions: Record<string, string[]>
  aptitude_progress: Record<string, number>
  aptitude_questions: Record<string, string[]>
  projects_progress: Project[]
  resume_status: string
  mock_interview_score: number
}

interface PlacementReadiness {
  score: number
  readiness_level: string
  dsa_score: number
  core_subjects_score: number
  aptitude_score: number
  projects_score: number
  resume_score: number
  mock_interview_score: number
  suggestions: string[]
  resume_ats_score?: number
  resume_strengths?: string[]
  resume_improvements?: string[]
  resume_suggestions?: string[]
}

const DSA_CATEGORIES = {
  "Fundamentals": ["Arrays", "Strings", "Linked Lists", "Recursion"],
  "Data Structures": ["Stack", "Queue", "Heap", "Trees", "Graphs"],
  "Algorithms": ["Backtracking", "Greedy", "Dynamic Programming"]
}

const COMPANY_PREP_DATA = {
  TCS: {
    name: "TCS",
    logoText: "TCS",
    bgColor: "bg-blue-600/10 border-blue-500/20 text-blue-500",
    description: "Tata Consultancy Services - Mass Campus Recruiter (Ninja/Digital Roles)",
    rounds: [
      { id: "tcs_r1", name: "Online Cognitive & Coding Test", desc: "Quantitative Aptitude, Logical Reasoning, Verbal Ability, and 1-2 coding problems." },
      { id: "tcs_r2", name: "Technical Interview", desc: "Discussion on projects, basic programming languages, DBMS, OS, and OOP concepts." },
      { id: "tcs_r3", name: "Managerial & HR Interview", desc: "Behavioral questions, resume verification, and queries about shift flexibility." }
    ]
  },
  Infosys: {
    name: "Infosys",
    logoText: "INFY",
    bgColor: "bg-teal-600/10 border-teal-500/20 text-teal-500",
    description: "Infosys - Campus Placement (System Engineer / Specialist Programmer Roles)",
    rounds: [
      { id: "inf_r1", name: "Infosys Online Test", desc: "MCQs on math, reasoning, verbal, pseudocode reading, and puzzle-solving." },
      { id: "inf_r2", name: "Technical Interview", desc: "Algorithmic questions, SQL queries, resume projects, and web development fundamentals." },
      { id: "inf_r3", name: "HR Interview", desc: "Standard behavioral questions, relocation check, and communication skill assessment." }
    ]
  },
  Accenture: {
    name: "Accenture",
    logoText: "ACN",
    bgColor: "bg-purple-600/10 border-purple-500/20 text-purple-500",
    description: "Accenture - High Volume Campus Hiring (ASE / FSE Roles)",
    rounds: [
      { id: "acn_r1", name: "Cognitive & Technical Assessment", desc: "Critical thinking, problem-solving, MS Office, Pseudocode, and networking theory." },
      { id: "acn_r2", name: "Coding Assessment", desc: "Solving 2 algorithmic programming problems (typically String/Array manipulation)." },
      { id: "acn_r3", name: "Communication Assessment", desc: "Automated spoken English test assessing reading, listening, and sentence structure." },
      { id: "acn_r4", name: "Technical & HR Interview", desc: "Project-based technical questions and soft skills evaluation." }
    ]
  },
  Amazon: {
    name: "Amazon",
    logoText: "AMZN",
    bgColor: "bg-amber-600/10 border-amber-500/20 text-amber-500",
    description: "Amazon - Product SDE Recruitment (Campus / Off-Campus Hiring)",
    rounds: [
      { id: "amz_r1", name: "Online Assessment (OA)", desc: "Two standard DSA problems (medium/hard) plus work simulation leadership questions." },
      { id: "amz_r2", name: "Technical Interview 1 (DSA)", desc: "Deep dive into data structures and algorithm optimization (time/space complexity)." },
      { id: "amz_r3", name: "Technical Interview 2 (System Design)", desc: "Discussion on scaling web apps, low-level design patterns, and database scaling." },
      { id: "amz_r4", name: "Bar Raiser Interview", desc: "Challenging design/coding scenario combined with strict Leadership Principles check." }
    ]
  },
  Microsoft: {
    name: "Microsoft",
    logoText: "MSFT",
    bgColor: "bg-indigo-600/10 border-indigo-500/20 text-indigo-500",
    description: "Microsoft - Product Software Engineer (Campus Placement Drive)",
    rounds: [
      { id: "ms_r1", name: "Online Coding Assessment", desc: "Three algorithmic questions on Codility or HackerRank within 90 minutes." },
      { id: "ms_r2", name: "Technical Round 1 (DSA & Logic)", desc: "Focus on Trees, Graphs, Recursion, or Dynamic Programming problem solving." },
      { id: "ms_r3", name: "Technical Round 2 (Design & Architecture)", desc: "Object-oriented design, API structures, or high-level system components." },
      { id: "ms_r4", name: "AA (As Appropriate) / Manager Round", desc: "Architectural challenges, logic puzzles, and behavioral alignment questions." }
    ]
  }
}

const DEFAULT_ROUND_QUESTIONS: Record<string, string[]> = {
  tcs_r1: [
    "A train 150m long passes a pole in 15 seconds. Find its speed in km/h. || TCS Quantitative Aptitude",
    "Identify the next term in the logical series: 3, 12, 48, 192, ...? || TCS Logical Reasoning",
    "Write a function to check if a given number is a Strong Number (sum of factorials of digits equals the number). || TCS Coding"
  ],
  tcs_r2: [
    "Explain the difference between Primary Key, Unique Key, and Foreign Key in DBMS.",
    "What is the difference between Method Overloading and Method Overriding in Java/C++?",
    "Explain memory management in Python/Java. How does Garbage Collection work?"
  ],
  tcs_r3: [
    "Why do you want to join TCS, and how do you see yourself contributing to our consulting projects?",
    "Are you comfortable with relocation and working in rotating night shifts if required?",
    "Describe a situation where you had a conflict with a team member. How did you resolve it?"
  ],
  inf_r1: [
    "Pseudocode Reading: Predict the output of a nested loop checking prime status of array elements. || Infosys Pseudocode",
    "Reasoning: In a certain code 'INFOSYS' is written as 'JO GPTZT'. How is 'PYTHON' written? || Infosys Logical",
    "Math: A tank can be filled by two pipes in 20 and 30 mins respectively. How long to fill if both are open? || Infosys Quantitative"
  ],
  inf_r2: [
    "Write SQL queries to find the second highest salary of an employee from the Employee database.",
    "Explain the lifecycle of a thread in Java or equivalent concurrency paradigms.",
    "Discuss the difference between relational databases and NoSQL databases. When would you prefer MongoDB?"
  ],
  inf_r3: [
    "Walk me through your major portfolio projects. What was the biggest technical challenge you overcame?",
    "If you are assigned a technology stack you have no prior experience with, how would you approach it?",
    "Where do you see yourself in the next 5 years in terms of technical growth?"
  ],
  acn_r1: [
    "Networking: Explain the difference between Hub, Switch, Router, and Bridge devices. || Accenture Networking",
    "Pseudocode: Trace the output of a recursive function calculating Fibonacci series. || Accenture Pseudocode",
    "Cognitive: In a class of 45 students, Rohan ranks 18th from top. What is his rank from the bottom? || Accenture Logic"
  ],
  acn_r2: [
    "Coding: Write a function to check if two strings are anagrams of each other. Explain time complexity.",
    "Coding: Find the longest contiguous subarray with the maximum sum (Kadane's Algorithm).",
    "Optimize a given array searching method from O(N) to O(log N) using Binary Search."
  ],
  acn_r3: [
    "Spoken English: Read a paragraph clearly on simulated screen to test automated voice scoring.",
    "Sentence Structure: Rearrange a jumbled paragraph into a grammatically correct order.",
    "Listening Comprehension: Listen to a short dialogue and answer multiple-choice questions."
  ],
  acn_r4: [
    "How does client-server communication work? Explain HTTP methods (GET, POST, PUT, DELETE) and status codes.",
    "What are your key strengths? Give a real example of how you demonstrated leadership in a college team project.",
    "How do you handle working under tight deadlines? Give an example from your academic or project experience."
  ],
  amz_r1: [
    "Coding: Given an array of integers representing warehouse package weights, find the minimum number of trucks needed if each truck can carry at most weight K. || Amazon OA",
    "Coding: Implement a custom Least Recently Used (LRU) Cache with O(1) time complexity for get and put operations. || Amazon OA",
    "Work Style: You discover a bug in production that affects 1% of users. Do you fix it immediately, wait for lead review, or log it in backlog? || Amazon Leadership"
  ],
  amz_r2: [
    "Coding: Merge k Sorted Linked Lists using a Min-Heap. Walk through the heap states and explain final time complexity.",
    "Coding: Find the length of the longest path in a Binary Tree where each node has the same value.",
    "How does a hash map work under the hood? Explain hash collisions and how they are resolved using chaining and open addressing."
  ],
  amz_r3: [
    "System Design: Design a URL shortening service like Bit.ly. Focus on scalability, hash generation, custom aliases, and analytics.",
    "System Design: Design a rate limiter for an API. Compare Token Bucket, Leaky Bucket, and Sliding Window Log algorithms.",
    "Design a database schema for an e-commerce order processing system. How do you handle concurrent transaction locks during peak sale hours?"
  ],
  amz_r4: [
    "Customer Obsession: Tell me about a time when you went above and beyond for a customer or a project user. What was the feedback?",
    "Bias for Action: Describe a situation where you had to make a quick decision without all the necessary data. What was the outcome?",
    "Ownership: Have you ever taken responsibility for a project failure? What did you do to rectify the situation, and what did you learn?"
  ],
  ms_r1: [
    "Coding: Given an array representing stock prices, find the maximum profit you can achieve by buying and selling once. || Microsoft OA",
    "Coding: Find the lowest common ancestor (LCA) of two given nodes in a Binary Search Tree. || Microsoft OA",
    "Coding: Write a function to check if a binary tree is balanced (height difference of subtrees is at most 1). || Microsoft OA"
  ],
  ms_r2: [
    "Coding: Implement a function to find all unique triplets in an array that sum to zero (3Sum problem). Explain O(N^2) optimization.",
    "Coding: Solve the Word Ladder problem using BFS. Explain why BFS is preferred over DFS for shortest path in unweighted graphs.",
    "Explain recursion and memory stacks. How do you prevent stack overflow errors in deep recursion algorithms?"
  ],
  ms_r3: [
    "System Design: Design an API rate limiter for a distributed system. How do you sync token states across multiple servers using Redis?",
    "Object-Oriented Design: Design a parking lot system using SOLID principles. Draw/describe the class definitions and design patterns used.",
    "Compare SQL vs NoSQL databases in terms of ACID compliance, scaling (horizontal vs vertical), and schema flexibility."
  ],
  ms_r4: [
    "Why Microsoft? What technical product of Microsoft excites you the most, and how would you propose to improve it?",
    "Describe a time when you had to work with a difficult team member. What steps did you take to ensure the project succeeded?",
    "Explain a complex technical concept (like recursion or database indexing) to a non-technical person."
  ]
}

const TOPIC_THRESHOLDS: Record<string, number> = {
  "Arrays": 5,
  "Strings": 3,
  "Linked Lists": 3,
  "Stack": 3,
  "Queue": 2,
  "Trees": 4,
  "Graphs": 4,
  "Heap": 2,
  "Recursion": 3,
  "Backtracking": 3,
  "Greedy": 3,
  "Dynamic Programming": 5
}

const CS_QUESTIONS: Record<string, string[]> = {
  "DBMS": [
    "Explain ACID Properties in Transactions (transaction safety).",
    "What is Database Indexing and how does B-Tree work?",
    "Compare SQL vs NoSQL databases (relational vs non-relational).",
    "What is Database Normalization (1NF, 2NF, 3NF)?",
    "What is the difference between Inner, Left, Right, and Full Joins?"
  ],
  "OS": [
    "What is the difference between a Process and a Thread?",
    "Explain Deadlocks, their 4 necessary conditions, and prevention.",
    "What is Virtual Memory and Paging?",
    "Explain CPU Scheduling algorithms (e.g. Round Robin, FCFS).",
    "What is Thread Synchronization, Mutex, and Semaphore?"
  ],
  "CN": [
    "Explain the OSI Model layers and their functions.",
    "What is the difference between TCP and UDP?",
    "What happens when you type a URL in the browser (DNS, TCP, HTTP)?",
    "What is the difference between HTTP and HTTPS (SSL/TLS handshake)?",
    "Compare IPv4 vs IPv6 addressing."
  ],
  "OOP": [
    "Explain the 4 Pillars of OOP (Abstraction, Encapsulation, Inheritance, Polymorphism).",
    "What is the difference between Method Overloading and Method Overriding?",
    "Compare Abstract Class vs Interface.",
    "What is the difference between Composition and Inheritance?",
    "Explain the concept of Constructor and Destructor."
  ]
}

const APTITUDE_QUESTIONS: Record<string, string[]> = {
  "Quantitative Aptitude": [
    "Solve Percentages Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/percentage/",
    "Solve Profit & Loss Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/profit-and-loss/",
    "Solve Ratio & Proportion Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/ratio-and-proportion/",
    "Solve Time & Work Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/time-and-work/",
    "Solve Time & Distance Problems (Arithmetic Section) || https://www.indiabix.com/aptitude/time-and-distance/"
  ],
  "Logical Reasoning": [
    "Solve Arrangements & Seating Puzzles || https://www.indiabix.com/verbal-reasoning/seating-arrangement/",
    "Solve Venn Diagram & Syllogism Deductions || https://www.indiabix.com/verbal-reasoning/syllogism/",
    "Solve Letter & Symbol Series || https://www.indiabix.com/logical-reasoning/letter-and-symbol-series/",
    "Solve Blood Relation Queries || https://www.indiabix.com/verbal-reasoning/blood-relation-test/",
    "Solve Clocks & Calendar Puzzles || https://www.indiabix.com/aptitude/clock/"
  ],
  "Verbal Ability": [
    "Solve Reading Comprehension Inquiries || https://www.indiabix.com/verbal-ability/comprehension/",
    "Solve Sentence Correction & Grammar Checks || https://www.indiabix.com/verbal-ability/sentence-correction/",
    "Solve Synonyms & Antonyms Queries || https://www.indiabix.com/verbal-ability/synonyms/",
    "Solve Para Jumbles & Ordering of Sentences || https://www.indiabix.com/verbal-ability/ordering-of-sentences/",
    "Solve Idioms and Phrases Questions || https://www.indiabix.com/verbal-ability/idioms-and-phrases/"
  ]
}

export const Prep: React.FC = () => {
  const [progress, setProgress] = useState<ProgressData | null>(null)
  const [readiness, setReadiness] = useState<PlacementReadiness | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Username states
  const [leetcode, setLeetcode] = useState('')
  const [codechef, setCodechef] = useState('')
  const [hackerrank, setHackerrank] = useState('')
  const [showSyncPanel, setShowSyncPanel] = useState(false)

  // New Project Form
  const [projName, setProjName] = useState('')
  const [projDesc, setProjDesc] = useState('')
  const [projProgress, setProjProgress] = useState(50)
  const [showAddProject, setShowAddProject] = useState(false)

  // Accordion details
  const [expandedCategory, setExpandedCategory] = useState<string | null>("Fundamentals")
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedBlindCategory, setExpandedBlindCategory] = useState<string | null>("Fundamentals")
  const [expandedBlindTopic, setExpandedBlindTopic] = useState<string | null>(null)
  const [completedQuestions, setCompletedQuestions] = useState<Record<string, boolean>>({})
  const [youtubeLinks, setYoutubeLinks] = useState<Record<string, string>>({})
  const [expandedCoreSubject, setExpandedCoreSubject] = useState<string | null>(null)
  const [expandedAptitudeTopic, setExpandedAptitudeTopic] = useState<string | null>(null)
  const [generatingAptitudeTopic, setGeneratingAptitudeTopic] = useState<string | null>(null)

  // Helper: check if a theoretical question is checked
  const isCSQuestionChecked = (subject: string, index: number) => {
    const progressPercent = progress?.core_subjects_progress?.[subject] || 0
    return (index * 20) < progressPercent
  }

  // Toggle check on a theoretical question
  const handleToggleCSQuestion = async (subject: string, index: number) => {
    const isCurrentlyChecked = isCSQuestionChecked(subject, index)
    const newPercent = isCurrentlyChecked ? index * 20 : (index + 1) * 20
    await handleCoreSliderChange(subject, newPercent)
  }

  const [generatingSubject, setGeneratingSubject] = useState<string | null>(null)

  const handleRegenerateCSQuestions = async (subject: string) => {
    setGeneratingSubject(subject)
    try {
      const res = await api.post('/api/coding/core-subjects/regenerate', { subject })
      if (progress) {
        setProgress({
          ...progress,
          core_subjects_questions: {
            ...progress.core_subjects_questions,
            [subject]: res.data.questions
          },
          core_subjects_progress: {
            ...progress.core_subjects_progress,
            [subject]: 0.0
          }
        })
      }
      // Refresh readiness
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error("Failed to regenerate CS questions:", e)
      alert("AI Generation failed. Check API key configuration or try again.")
    } finally {
      setGeneratingSubject(null)
    }
  }

  const isAptitudeQuestionChecked = (topic: string, index: number) => {
    const progressPercent = progress?.aptitude_progress?.[topic] || 0
    return (index * 20) < progressPercent
  }

  const handleToggleAptitudeQuestion = async (topic: string, index: number) => {
    const isCurrentlyChecked = isAptitudeQuestionChecked(topic, index)
    const newPercent = isCurrentlyChecked ? index * 20 : (index + 1) * 20
    await handleAptitudeSliderChange(topic, newPercent)
  }

  const handleRegenerateAptitudeQuestions = async (topic: string) => {
    setGeneratingAptitudeTopic(topic)
    try {
      const res = await api.post('/api/coding/aptitude/regenerate', { topic })
      if (progress) {
        setProgress({
          ...progress,
          aptitude_questions: {
            ...progress.aptitude_questions,
            [topic]: res.data.questions
          },
          aptitude_progress: {
            ...progress.aptitude_progress,
            [topic]: 0.0
          }
        })
      }
      // Refresh readiness
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error("Failed to regenerate Aptitude questions:", e)
      alert("AI Generation failed. Check API key configuration or try again.")
    } finally {
      setGeneratingAptitudeTopic(null)
    }
  }

  // Resume upload and analysis handlers
  const [resumeAnalyzing, setResumeAnalyzing] = useState(false)
  const [resumeError, setResumeError] = useState<string | null>(null)

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    const filename = file.name.toLowerCase()
    if (!filename.endsWith('.pdf') && !filename.endsWith('.txt')) {
      setResumeError("Only PDF and TXT files are supported.")
      return
    }
    
    setResumeError(null)
    setResumeAnalyzing(true)
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await api.post('/api/placement/resume/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      setReadiness(res.data)
      
      if (progress) {
        setProgress({
          ...progress,
          resume_status: res.data.resume_status || 'completed'
        })
      }
    } catch (err: any) {
      console.error(err)
      setResumeError(err.response?.data?.detail || "Failed to analyze resume. Please try again.")
    } finally {
      setResumeAnalyzing(false)
    }
  }

  // Company Mock Interview preparation states
  const [activeCompany, setActiveCompany] = useState<keyof typeof COMPANY_PREP_DATA | null>(null)
  const [completedRounds, setCompletedRounds] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('completed_company_rounds')
    return saved ? JSON.parse(saved) : {}
  })

  const getCompanyProgress = (companyId: keyof typeof COMPANY_PREP_DATA) => {
    const rounds = COMPANY_PREP_DATA[companyId].rounds
    const completed = rounds.filter(r => completedRounds[r.id]).length
    return Math.round((completed / rounds.length) * 100)
  }

  const handleToggleRound = async (roundId: string) => {
    const isCurrentlyChecked = !!completedRounds[roundId]
    
    // Toggle all 3 sub-questions to match the new state
    const nextSub = { ...completedSubQuestions }
    ;[0, 1, 2].forEach(idx => {
      nextSub[`${roundId}_${idx}`] = !isCurrentlyChecked
    })
    setCompletedSubQuestions(nextSub)
    localStorage.setItem('completed_round_sub_questions', JSON.stringify(nextSub))

    const nextRounds = {
      ...completedRounds,
      [roundId]: !isCurrentlyChecked
    }
    setCompletedRounds(nextRounds)
    localStorage.setItem('completed_company_rounds', JSON.stringify(nextRounds))

    // Re-calculate mock score and sync to backend
    const allRounds = Object.values(COMPANY_PREP_DATA).flatMap(c => c.rounds.map(r => r.id))
    const completedCount = allRounds.filter(id => nextRounds[id]).length
    const computedScore = Math.round((completedCount / allRounds.length) * 100)
    
    await handleCareerUpdate('mock_interview_score', computedScore)
  }

  // Round questions state (Tailored mock interview questions)
  const [roundQuestions, setRoundQuestions] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('company_round_questions')
    return saved ? JSON.parse(saved) : DEFAULT_ROUND_QUESTIONS
  })

  // Checkable sub-questions state
  const [completedSubQuestions, setCompletedSubQuestions] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('completed_round_sub_questions')
    return saved ? JSON.parse(saved) : {}
  })

  // Shuffling round loader state
  const [shufflingRounds, setShufflingRounds] = useState<Record<string, boolean>>({})

  const handleToggleSubQuestion = async (roundId: string, qIdx: number) => {
    const qKey = `${roundId}_${qIdx}`
    const nextSub = {
      ...completedSubQuestions,
      [qKey]: !completedSubQuestions[qKey]
    }
    setCompletedSubQuestions(nextSub)
    localStorage.setItem('completed_round_sub_questions', JSON.stringify(nextSub))

    // If all 3 sub-questions for this round are checked off, mark the round itself as completed!
    const isRoundCompleted = [0, 1, 2].every(idx => nextSub[`${roundId}_${idx}`])
    
    const nextRounds = {
      ...completedRounds,
      [roundId]: isRoundCompleted
    }
    setCompletedRounds(nextRounds)
    localStorage.setItem('completed_company_rounds', JSON.stringify(nextRounds))

    // Re-calculate mock interview score and sync to backend
    const allRounds = Object.values(COMPANY_PREP_DATA).flatMap(c => c.rounds.map(r => r.id))
    const completedCount = allRounds.filter(id => nextRounds[id]).length
    const computedScore = Math.round((completedCount / allRounds.length) * 100)
    
    await handleCareerUpdate('mock_interview_score', computedScore)
  }

  const handleShuffleRoundQuestions = async (company: string, roundId: string, roundName: string, roundDesc: string) => {
    setShufflingRounds(prev => ({ ...prev, [roundId]: true }))
    try {
      const res = await api.post('/api/placement/company-rounds/regenerate', {
        company,
        round_name: roundName,
        round_desc: roundDesc
      })
      
      const newQuestions = res.data.questions
      
      const nextQuestions = {
        ...roundQuestions,
        [roundId]: newQuestions
      }
      setRoundQuestions(nextQuestions)
      localStorage.setItem('company_round_questions', JSON.stringify(nextQuestions))

      const nextSub = { ...completedSubQuestions }
      ;[0, 1, 2].forEach(idx => {
        nextSub[`${roundId}_${idx}`] = false
      })
      setCompletedSubQuestions(nextSub)
      localStorage.setItem('completed_round_sub_questions', JSON.stringify(nextSub))

      const nextRounds = {
        ...completedRounds,
        [roundId]: false
      }
      setCompletedRounds(nextRounds)
      localStorage.setItem('completed_company_rounds', JSON.stringify(nextRounds))

      const allRounds = Object.values(COMPANY_PREP_DATA).flatMap(c => c.rounds.map(r => r.id))
      const completedCount = allRounds.filter(id => nextRounds[id]).length
      const computedScore = Math.round((completedCount / allRounds.length) * 100)
      await handleCareerUpdate('mock_interview_score', computedScore)

    } catch (err) {
      console.error(err)
      alert("Failed to shuffle questions with AI. Please check server connections and API key.")
    } finally {
      setShufflingRounds(prev => ({ ...prev, [roundId]: false }))
    }
  }

  // Floating prep chat states
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setPrepChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: "Hi! I am your AI Placement Prep Assistant. Need help understanding a DSA problem or a Core CS question? Let me know, and I'll explain it for you!" }
  ])
  const [prepChatInput, setPrepChatInput] = useState('')
  const [prepChatSending, setPrepChatSending] = useState(false)
  const prepChatEndRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isChatOpen) {
      prepChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, isChatOpen])

  const handleSendPrepChatMessage = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault()
    const msgToSend = customMsg || prepChatInput.trim()
    if (!msgToSend || prepChatSending) return

    setPrepChatMessages(prev => [...prev, { role: 'user', content: msgToSend }])
    if (!customMsg) setPrepChatInput('')
    setPrepChatSending(true)
    setIsChatOpen(true)

    try {
      const historyPayload = chatMessages.map(m => ({
        role: m.role,
        content: m.content
      }))

      const res = await api.post('/api/coach/chat', {
        message: msgToSend,
        history: historyPayload
      })

      setPrepChatMessages(prev => [...prev, { role: 'assistant', content: res.data.response }])
    } catch (err) {
      console.error(err)
      setPrepChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing your question. Please try again." }])
    } finally {
      setPrepChatSending(false)
    }
  }

  const askAIAboutQuestion = (questionTitle: string, subjectOrTopic: string) => {
    const prompt = `Can you explain the following technical interview question from my ${subjectOrTopic} preparation: "${questionTitle}"? Give a clear, structured explanation with key points and/or example code if helpful.`
    handleSendPrepChatMessage(undefined, prompt)
  }

  const handleClearPrepChat = () => {
    setPrepChatMessages([
      { role: 'assistant', content: "Hi! I am your AI Placement Prep Assistant. Need help understanding a DSA problem or a Core CS question? Let me know, and I'll explain it for you!" }
    ])
  }

  // Fetch progress & readiness
  const fetchProgress = async () => {
    try {
      setLoading(true)
      const res = await api.get('/api/coding/progress')
      setProgress(res.data)
      setLeetcode(res.data.leetcode_username || '')
      setCodechef(res.data.codechef_username || '')
      setHackerrank(res.data.hackerrank_username || '')
      
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)

      // Initialize completed questions from database!
      const dbCompleted: Record<string, boolean> = {}
      
      // Fallback to local storage if needed
      const saved = localStorage.getItem('completed_mock_questions')
      if (saved) {
        try {
          Object.assign(dbCompleted, JSON.parse(saved))
        } catch (e) {}
      }

      if (res.data.dsa_progress) {
        const coreCategories = ['Arrays', 'Strings', 'Linked Lists', 'Stack', 'Queue', 'Trees', 'Graphs', 'Heap', 'Recursion', 'Backtracking', 'Greedy', 'Dynamic Programming']
        Object.entries(res.data.dsa_progress).forEach(([key, val]) => {
          if (!coreCategories.includes(key)) {
            dbCompleted[key] = (val === 'completed')
          }
        })
      }
      setCompletedQuestions(dbCompleted)
      
      if (res.data.dsa_youtube_links) {
        setYoutubeLinks(res.data.dsa_youtube_links)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProgress()
  }, [])

  // Sync profile handles
  const handleSyncUsernames = async (e: React.FormEvent) => {
    e.preventDefault()
    setSyncing(true)
    try {
      await api.put('/api/coding/usernames', {
        leetcode_username: leetcode,
        codechef_username: codechef,
        hackerrank_username: hackerrank
      })
      await fetchProgress()
      setShowSyncPanel(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  // Check stats sync
  const handleManualSync = async () => {
    setSyncing(true)
    try {
      await api.post('/api/coding/sync')
      await fetchProgress()
    } catch (e) {
      console.error(e)
    } finally {
      setSyncing(false)
    }
  }

  const handleSaveYoutubeLink = async (questionId: string, url: string) => {
    try {
      const cleanUrl = url.trim();
      if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        alert("Please enter a valid URL starting with http:// or https://");
        return;
      }

      await api.post('/api/coding/dsa/youtube', {
        question_id: questionId,
        youtube_link: cleanUrl
      });

      setYoutubeLinks(prev => ({
        ...prev,
        [questionId]: cleanUrl
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to save YouTube link.");
    }
  }

  // Toggle question checked status
  const handleToggleQuestion = async (topic: string, questionId: string) => {
    const isNowCompleted = !completedQuestions[questionId]
    const nextCompleted = {
      ...completedQuestions,
      [questionId]: isNowCompleted
    }
    setCompletedQuestions(nextCompleted)
    localStorage.setItem('completed_mock_questions', JSON.stringify(nextCompleted))

    // Save individual question state to DB!
    try {
      await api.post('/api/coding/dsa', { topic: questionId, status: isNowCompleted ? 'completed' : 'not_started' })
    } catch (err) {
      console.error("Failed to save individual question progress:", err)
    }

    // Determine if category threshold is met
    const questions = DSA_QUESTIONS[topic] || []
    const solvedCount = questions.filter(q => nextCompleted[q.id]).length
    const threshold = TOPIC_THRESHOLDS[topic] || 3
    
    // Also check if they solved all questions for this topic in Blind 75
    const blindQuestions = BLIND75_QUESTIONS[topic] || []
    const blindSolvedCount = blindQuestions.filter(q => nextCompleted[q.id]).length
    const blindAllDone = blindQuestions.length > 0 && blindSolvedCount === blindQuestions.length
    
    const allDone = solvedCount >= threshold || blindAllDone
    const newStatus = allDone ? 'completed' : 'not_started'
    const currentStatus = progress?.dsa_progress?.[topic] || 'not_started'

    if (currentStatus !== newStatus) {
      try {
        // Optimistic UI updates
        if (progress) {
          setProgress({
            ...progress,
            dsa_progress: { ...progress.dsa_progress, [topic]: newStatus }
          })
        }
        await api.post('/api/coding/dsa', { topic, status: newStatus })
        
        // Refresh placement readiness
        const readRes = await api.get('/api/placement/readiness')
        setReadiness(readRes.data)
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Checkbox topics toggle
  const handleToggleDSATopic = async (topic: string, currentStatus: string, isBlind = false) => {
    const nextStatus = currentStatus === 'completed' ? 'not_started' : 'completed'
    
    // Auto toggle all sub-questions to completed or not_started
    const questions = isBlind ? (BLIND75_QUESTIONS[topic] || []) : (DSA_QUESTIONS[topic] || [])
    const nextCompleted = { ...completedQuestions }
    
    try {
      if (progress) {
        setProgress({
          ...progress,
          dsa_progress: { ...progress.dsa_progress, [topic]: nextStatus }
        })
      }
      
      // Update DB for topic
      await api.post('/api/coding/dsa', { topic, status: nextStatus })
      
      // Update DB for each question sequentially
      for (const q of questions) {
        nextCompleted[q.id] = (nextStatus === 'completed')
        await api.post('/api/coding/dsa', { topic: q.id, status: nextStatus })
      }
      
      setCompletedQuestions(nextCompleted)
      localStorage.setItem('completed_mock_questions', JSON.stringify(nextCompleted))

      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      fetchProgress()
    }
  }

  // Slider change for Core subjects
  const handleCoreSliderChange = async (subject: string, percentage: number) => {
    try {
      if (progress) {
        setProgress({
          ...progress,
          core_subjects_progress: { ...progress.core_subjects_progress, [subject]: percentage }
        })
      }
      await api.post('/api/coding/core-subjects', { subject, completion_percentage: percentage })
      
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  // Slider change for Aptitude subjects
  const handleAptitudeSliderChange = async (topic: string, percentage: number) => {
    try {
      if (progress) {
        setProgress({
          ...progress,
          aptitude_progress: { ...progress.aptitude_progress, [topic]: percentage }
        })
      }
      await api.post('/api/coding/aptitude', { topic, completion_percentage: percentage })
      
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  // Add Project
  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projName.trim()) return

    try {
      await api.post('/api/coding/project', {
        name: projName,
        description: projDesc || undefined,
        completion_percentage: projProgress
      })
      setProjName('')
      setProjDesc('')
      setProjProgress(50)
      setShowAddProject(false)
      await fetchProgress()
    } catch (e) {
      console.error(e)
    }
  }

  // Adjust Project Slider / Status
  const handleProjectSliderChange = async (name: string, desc: string, val: number) => {
    try {
      await api.post('/api/coding/project', {
        name,
        description: desc,
        completion_percentage: val
      })
      if (progress) {
        setProgress({
          ...progress,
          projects_progress: progress.projects_progress.map(p => 
            p.name === name ? { ...p, completion_percentage: val } : p
          )
        })
      }
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  // Delete Project
  const handleDeleteProject = async (name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      await api.delete(`/api/coding/project/${encodeURIComponent(name)}`)
      if (progress) {
        setProgress({
          ...progress,
          projects_progress: progress.projects_progress.filter(p => p.name !== name)
        })
      }
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error("Failed to delete project:", e)
    }
  }

  // Career settings
  const handleCareerUpdate = async (field: 'resume_status' | 'mock_interview_score', value: any) => {
    try {
      await api.post('/api/coding/career-state', { [field]: value })
      if (progress) {
        setProgress({ ...progress, [field]: value })
      }
      const readRes = await api.get('/api/placement/readiness')
      setReadiness(readRes.data)
    } catch (e) {
      console.error(e)
    }
  }

  if (loading && !progress) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  // Progress status colors & labels helper
  const getProgressStyles = (val: number) => {
    if (val < 40) return { text: 'Needs Revision', color: 'text-rose-500', bar: 'bg-rose-500', border: 'border-rose-500/20', bg: 'bg-rose-500/5' }
    if (val < 75) return { text: 'Intermediate', color: 'text-amber-500', bar: 'bg-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-500/5' }
    return { text: 'Mastered', color: 'text-emerald-500', bar: 'bg-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' }
  }

  // Readiness badge color
  const getReadinessBadge = (level: string) => {
    switch (level) {
      case 'Excellent':
        return 'bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/35 text-white'
      case 'High':
        return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
      case 'Medium':
        return 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
      default:
        return 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
    }
  }

  // Group projects for Kanban Board
  const backlogProjects = progress?.projects_progress.filter(p => p.completion_percentage === 0) || []
  const inProgressProjects = progress?.projects_progress.filter(p => p.completion_percentage > 0 && p.completion_percentage < 100) || []
  const completedProjects = progress?.projects_progress.filter(p => p.completion_percentage === 100) || []

  // Check milestones completed (Gantt checklist)
  const totalCompletedDsa = progress ? Object.values(progress.dsa_progress).filter(v => v === 'completed').length : 0
  const avgCoreCS = progress ? Object.values(progress.core_subjects_progress).reduce((a, b) => a + b, 0) / 4 : 0
  const hasProject = progress ? progress.projects_progress.some(p => p.completion_percentage === 100) : false

  const milestonesList = [
    {
      id: "m_1",
      title: "Draft ATS-Friendly Resume",
      desc: "Prepare details, technical skills & coding profiles link.",
      checked: progress ? progress.resume_status !== 'not_started' : false,
      badge: "Resume",
      badgeColor: "bg-blue-500/10 text-blue-500",
      action: "Set status to In Progress"
    },
    {
      id: "m_2",
      title: "Finalize & Verify Resume Review",
      desc: "ATS-optimized formatting reviewed by peer or mentor.",
      checked: progress ? progress.resume_status === 'reviewed' : false,
      badge: "Resume",
      badgeColor: "bg-blue-500/10 text-blue-500",
      action: "Set status to Reviewed"
    },
    {
      id: "m_3",
      title: "Launch Flagship Development Project",
      desc: "Complete 100% progress on at least one development project.",
      checked: hasProject,
      badge: "Portfolio",
      badgeColor: "bg-purple-500/10 text-purple-500",
      action: "Add project and slider to 100%"
    },
    {
      id: "m_4",
      title: "Core CS Interview Mastery (avg > 75%)",
      desc: "Achieve 75%+ overall progress across DBMS, OS, CN and OOP subjects.",
      checked: avgCoreCS >= 75,
      badge: "Theoretical Core",
      badgeColor: "bg-pink-500/10 text-pink-500",
      action: "Slide Core subject scores up"
    },
    {
      id: "m_5",
      title: "Master Fundamental DSA Topics (6+ Completed)",
      desc: "Solve all flagship practice questions for 6+ coding topics.",
      checked: totalCompletedDsa >= 6,
      badge: "Problem Solving",
      badgeColor: "bg-emerald-500/10 text-emerald-500",
      action: "Check off sub-questions below"
    },
    {
      id: "m_6",
      title: "Pass Mock Interview Practice Session (Score > 70%)",
      desc: "Simulate a live coder mock round and log a score above 70%.",
      checked: progress ? progress.mock_interview_score >= 70 : false,
      badge: "Mock Interview",
      badgeColor: "bg-amber-500/10 text-amber-500",
      action: "Slide Mock Interview to 70%+"
    }
  ]

  // Recomended topic algorithm
  const getNextRecommendedTopic = () => {
    if (!progress) return null
    const order = [
      "Arrays", "Strings", "Linked Lists", "Stack", "Queue", 
      "Recursion", "Trees", "Graphs", "Heap", "Backtracking", 
      "Greedy", "Dynamic Programming"
    ]
    for (const topic of order) {
      if (progress.dsa_progress[topic] !== 'completed') {
        return topic
      }
    }
    return null
  }
  const recommendedTopic = getNextRecommendedTopic()

  return (
    <div className="flex-1 p-4 md:p-8 space-y-8 max-w-6xl mx-auto w-full min-h-screen">
      
      {/* Page Title & Main Sync Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border-light dark:border-border-dark pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-350 bg-clip-text text-transparent flex items-center gap-2.5">
            <GraduationCap className="text-primary w-8 h-8" />
            <span>Placement Prep Hub</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Build your coding profile, manage portfolio projects, track conceptual CS topics, and review AI suggestions.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={() => setShowSyncPanel(!showSyncPanel)}
            className="flex-1 md:flex-none glass-card border-slate-300 dark:border-slate-800 hover:border-primary/30 transition-all font-semibold text-slate-700 dark:text-slate-200 px-4 py-2 text-xs flex items-center justify-center gap-2"
          >
            <Compass size={14} />
            <span>Handles & Accounts</span>
          </button>
          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="flex-1 md:flex-none bg-primary hover:bg-primary-dark text-white font-semibold px-4 py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-primary/10 disabled:opacity-50"
          >
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Profiles'}</span>
          </button>
        </div>
      </div>

      {/* Profile Sync Overlay (Collapsible) */}
      {showSyncPanel && (
        <div className="glass-card p-6 animate-fade-in-up border-primary/20 bg-primary/5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Star className="text-primary w-4 h-4" /> Connect Coding Profiles
            </h3>
            <button onClick={() => setShowSyncPanel(false)} className="text-xs text-slate-400 hover:text-slate-200">Close</button>
          </div>
          <form onSubmit={handleSyncUsernames} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">LeetCode Username</label>
              <input
                type="text"
                placeholder="e.g. janesmith"
                value={leetcode}
                onChange={(e) => setLeetcode(e.target.value)}
                className="glass-input text-xs py-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">CodeChef Username</label>
              <input
                type="text"
                placeholder="e.g. chef_jane"
                value={codechef}
                onChange={(e) => setCodechef(e.target.value)}
                className="glass-input text-xs py-2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">HackerRank Username</label>
              <input
                type="text"
                placeholder="e.g. hrank_jane"
                value={hackerrank}
                onChange={(e) => setHackerrank(e.target.value)}
                className="glass-input text-xs py-2"
              />
            </div>
            <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={syncing}
                className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2"
              >
                <Send size={12} />
                <span>Save & Sync Handles</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PREMIUM HEADER GRID: Score Card & suggestions */}
      {readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Readiness Circle progress card */}
          <div className="glass-card p-6 flex flex-col items-center justify-between border-slate-200 dark:border-slate-800/80">
            <div className="w-full flex justify-between items-center pb-3 border-b border-border-light dark:border-border-dark mb-4">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Placement Score</h3>
              <span className={`text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-full ${getReadinessBadge(readiness.readiness_level)}`}>
                {readiness.readiness_level} Readiness
              </span>
            </div>

            {/* Circular Gauge */}
            <div className="relative flex items-center justify-center my-4">
              <svg className="w-36 h-36 transform -rotate-90">
                {/* Background Ring */}
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-slate-100 dark:stroke-slate-900"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Foreground Fill */}
                <circle
                  cx="72"
                  cy="72"
                  r="62"
                  className="stroke-primary transition-all duration-700 ease-out"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={389.5}
                  strokeDashoffset={389.5 - (389.5 * readiness.score) / 100}
                  strokeLinecap="round"
                />
              </svg>
              {/* Score Value Overlay */}
              <div className="absolute flex flex-col items-center text-center">
                <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">{readiness.score}%</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Readiness</span>
              </div>
            </div>

            {/* Score Breakdowns */}
            <div className="w-full space-y-2 mt-4 pt-4 border-t border-border-light dark:border-border-dark text-[11px] font-bold text-slate-500">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div className="flex justify-between items-center">
                  <span>DSA (30m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.dsa_score}/30</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Projects (15m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.projects_score}/15</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>CS Core (20m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.core_subjects_score}/20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Resume (5m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.resume_score}/5</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Aptitude (20m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.aptitude_score}/20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Mock (10m):</span>
                  <span className="text-slate-800 dark:text-slate-350">{readiness.mock_interview_score}/10</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommended suggestions & checklist panel */}
          <div className="lg:col-span-2 glass-card p-6 flex flex-col justify-between border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-border-light dark:border-border-dark mb-4">
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Activity size={16} className="text-primary animate-pulse" />
                  <span>AI Preparation Actions</span>
                </h3>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Dynamic Advice</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {readiness.suggestions.map((sug, idx) => (
                  <div 
                    key={idx} 
                    className="p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 bg-slate-500/5 hover:bg-slate-500/10 transition-all flex items-start gap-3 text-xs"
                  >
                    <div className="mt-0.5 p-1 bg-primary/10 rounded-lg text-primary shrink-0">
                      <Star size={12} className="fill-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Action {idx + 1}</span>
                      <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{sug}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's Target Callout */}
            {recommendedTopic && (
              <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-xl text-primary">
                    <Clock size={16} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Recommended Next Step</span>
                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200">Master & solve questions for "{recommendedTopic}"</h4>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setExpandedCategory(
                      DSA_CATEGORIES.Fundamentals.includes(recommendedTopic) ? "Fundamentals" :
                      DSA_CATEGORIES["Data Structures"].includes(recommendedTopic) ? "Data Structures" : "Algorithms"
                    );
                    setExpandedTopic(recommendedTopic);
                    const el = document.getElementById("dsa-sections-container");
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="bg-primary hover:bg-primary-dark text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <span>Solve now</span>
                  <ArrowUpRight size={10} />
                </button>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MIDDLE SECTION COMPACT STATS GRID: Coding platform sync numbers & streaks */}
      {progress && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Streaks Widget */}
          <div className="glass-card p-5 border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Flame size={12} className="text-amber-500 fill-amber-500/10" /> Coding Streaks
              </span>
              <h4 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">{progress.current_streak} days</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Longest: {progress.longest_streak} days</p>
            </div>
            <div className="p-3 bg-amber-500/10 rounded-2xl text-amber-500 shadow-inner">
              <Flame size={24} className="fill-amber-500/10" />
            </div>
          </div>

          {/* LeetCode stats */}
          <div className="glass-card p-5 border-slate-200 dark:border-slate-800/80 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">LeetCode Solved</span>
              <span className="text-[10px] font-bold text-slate-500">{progress.leetcode_username || 'Not Synced'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <h4 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                {progress.easy_solved + progress.medium_solved + progress.hard_solved}
              </h4>
              <div className="flex gap-1.5 text-[9px] font-bold uppercase">
                <span className="text-emerald-500">{progress.easy_solved} E</span>
                <span className="text-primary">{progress.medium_solved} M</span>
                <span className="text-rose-500">{progress.hard_solved} H</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-900 h-1.5 rounded-full overflow-hidden flex">
              <div className="bg-emerald-500 h-full" style={{ width: `${progress.easy_solved ? (progress.easy_solved / Math.max(1, progress.easy_solved + progress.medium_solved + progress.hard_solved)) * 100 : 0}%` }}></div>
              <div className="bg-primary h-full" style={{ width: `${progress.medium_solved ? (progress.medium_solved / Math.max(1, progress.easy_solved + progress.medium_solved + progress.hard_solved)) * 100 : 0}%` }}></div>
              <div className="bg-rose-500 h-full" style={{ width: `${progress.hard_solved ? (progress.hard_solved / Math.max(1, progress.easy_solved + progress.medium_solved + progress.hard_solved)) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* CodeChef profile details */}
          <div className="glass-card p-5 border-slate-200 dark:border-slate-800/80 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">CodeChef</span>
              <span className="text-[10px] font-bold text-slate-500">{progress.codechef_username || 'Not Synced'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Status Profile</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${progress.codechef_username ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-900 text-slate-500'}`}>
                {progress.codechef_username ? 'Active' : 'Unlinked'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Automated Sync Enabled</p>
          </div>

          {/* HackerRank profile details */}
          <div className="glass-card p-5 border-slate-200 dark:border-slate-800/80 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">HackerRank</span>
              <span className="text-[10px] font-bold text-slate-500">{progress.hackerrank_username || 'Not Synced'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-350">Status Profile</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${progress.hackerrank_username ? 'bg-primary/10 text-primary' : 'bg-slate-200 dark:bg-slate-900 text-slate-500'}`}>
                {progress.hackerrank_username ? 'Active' : 'Unlinked'}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold uppercase">Automated Sync Enabled</p>
          </div>
        </div>
      )}

      {/* DYNAMIC SECTIONS LAYOUT */}
      <div className="space-y-8">
        
        {/* DSA Accordion & Checklists - Full width */}
        <div id="dsa-sections-container" className="space-y-6">
          <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckSquareIcon size={18} className="text-primary" />
                <span>DSA-150 (NeetCode 150 Roadmap)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Master 150 essential coding interview problems categorized across key patterns. Complete target questions to master topics.
              </p>
            </div>

            {/* Accordion Categories */}
            <div className="space-y-3.5">
              {(Object.keys(DSA_CATEGORIES) as Array<keyof typeof DSA_CATEGORIES>).map((catName) => {
                const isCatExpanded = expandedCategory === catName
                const topics = DSA_CATEGORIES[catName]
                
                // Count category progress
                const completedCount = topics.filter(t => progress?.dsa_progress?.[t] === 'completed').length
                const catProgressPercent = Math.round((completedCount / topics.length) * 100)

                return (
                  <div key={catName} className="border border-slate-200/60 dark:border-slate-850 dark:border-slate-800 rounded-xl overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => setExpandedCategory(isCatExpanded ? null : catName)}
                      className="w-full flex items-center justify-between p-4 bg-slate-500/5 dark:bg-slate-900/40 hover:bg-slate-500/10 dark:hover:bg-slate-900/60 text-xs font-extrabold transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800 dark:text-slate-200 text-sm">{catName}</span>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {completedCount}/{topics.length} Mastered
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 bg-slate-200 dark:bg-slate-900 h-1 rounded-full hidden sm:block overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${catProgressPercent}%` }}></div>
                        </div>
                        {isCatExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Category topics list */}
                    {isCatExpanded && (
                      <div className="p-3 bg-transparent border-t border-slate-200/30 dark:border-slate-800/40 space-y-2">
                        {topics.map((topic) => {
                          const isTopicCompleted = progress?.dsa_progress?.[topic] === 'completed'
                          const isTopicExpanded = expandedTopic === topic
                          const questions = DSA_QUESTIONS[topic] || []
                          
                          // Count questions completed locally
                          const solvedQs = questions.filter(q => completedQuestions[q.id]).length

                          return (
                            <div 
                              key={topic} 
                              className={`rounded-xl border transition-all ${
                                isTopicCompleted 
                                  ? 'border-emerald-500/20 bg-emerald-500/5' 
                                  : isTopicExpanded 
                                    ? 'border-primary/25 bg-slate-500/5' 
                                    : 'border-slate-200/40 dark:border-slate-800/40 bg-slate-500/[0.01]'
                              }`}
                            >
                              {/* Topic line */}
                              <div className="flex items-center justify-between p-3">
                                <button
                                  onClick={() => handleToggleDSATopic(topic, progress?.dsa_progress?.[topic] || 'not_started')}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 transition-all"
                                  title={isTopicCompleted ? 'Mark incomplete' : 'Mark all questions done'}
                                >
                                  <CheckCircle2 
                                    size={18} 
                                    className={isTopicCompleted ? 'text-emerald-500 fill-emerald-500/10' : 'text-slate-300 dark:text-slate-750'} 
                                  />
                                </button>

                                <button
                                  onClick={() => setExpandedTopic(isTopicExpanded ? null : topic)}
                                  className="flex-1 flex justify-between items-center text-left text-xs font-bold px-3 py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                >
                                  <span>{topic}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-200/30 dark:bg-slate-900/60 px-2 py-0.5 rounded-full">
                                      {solvedQs}/{questions.length} Solved
                                    </span>
                                    {isTopicExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                  </div>
                                </button>
                              </div>

                              {/* Collapsible Questions list */}
                              {isTopicExpanded && (
                                <div className="p-3 pt-0 border-t border-slate-200/20 dark:border-slate-800/20 space-y-2 bg-slate-500/[0.02]">
                                  {questions.map((q) => {
                                    const isQChecked = !!completedQuestions[q.id]
                                    return (
                                      <div 
                                        key={q.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-750 transition-all"
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => handleToggleQuestion(topic, q.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                              isQChecked 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                            }`}
                                          >
                                            {isQChecked && <Check size={10} strokeWidth={3} />}
                                          </button>
                                          <span className={`${isQChecked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {q.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-500' :
                                            q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                                          }`}>
                                            {q.difficulty}
                                          </span>
                                          <button
                                            onClick={() => askAIAboutQuestion(q.title, `${topic} coding problem`)}
                                            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-primary hover:text-primary-dark transition-all flex items-center justify-center"
                                            title="Ask AI to explain this problem"
                                          >
                                            <Brain size={12} />
                                          </button>

                                          {/* YouTube Link Toggle/View */}
                                          {youtubeLinks[q.id] ? (
                                            <div className="flex items-center">
                                              <a 
                                                href={youtubeLinks[q.id]}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-all flex items-center justify-center"
                                                title="Watch YouTube Solution"
                                              >
                                                <Youtube size={12} />
                                              </a>
                                              <button
                                                onClick={() => {
                                                  const newLink = prompt("Edit YouTube solution link for this question:", youtubeLinks[q.id])
                                                  if (newLink !== null) {
                                                    handleSaveYoutubeLink(q.id, newLink)
                                                  }
                                                }}
                                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                                                title="Edit YouTube link"
                                              >
                                                <Edit size={10} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                const newLink = prompt("Add YouTube solution link for this question:")
                                                if (newLink !== null) {
                                                  handleSaveYoutubeLink(q.id, newLink)
                                                }
                                              }}
                                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition-all flex items-center justify-center"
                                              title="Add YouTube Solution Link"
                                            >
                                              <Youtube size={12} />
                                            </button>
                                          )}

                                          <a 
                                            href={q.link}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 transition-all"
                                            title="Solve on Leetcode"
                                          >
                                            <ExternalLink size={12} />
                                          </a>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

          </div>

          {/* Blind 75 Accordion & Checklists - Curated Roadmap */}
          <div id="blind75-sections-container" className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <CheckSquareIcon size={18} className="text-primary" />
                <span>Blind 75 (LeetCode Curated Roadmap)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Solve the famous Blind 75 curated DSA problems. Perfect for a quick, high-impact review of key algorithmic patterns.
              </p>
            </div>

            {/* Accordion Categories */}
            <div className="space-y-3.5">
              {(Object.keys(DSA_CATEGORIES) as Array<keyof typeof DSA_CATEGORIES>).map((catName) => {
                const isCatExpanded = expandedBlindCategory === catName
                const topics = DSA_CATEGORIES[catName]
                
                // Count category progress using BLIND75_QUESTIONS
                // Only consider topics that exist in BLIND75_QUESTIONS and have questions
                const activeTopics = topics.filter(t => BLIND75_QUESTIONS[t] && BLIND75_QUESTIONS[t].length > 0)
                if (activeTopics.length === 0) return null

                const completedCount = activeTopics.filter(t => progress?.dsa_progress?.[t] === 'completed').length
                const catProgressPercent = Math.round((completedCount / activeTopics.length) * 100)

                return (
                  <div key={catName} className="border border-slate-200/60 dark:border-slate-850 dark:border-slate-800 rounded-xl overflow-hidden">
                    {/* Category Header */}
                    <button
                      onClick={() => setExpandedBlindCategory(isCatExpanded ? null : catName)}
                      className="w-full flex items-center justify-between p-4 bg-slate-500/5 dark:bg-slate-900/40 hover:bg-slate-500/10 dark:hover:bg-slate-900/60 text-xs font-extrabold transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-slate-800 dark:text-slate-200 text-sm">{catName}</span>
                        <span className="text-[10px] text-slate-400 font-bold bg-slate-200/50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                          {completedCount}/{activeTopics.length} Mastered
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-16 bg-slate-200 dark:bg-slate-900 h-1 rounded-full hidden sm:block overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: `${catProgressPercent}%` }}></div>
                        </div>
                        {isCatExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Category topics list */}
                    {isCatExpanded && (
                      <div className="p-3 bg-transparent border-t border-slate-200/30 dark:border-slate-800/40 space-y-2">
                        {activeTopics.map((topic) => {
                          const isTopicCompleted = progress?.dsa_progress?.[topic] === 'completed'
                          const isTopicExpanded = expandedBlindTopic === topic
                          const questions = BLIND75_QUESTIONS[topic] || []
                          
                          // Count questions completed locally
                          const solvedQs = questions.filter(q => completedQuestions[q.id]).length

                          return (
                            <div 
                              key={topic} 
                              className={`rounded-xl border transition-all ${
                                isTopicCompleted 
                                  ? 'border-emerald-500/20 bg-emerald-500/5' 
                                  : isTopicExpanded 
                                    ? 'border-primary/25 bg-slate-500/5' 
                                    : 'border-slate-200/40 dark:border-slate-800/40 bg-slate-500/[0.01]'
                              }`}
                            >
                              {/* Topic line */}
                              <div className="flex items-center justify-between p-3">
                                <button
                                  onClick={() => handleToggleDSATopic(topic, progress?.dsa_progress?.[topic] || 'not_started', true)}
                                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-850 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 transition-all"
                                  title={isTopicCompleted ? 'Mark incomplete' : 'Mark all questions done'}
                                >
                                  <CheckCircle2 
                                    size={18} 
                                    className={isTopicCompleted ? 'text-emerald-500 fill-emerald-500/10' : 'text-slate-300 dark:text-slate-750'} 
                                  />
                                </button>

                                <button
                                  onClick={() => setExpandedBlindTopic(isTopicExpanded ? null : topic)}
                                  className="flex-1 flex justify-between items-center text-left text-xs font-bold px-3 py-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                                >
                                  <span>{topic}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-400 font-bold bg-slate-200/30 dark:bg-slate-900/60 px-2 py-0.5 rounded-full">
                                      {solvedQs}/{questions.length} Solved
                                    </span>
                                    {isTopicExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                                  </div>
                                </button>
                              </div>

                              {/* Collapsible Questions list */}
                              {isTopicExpanded && (
                                <div className="p-3 pt-0 border-t border-slate-200/20 dark:border-slate-800/20 space-y-2 bg-slate-500/[0.02]">
                                  {questions.map((q) => {
                                    const isQChecked = !!completedQuestions[q.id]
                                    return (
                                      <div 
                                        key={q.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-750 transition-all"
                                      >
                                        <div className="flex items-center gap-3">
                                          <button
                                            onClick={() => handleToggleQuestion(topic, q.id)}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                              isQChecked 
                                                ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                            }`}
                                          >
                                            {isQChecked && <Check size={10} strokeWidth={3} />}
                                          </button>
                                          <span className={`${isQChecked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {q.title}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                            q.difficulty === 'Easy' ? 'bg-emerald-500/10 text-emerald-500' :
                                            q.difficulty === 'Medium' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                                          }`}>
                                            {q.difficulty}
                                          </span>
                                          <button
                                            onClick={() => askAIAboutQuestion(q.title, `${topic} coding problem`)}
                                            className="p-1 hover:bg-slate-250 dark:hover:bg-slate-800 rounded text-primary hover:text-primary-dark transition-all flex items-center justify-center"
                                            title="Ask AI to explain this problem"
                                          >
                                            <Brain size={12} />
                                          </button>

                                          {/* YouTube Link Toggle/View */}
                                          {youtubeLinks[q.id] ? (
                                            <div className="flex items-center">
                                              <a 
                                                href={youtubeLinks[q.id]}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="p-1 hover:bg-red-500/10 rounded text-red-500 transition-all flex items-center justify-center"
                                                title="Watch YouTube Solution"
                                              >
                                                <Youtube size={12} />
                                              </a>
                                              <button
                                                onClick={() => {
                                                  const newLink = prompt("Edit YouTube solution link for this question:", youtubeLinks[q.id])
                                                  if (newLink !== null) {
                                                    handleSaveYoutubeLink(q.id, newLink)
                                                  }
                                                }}
                                                className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                                                title="Edit YouTube link"
                                              >
                                                <Edit size={10} />
                                              </button>
                                            </div>
                                          ) : (
                                            <button
                                              onClick={() => {
                                                const newLink = prompt("Add YouTube solution link for this question:")
                                                if (newLink !== null) {
                                                  handleSaveYoutubeLink(q.id, newLink)
                                                }
                                              }}
                                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-red-500 transition-all flex items-center justify-center"
                                              title="Add YouTube Solution Link"
                                            >
                                              <Youtube size={12} />
                                            </button>
                                          )}

                                          <a 
                                            href={q.link}
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 transition-all"
                                            title="Solve on Leetcode"
                                          >
                                            <ExternalLink size={12} />
                                          </a>
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* CS Core & Aptitude Mastery - Two column grid below DSA-150 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Core subjects sliders */}
          <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">CS Core Foundations</h3>
              <p className="text-xs text-slate-500 mt-1">Interview theoretical core review progress.</p>
            </div>

            <div className="space-y-4">
              {['DBMS', 'OS', 'CN', 'OOP'].map((sub) => {
                const val = progress?.core_subjects_progress?.[sub] || 0
                const styles = getProgressStyles(val)
                const isExpanded = expandedCoreSubject === sub
                const questionsList = progress?.core_subjects_questions?.[sub] || CS_QUESTIONS[sub] || []
                
                return (
                  <div 
                    key={sub} 
                    className={`rounded-xl border transition-all ${styles.border} ${styles.bg} overflow-hidden`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => setExpandedCoreSubject(isExpanded ? null : sub)}
                      className="w-full text-left p-3.5 flex flex-col gap-2 hover:bg-slate-500/5 transition-all"
                    >
                      <div className="flex justify-between items-center text-xs font-bold w-full">
                        <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Star size={12} className={val >= 75 ? "text-amber-500 fill-amber-500/10" : "text-slate-400"} />
                          {sub}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${styles.color}`}>
                            {styles.text}
                          </span>
                          <span className={`${styles.color}`}>{val}%</span>
                          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                      </div>
                      
                      {/* Custom visual progress bar */}
                      <div className="w-full bg-slate-200/50 dark:bg-slate-900/60 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${styles.bar} transition-all duration-300`} 
                          style={{ width: `${val}%` }} 
                        />
                      </div>
                    </button>

                    {/* Questions checklist (Expanded panel) */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-200/20 dark:border-slate-800/20 space-y-2 bg-slate-500/[0.02]">
                        <div className="space-y-2 pt-2">
                          {questionsList.map((q, idx) => {
                            const isQChecked = isCSQuestionChecked(sub, idx)
                            return (
                              <div 
                                key={idx}
                                onClick={() => handleToggleCSQuestion(sub, idx)}
                                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-750 transition-all cursor-pointer select-none"
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleCSQuestion(sub, idx)
                                    }}
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                      isQChecked 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                    }`}
                                  >
                                    {isQChecked && <Check size={10} strokeWidth={3} />}
                                  </button>
                                  <span className={`leading-relaxed ${
                                    isQChecked 
                                      ? 'line-through text-slate-400 dark:text-slate-550' 
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {q}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    askAIAboutQuestion(q, `${sub} Subject`)
                                  }}
                                  className="text-[10px] font-bold text-primary dark:text-primary-light hover:bg-primary/10 px-2 py-1 rounded transition-all flex items-center gap-1 border border-primary/20 flex-shrink-0"
                                  title="Ask AI to explain this question"
                                >
                                  <Brain size={10} />
                                  <span>Ask AI</span>
                                </button>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* AI Regeneration Button */}
                        <div className="pt-2 border-t border-slate-200/10 dark:border-slate-800/10 flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-semibold italic flex items-center gap-1">
                            <Activity size={10} className="text-primary animate-pulse" />
                            Dynamic AI-powered questions
                          </span>
                          <button
                            disabled={generatingSubject !== null}
                            onClick={() => handleRegenerateCSQuestions(sub)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-extrabold px-3 py-1.5 rounded-lg text-[9px] flex items-center gap-1 transition-all"
                          >
                            <RefreshCw size={10} className={generatingSubject === sub ? "animate-spin" : ""} />
                            {generatingSubject === sub ? "Generating..." : "Regenerate with AI"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Aptitudes progress */}
          <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-5">
            <div>
              <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100">Aptitude & Verbal Mastery</h3>
              <p className="text-xs text-slate-500 mt-1">Track completion of Aptitude screening rounds.</p>
            </div>

            <div className="space-y-4">
              {["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability"].map((topic) => {
                const val = progress?.aptitude_progress?.[topic] || 0
                const styles = getProgressStyles(val)
                const isExpanded = expandedAptitudeTopic === topic
                const questionsList = progress?.aptitude_questions?.[topic] || APTITUDE_QUESTIONS[topic] || []

                return (
                  <div 
                    key={topic} 
                    className={`rounded-xl border transition-all ${styles.border} ${styles.bg} overflow-hidden`}
                  >
                    {/* Header */}
                    <button
                      onClick={() => setExpandedAptitudeTopic(isExpanded ? null : topic)}
                      className="w-full text-left p-3.5 flex flex-col gap-2 hover:bg-slate-500/5 transition-all"
                    >
                      <div className="flex justify-between items-center text-xs font-bold w-full">
                        <span className="text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Star size={12} className={val >= 75 ? "text-amber-500 fill-amber-500/10" : "text-slate-400"} />
                          {topic}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${styles.color}`}>
                            {styles.text}
                          </span>
                          <span className={`${styles.color}`}>{val}%</span>
                          {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                        </div>
                      </div>
                      
                      {/* Custom visual progress bar */}
                      <div className="w-full bg-slate-200/50 dark:bg-slate-900/60 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${styles.bar} transition-all duration-300`} 
                          style={{ width: `${val}%` }} 
                        />
                      </div>
                    </button>

                    {/* Questions checklist (Expanded panel) */}
                    {isExpanded && (
                      <div className="p-3 pt-0 border-t border-slate-200/20 dark:border-slate-800/20 space-y-2 bg-slate-500/[0.02]">
                        <div className="space-y-2 pt-2">
                          {questionsList.map((q, idx) => {
                            const isQChecked = isAptitudeQuestionChecked(topic, idx)
                            const parts = q.split(" || ")
                            const displayText = parts[0]
                            const extLink = parts[1]
                            const solveUrl = extLink && extLink.trim().startsWith('http') ? extLink.trim() : null

                            return (
                              <div 
                                key={idx}
                                onClick={() => handleToggleAptitudeQuestion(topic, idx)}
                                className="flex items-start justify-between gap-3 p-2.5 rounded-lg bg-white/40 dark:bg-slate-900/40 border border-slate-200/30 dark:border-slate-800/30 text-xs font-medium hover:border-slate-300 dark:hover:border-slate-750 transition-all cursor-pointer select-none"
                              >
                                <div className="flex items-start gap-3 flex-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleToggleAptitudeQuestion(topic, idx)
                                    }}
                                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                                      isQChecked 
                                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                                    }`}
                                  >
                                    {isQChecked && <Check size={10} strokeWidth={3} />}
                                  </button>
                                  <span className={`leading-relaxed ${
                                    isQChecked 
                                      ? 'line-through text-slate-400 dark:text-slate-550' 
                                      : 'text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {displayText}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  {solveUrl && (
                                    <a
                                      href={solveUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-[10px] font-bold text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-primary-light hover:bg-primary/10 px-2 py-1 rounded transition-all flex items-center gap-1 border border-slate-300 dark:border-slate-700"
                                      title="Solve on IndiaBIX"
                                    >
                                      <ExternalLink size={10} />
                                      <span>Solve</span>
                                    </a>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      askAIAboutQuestion(displayText, `${topic} Topic`)
                                    }}
                                    className="text-[10px] font-bold text-primary dark:text-primary-light hover:bg-primary/10 px-2 py-1 rounded transition-all flex items-center gap-1 border border-primary/20 flex-shrink-0"
                                    title="Ask AI to explain this question"
                                  >
                                    <Brain size={10} />
                                    <span>Ask AI</span>
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        
                        {/* AI Regeneration Button */}
                        <div className="pt-2 border-t border-slate-200/10 dark:border-slate-800/10 flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-semibold italic flex items-center gap-1">
                            <Activity size={10} className="text-primary animate-pulse" />
                            Dynamic AI-powered questions
                          </span>
                          <button
                            disabled={generatingAptitudeTopic !== null}
                            onClick={() => handleRegenerateAptitudeQuestions(topic)}
                            className="bg-primary/10 hover:bg-primary/20 text-primary dark:text-primary-light font-extrabold px-3 py-1.5 rounded-lg text-[9px] flex items-center gap-1 transition-all"
                          >
                            <RefreshCw size={10} className={generatingAptitudeTopic === topic ? "animate-spin" : ""} />
                            {generatingAptitudeTopic === topic ? "Generating..." : "Regenerate with AI"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

        </div>
      </div>

      {/* PORTFOLIO PROJECTS BOARD (Kanban columns implementation) */}
      <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Kanban size={18} className="text-primary" />
              <span>Portfolio Projects Board</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Organize and track your flagship portfolio projects. Shift columns instantly as your work progresses.
            </p>
          </div>
          <button
            onClick={() => setShowAddProject(!showAddProject)}
            className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold px-3 py-1.5 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus size={14} />
            <span>Add Project</span>
          </button>
        </div>

        {/* Add project form in-line */}
        {showAddProject && (
          <form onSubmit={handleAddProject} className="p-5 border border-primary/20 bg-primary/5 rounded-xl space-y-4 animate-fade-in-up">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Add Flagship Project</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">Project Title</label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Chatbot AI API"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="glass-input text-xs py-2"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400">Tech Stack & Description</label>
                <input
                  type="text"
                  placeholder="e.g. Node JS, React, Tailwind CSS"
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                  className="glass-input text-xs py-2"
                />
              </div>
              
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Project Status / Initial Progress</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl max-w-md">
                  {[
                    { label: 'Backlog (0%)', val: 0 },
                    { label: 'In Progress (50%)', val: 50 },
                    { label: 'Completed (100%)', val: 100 }
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setProjProgress(opt.val)}
                      className={`text-xs py-1.5 rounded-lg font-semibold transition-all ${
                        projProgress === opt.val
                          ? 'bg-primary text-white shadow-sm shadow-primary/20'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProject(false)}
                className="bg-transparent text-slate-400 font-bold px-3.5 py-1.5 rounded-lg text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white font-bold px-4 py-1.5 rounded-lg text-xs"
              >
                Save Project
              </button>
            </div>
          </form>
        )}

        {/* Kanban Board Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Backlog Column */}
          <div className="rounded-xl border border-rose-500/10 bg-rose-500/[0.01] p-4 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center pb-2 border-b border-rose-500/10 mb-3 text-xs font-extrabold text-rose-500">
              <div className="flex items-center gap-1.5">
                <FolderOpen size={14} />
                <span>Idea / Backlog</span>
              </div>
              <span className="bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px]">{backlogProjects.length}</span>
            </div>
            <div className="space-y-3 flex-1">
              {backlogProjects.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-650 text-[10px] text-center italic py-8 border border-dashed border-rose-500/5 rounded-lg">
                  No ideas in backlog. Add one!
                </div>
              ) : (
                backlogProjects.map((p) => (
                  <div key={p.name} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-md transition-all space-y-3 relative group">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <FolderOpen size={12} className="text-slate-400" />
                          {p.name}
                        </h5>
                        {p.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{p.description}</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteProject(p.name)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-all flex-shrink-0"
                        title="Delete project"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/30 dark:border-slate-800/30">
                      <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-950/60 px-2 py-0.5 rounded">0% (Idea)</span>
                      <button
                        onClick={() => handleProjectSliderChange(p.name, p.description, 50)}
                        className="text-[9px] font-extrabold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                      >
                        Start Project ➜
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="rounded-xl border border-amber-500/10 bg-amber-500/[0.01] p-4 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center pb-2 border-b border-amber-500/10 mb-3 text-xs font-extrabold text-amber-500">
              <div className="flex items-center gap-1.5">
                <Sliders size={14} />
                <span>In Progress</span>
              </div>
              <span className="bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px]">{inProgressProjects.length}</span>
            </div>
            <div className="space-y-3 flex-1">
              {inProgressProjects.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-650 text-[10px] text-center italic py-8 border border-dashed border-amber-500/5 rounded-lg">
                  No active projects. Move one here!
                </div>
              ) : (
                inProgressProjects.map((p) => (
                  <div key={p.name} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-amber-500/20 dark:border-amber-500/10 hover:border-amber-500/35 dark:hover:border-amber-500/20 hover:shadow-md transition-all space-y-3 relative group">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Sliders size={12} className="text-amber-500" />
                          {p.name}
                        </h5>
                        {p.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{p.description}</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteProject(p.name)}
                        className="text-slate-400 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-all flex-shrink-0"
                        title="Delete project"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {/* Progress visualizer */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[9px] font-bold text-amber-500">
                        <span>Development</span>
                        <span>{p.completion_percentage}% completed</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${p.completion_percentage}%` }}></div>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="99"
                        value={p.completion_percentage}
                        onChange={(e) => handleProjectSliderChange(p.name, p.description, parseInt(e.target.value))}
                        className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded appearance-none cursor-pointer accent-amber-500 mt-1"
                      />
                    </div>

                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/30 dark:border-slate-800/30 gap-1.5">
                      <button
                        onClick={() => handleProjectSliderChange(p.name, p.description, 0)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 transition-all"
                      >
                        ⬅ Reset to Idea
                      </button>
                      <button
                        onClick={() => handleProjectSliderChange(p.name, p.description, 100)}
                        className="text-[9px] font-extrabold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                      >
                        Complete ➜
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Column */}
          <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.01] p-4 flex flex-col min-h-[220px]">
            <div className="flex justify-between items-center pb-2 border-b border-emerald-500/10 mb-3 text-xs font-extrabold text-emerald-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>Completed</span>
              </div>
              <span className="bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px]">{completedProjects.length}</span>
            </div>
            <div className="space-y-3 flex-1">
              {completedProjects.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-650 text-[10px] text-center italic py-8 border border-dashed border-emerald-500/5 rounded-lg">
                  No completed projects yet. Finish one!
                </div>
              ) : (
                completedProjects.map((p) => (
                  <div key={p.name} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/20 dark:border-emerald-500/10 hover:border-emerald-500/35 dark:hover:border-emerald-500/20 hover:shadow-md transition-all space-y-3 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 shadow-md shadow-emerald-500/20"></div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          {p.name}
                          <Award size={12} className="text-amber-500" />
                        </h5>
                        {p.description && <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">{p.description}</p>}
                      </div>
                      <button 
                        onClick={() => handleDeleteProject(p.name)}
                        className="text-slate-405 hover:text-rose-500 p-1 rounded hover:bg-rose-500/10 transition-all flex-shrink-0"
                        title="Delete project"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    <div className="flex justify-between items-center pt-2.5 border-t border-slate-200/30 dark:border-slate-800/30">
                      <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg flex items-center gap-1">
                        <Check size={10} strokeWidth={3} /> Completed
                      </span>
                      <button
                        onClick={() => handleProjectSliderChange(p.name, p.description, 50)}
                        className="text-[9px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-355 transition-all"
                      >
                        ⬅ Reopen Project
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
 
      {/* MOCK INTERVIEW & COMPANY PREP */}
      <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <AwardIcon size={18} className="text-primary" />
              <span>Campus Placement: Mock Interview Prep</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Practise interview structures and rounds modeled after top campus recruiters and product companies.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-primary/10 border border-primary/20 px-3.5 py-2 rounded-xl text-primary font-bold">
            <span className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Overall Mock Prep</span>
            <span className="text-lg font-extrabold">{progress?.mock_interview_score || 0}%</span>
          </div>
        </div>

        {/* Company grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {(Object.keys(COMPANY_PREP_DATA) as Array<keyof typeof COMPANY_PREP_DATA>).map((companyId) => {
            const comp = COMPANY_PREP_DATA[companyId]
            const compProgress = getCompanyProgress(companyId)
            const isSelected = activeCompany === companyId

            return (
              <button
                key={companyId}
                onClick={() => setActiveCompany(isSelected ? null : companyId)}
                className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/5 scale-[1.02]' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-500/[0.01] hover:border-slate-350 dark:hover:border-slate-700 hover:bg-slate-500/5'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${comp.bgColor}`}>
                    {comp.logoText}
                  </span>
                  <span className="text-[10px] font-bold text-slate-405">
                    {comp.rounds.length} Rounds
                  </span>
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-250">{comp.name}</h4>
                  <div className="flex items-center gap-1.5 mt-2">
                    <div className="w-12 bg-slate-200 dark:bg-slate-900 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-300" 
                        style={{ width: `${compProgress}%` }} 
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-505">{compProgress}%</span>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Dynamic Rounds Accordion Panel */}
        {activeCompany && (
          <div className="p-5 border border-primary/20 bg-primary/[0.01] rounded-xl space-y-4 animate-fade-in-up">
            <div>
              <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary" />
                <span>{COMPANY_PREP_DATA[activeCompany].name} Placement Track</span>
              </h4>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-semibold">
                {COMPANY_PREP_DATA[activeCompany].description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {COMPANY_PREP_DATA[activeCompany].rounds.map((round) => {
                const isChecked = !!completedRounds[round.id]
                return (
                  <div
                    key={round.id}
                    className={`p-4 rounded-xl border transition-all space-y-3.5 ${
                      isChecked 
                        ? 'border-emerald-500/20 bg-emerald-500/[0.01]' 
                        : 'border-slate-200/60 dark:border-slate-800/80 bg-slate-500/[0.005]'
                    }`}
                  >
                    {/* Header: Title, Checkbox and Shuffle Action */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleRound(round.id)}
                          className={`mt-0.5 w-4.5 h-4.5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                            isChecked 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/20' 
                              : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                          title={isChecked ? "Mark round incomplete" : "Mark all round tasks completed"}
                        >
                          {isChecked && <Check size={11} strokeWidth={4} />}
                        </button>
                        <div className="space-y-0.5">
                          <span className={`text-xs font-bold ${isChecked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-800 dark:text-slate-205'}`}>
                            {round.name}
                          </span>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                            {round.desc}
                          </p>
                        </div>
                      </div>

                      {/* AI Shuffle button */}
                      <button
                        type="button"
                        disabled={shufflingRounds[round.id]}
                        onClick={() => handleShuffleRoundQuestions(activeCompany, round.id, round.name, round.desc)}
                        className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-primary transition-all flex items-center justify-center shrink-0"
                        title="Shuffle questions with AI"
                      >
                        <RefreshCw size={12} className={shufflingRounds[round.id] ? "animate-spin text-primary" : ""} />
                      </button>
                    </div>

                    {/* Sub-checklist: Actual Interview Questions & Scenarios */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-200/30 dark:border-slate-800/40 bg-slate-500/[0.005] p-2 rounded-lg">
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                        🎯 Mock Interview Checklist
                      </span>
                      
                      {shufflingRounds[round.id] ? (
                        <div className="py-4 flex flex-col items-center justify-center gap-1.5">
                          <div className="w-5.5 h-5.5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-[9px] font-semibold text-slate-405">AI Shuffling...</span>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {(roundQuestions[round.id] || DEFAULT_ROUND_QUESTIONS[round.id] || []).map((q, idx) => {
                            const qKey = `${round.id}_${idx}`
                            const isQChecked = !!completedSubQuestions[qKey]
                            const parts = q.split(" || ")
                            const displayText = parts[0]
                            const extLink = parts[1]
                            const solveUrl = extLink && extLink.trim().startsWith('http') ? extLink.trim() : null

                            return (
                              <div
                                key={idx}
                                onClick={() => handleToggleSubQuestion(round.id, idx)}
                                className={`p-2 rounded-lg border text-[10px] font-semibold flex items-start gap-2.5 cursor-pointer transition-all select-none ${
                                  isQChecked 
                                    ? 'border-emerald-500/20 bg-emerald-500/5' 
                                    : 'border-slate-200/40 dark:border-slate-850 dark:border-slate-800/30 bg-white/40 dark:bg-slate-900/40 hover:border-slate-355 dark:hover:border-slate-700'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleSubQuestion(round.id, idx)
                                  }}
                                  className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                                    isQChecked 
                                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                                      : 'border-slate-300 dark:border-slate-700'
                                  }`}
                                >
                                  {isQChecked && <Check size={8} strokeWidth={4} />}
                                </button>
                                <div className="flex-1 flex justify-between items-start gap-1">
                                  <span className={`${isQChecked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-750 dark:text-slate-355'}`}>
                                    {displayText}
                                  </span>
                                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                    {solveUrl && (
                                      <a
                                        href={solveUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="text-[9px] text-primary hover:underline font-extrabold flex items-center gap-0.5"
                                        title="Solve external problem"
                                      >
                                        <span>Solve</span>
                                        <ExternalLink size={8} />
                                      </a>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        askAIAboutQuestion(displayText, `${round.name} round for ${COMPANY_PREP_DATA[activeCompany].name}`)
                                      }}
                                      className="text-[9px] font-extrabold text-primary hover:underline flex items-center gap-0.5"
                                      title="Ask AI to explain this question"
                                    >
                                      <span>Ask AI</span>
                                      <Brain size={8} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* CAREER MILESTONES & SCHEDULING (Gantt Checklist & Resume/Mock sliders) */}
      <div className="glass-card p-6 border-slate-200 dark:border-slate-800/80 space-y-6">
        <div>
          <h3 className="font-extrabold text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            <span>Milestones & Timeline Scheduler</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Track general mock interview prep scores and resume reviews. Complete checklist items to hit your deadlines.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Sliders selectors */}
          <div className="glass-card p-5 border-slate-200/40 dark:border-slate-800/40 space-y-5 lg:col-span-1">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Settings & State</h4>
            
            {/* Resume status & AI Uploader */}
            <div className="space-y-3 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/80 bg-slate-500/5">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                <FileText size={14} className="text-primary" />
                <span>Resume Optimizer & ATS Audit</span>
              </label>

              {/* Status Display Badge */}
              <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/30 dark:border-slate-800/30">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Status</span>
                <span className="text-[11px] font-extrabold text-primary">
                  {progress?.resume_status === 'reviewed' ? '✅ Reviewed' :
                   progress?.resume_status === 'completed' ? '📝 Completed' :
                   progress?.resume_status === 'in_progress' ? '✍️ In Progress' : '❌ Not Started'}
                </span>
              </div>

              {/* Upload input & Dropzone */}
              {!resumeAnalyzing && !readiness?.resume_ats_score && (
                <div className="border border-dashed border-slate-350 dark:border-slate-750 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-slate-500/5 transition-all relative cursor-pointer group">
                  <input
                    type="file"
                    accept=".pdf,.txt"
                    onChange={handleResumeUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud size={24} className="text-slate-400 group-hover:text-primary transition-all" />
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-755 dark:text-slate-300">Drag & drop or Click to upload</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">Supports PDF, TXT (Max 5MB)</p>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {resumeAnalyzing && (
                <div className="border border-slate-200/50 dark:border-slate-800/80 rounded-xl p-6 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-305">Auditing with AI...</p>
                    <p className="text-[9px] text-slate-405 mt-0.5">Running ATS scan & checks</p>
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {resumeError && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-bold flex items-center gap-1.5">
                  <AlertTriangle size={12} className="shrink-0" />
                  <span>{resumeError}</span>
                </div>
              )}

              {/* Audit Results Panel */}
              {!resumeAnalyzing && readiness?.resume_ats_score !== undefined && readiness.resume_ats_score > 0 && (
                <div className="space-y-3.5 animate-fade-in">
                  
                  {/* ATS Score Indicator */}
                  <div className="flex items-center justify-between bg-primary/5 p-3 rounded-xl border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-primary animate-pulse" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">AI ATS Score</span>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className={`text-xl font-extrabold ${
                        readiness.resume_ats_score >= 80 ? 'text-emerald-500' :
                        readiness.resume_ats_score >= 50 ? 'text-amber-500' : 'text-rose-500'
                      }`}>
                        {readiness.resume_ats_score}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold">/100</span>
                    </div>
                  </div>

                  {/* Highlights (+) & Improvements (-) lists */}
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    
                    {/* Strengths (+) */}
                    {readiness.resume_strengths && readiness.resume_strengths.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-500 font-bold flex items-center gap-1">
                          🟢 Positive Strengths (+)
                        </span>
                        <ul className="space-y-1">
                          {readiness.resume_strengths.map((str, i) => (
                            <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed pl-2.5 relative">
                              <span className="absolute left-0 top-1.5 w-1 h-1 bg-emerald-500 rounded-full" />
                              {str}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements (-) */}
                    {readiness.resume_improvements && readiness.resume_improvements.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-205/20 dark:border-slate-800/40">
                        <span className="text-[9px] uppercase tracking-wider text-rose-500 font-bold flex items-center gap-1">
                          🔴 Improvements Required (-)
                        </span>
                        <ul className="space-y-1">
                          {readiness.resume_improvements.map((imp, i) => (
                            <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed pl-2.5 relative">
                              <span className="absolute left-0 top-1.5 w-1 h-1 bg-rose-500 rounded-full" />
                              {imp}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendations */}
                    {readiness.resume_suggestions && readiness.resume_suggestions.length > 0 && (
                      <div className="space-y-1 pt-1 border-t border-slate-205/20 dark:border-slate-800/40">
                        <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold flex items-center gap-1">
                          💡 Actionable Advice
                        </span>
                        <ul className="space-y-1">
                          {readiness.resume_suggestions.map((sug, i) => (
                            <li key={i} className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed pl-2.5 relative">
                              <span className="absolute left-0 top-1.5 w-1 h-1 bg-amber-500 rounded-full" />
                              {sug}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>

                  {/* Retry File Upload */}
                  <div className="flex gap-2">
                    <label className="flex-1 text-center bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold py-1.5 rounded-lg cursor-pointer transition-all relative">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleResumeUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      🔄 Re-upload Resume
                    </label>
                  </div>
                </div>
              )}
            </div>


          </div>

          {/* Gantt Timeline checklist */}
          <div className="lg:col-span-2 space-y-3.5">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400">Timeline Milestones Checklist</h4>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {milestonesList.map((m) => (
                <div 
                  key={m.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    m.checked 
                      ? 'border-emerald-500/20 bg-emerald-500/[0.02]' 
                      : 'border-slate-200/50 dark:border-slate-800 bg-slate-500/[0.01]'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border ${
                      m.checked 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-slate-700 text-transparent'
                    }`}>
                      <Check size={12} strokeWidth={4} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-xs font-bold ${m.checked ? 'line-through text-slate-400 dark:text-slate-550' : 'text-slate-700 dark:text-slate-200'}`}>
                          {m.title}
                        </span>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${m.badgeColor}`}>
                          {m.badge}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {m.desc}
                      </p>
                    </div>
                  </div>

                  {!m.checked && (
                    <span className="text-[9.5px] font-bold text-slate-400 italic text-right shrink-0 bg-slate-100 dark:bg-slate-900 px-2.5 py-1 rounded-lg">
                      💡 {m.action}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* FLOATING AI PREP CHATBOT */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Floating action button (FAB) */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-12 h-12 bg-primary hover:bg-primary-dark text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transition-all hover:scale-105"
          title="Ask AI Prep Coach"
        >
          {isChatOpen ? <X size={20} /> : <Brain size={20} className="animate-pulse" />}
        </button>

        {/* Collapsible Chat Window */}
        {isChatOpen && (
          <div className="absolute bottom-16 right-0 w-[350px] sm:w-[400px] h-[500px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-slate-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-primary animate-pulse" />
                <div>
                  <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200">AI Prep Coach 💬</h4>
                  <p className="text-[9px] text-slate-400 font-semibold">Ready to explain interview questions</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleClearPrepChat}
                  className="text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded hover:bg-slate-500/10 transition-all"
                  title="Clear chat history"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsChatOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded hover:bg-slate-500/10 transition-all"
                  title="Close chat"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-500/[0.01]">
              {chatMessages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed font-semibold shadow-sm ${
                      m.role === 'user'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-950/70 border border-slate-200/50 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line">{m.content}</div>
                  </div>
                </div>
              ))}
              <div ref={prepChatEndRef} />
            </div>

            {/* Input form */}
            <form 
              onSubmit={(e) => handleSendPrepChatMessage(e)}
              className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-500/[0.02] flex items-center gap-2"
            >
              <input
                required
                type="text"
                placeholder="Ask about DBMS, OS, CN, OOP or DSA questions..."
                value={prepChatInput}
                onChange={(e) => setPrepChatInput(e.target.value)}
                disabled={prepChatSending}
                className="flex-1 glass-input py-2 text-xs rounded-xl outline-none"
              />
              <button
                type="submit"
                disabled={prepChatSending || !prepChatInput.trim()}
                className="p-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-primary shadow-sm shadow-primary/25"
              >
                {prepChatSending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Send size={12} />
                )}
              </button>
            </form>
          </div>
        )}
      </div>

    </div>
  )
}

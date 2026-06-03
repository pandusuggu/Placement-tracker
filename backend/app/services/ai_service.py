import logging
import json
import httpx
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from app.config.settings import settings

logger = logging.getLogger("codepilot")

# Try to configure Gemini SDK if key is present
has_gemini = False
if settings.gemini_api_key:
    try:
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        has_gemini = True
        logger.info("Gemini API key configured successfully.")
    except Exception as e:
        logger.error(f"Error configuring Gemini: {e}")

class AIService:
    @staticmethod
    def _parse_json(text: str) -> dict:
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()
        
        first_brace = text.find("{")
        last_brace = text.rfind("}")
        if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
            text = text[first_brace:last_brace+1]
        return json.loads(text)

    @staticmethod
    async def call_llm(prompt: str) -> str:
        """
        Sends prompt to Groq API if configured, otherwise falls back to Gemini API.
        Throws ValueError if no active API providers are available.
        """
        result_text = None
        if settings.groq_api_key:
            try:
                # Call Groq API via HTTP POST using standard OpenAI chat format
                headers = {
                    "Authorization": f"Bearer {settings.groq_api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "llama-3.1-8b-instant",  # Default ultra-fast Groq model
                    "messages": [
                        {
                            "role": "system", 
                            "content": "You are a professional student technical placement coach. Return only the raw JSON payload matching the requested keys, with no surrounding markdown formatting."
                        },
                        {
                            "role": "user", 
                            "content": prompt
                        }
                    ],
                    "response_format": {"type": "json_object"},  # Enable JSON Mode
                    "temperature": 0.2
                }
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    if response.status_code == 200:
                        data = response.json()
                        result_text = data["choices"][0]["message"]["content"].strip()
                    else:
                        logger.error(f"Groq API returned error status {response.status_code}: {response.text}")
            except Exception as e:
                logger.exception("Groq API invocation failed. Falling back to Gemini.")

        if not result_text and has_gemini:
            try:
                import google.generativeai as genai
                model = genai.GenerativeModel("gemini-1.5-flash")
                response = model.generate_content(prompt)
                result_text = response.text.strip()
            except Exception as e:
                logger.exception("Gemini API invocation failed.")
                
        if not result_text:
            raise ValueError("No active AI provider keys configured in settings or all API calls failed.")

        # Log AI Request in database
        try:
            from app.models.ai_log import AIRequestLog
            log_doc = AIRequestLog(request_type="llm_call")
            await log_doc.create()
        except Exception as le:
            logger.error(f"Failed to log AI request in db: {le}")

        return result_text
 
    @staticmethod
    async def generate_study_roadmap(
        target_role: str,
        daily_hours: float,
        skill_level: str,
        deadline: Optional[datetime],
        topics_to_learn: List[str]
    ) -> Dict[str, any]:
        """
        Generates daily, weekly, and monthly roadmaps based on goals using AI.
        """
        topics_str = ", ".join(topics_to_learn)
        deadline_str = deadline.strftime("%Y-%m-%d") if deadline else "unspecified timeline"
        
        # Round daily_hours to nearest integer for block creation
        num_hours = max(1, int(round(daily_hours)))
        
        prompt = f"""
        Act as a professional technical coach. Generate a detailed, ATS-aligned study plan for an aspiring {target_role}.
        The student has {daily_hours} hours available daily for active study and self-identifies as {skill_level}.
        Their deadline is {deadline_str} and they need to cover these topics: {topics_str}.
        
        For the "daily_plan", you MUST generate exactly {num_hours} 1-hour study blocks (labeled as 'Hour 1', 'Hour 2', ..., 'Hour {num_hours}'). 
        Each block should be structured as a 1-hour Pomodoro block (e.g. 50 minutes of focused study followed by a 10-minute break).
        Do NOT schedule more or fewer than exactly {num_hours} hours of study blocks in your daily checklist outline.
        
        Provide the response in structured JSON with the exact keys:
        "daily_plan": "A detailed daily checklist/schedule outline divided into exactly {num_hours} separate 1-hour Pomodoro blocks (50 min focus + 10 min break), listing Hour 1 through Hour {num_hours} explicitly",
        "weekly_roadmap": "A weekly milestone roadmap for the next 4-8 weeks",
        "monthly_roadmap": "A month-by-month high level strategy",
        "recommendations": ["list of 3 learning tips"],
        "learning_priorities": ["list of 3 key topics they should focus on first"]
        
        Only output the JSON block.
        """
        
        try:
            text = await AIService.call_llm(prompt)
            return AIService._parse_json(text)
        except Exception as e:
            logger.exception("AI study planner failed. Serving custom template fallbacks.")
            
        # Generate a dynamic fallback based on daily_hours to guarantee the correct hour count
        daily_plan_lines = ["• Daily Schedule (50m Focus + 10m Break Pomodoro Blocks):"]
        for h in range(1, num_hours + 1):
            if h == 1:
                topic = topics_to_learn[0] if topics_to_learn else 'Core DSA'
                activity = f"50m Focus on {topic} fundamentals / 10m Break"
            elif h == 2:
                topic = topics_to_learn[0] if topics_to_learn else 'Core DSA'
                activity = f"50m Focus on {topic} practice questions / 10m Break"
            elif h == 3:
                topic = topics_to_learn[1] if len(topics_to_learn) > 1 else 'Core CS subjects (DBMS/OS)'
                activity = f"50m Focus on {topic} study / 10m Break"
            elif h == 4:
                activity = f"50m Focus on building portfolio project for {target_role} / 10m Break"
            else:
                topic = topics_to_learn[h % len(topics_to_learn)] if topics_to_learn else 'Revision & Mock Interview Practice'
                activity = f"50m Focus on {topic} deep-dive / 10m Break"
            daily_plan_lines.append(f"  - Hour {h}: {activity}")
        daily_plan_fallback = "\n".join(daily_plan_lines)

        return {
            "daily_plan": daily_plan_fallback,
            "weekly_roadmap": f"• Week 1-2: Master fundamentals of {topics_to_learn[0] if topics_to_learn else 'data structures'}.\n• Week 3-4: Build basic project structure & database connections.\n• Week 5-6: Focus on medium-level platform challenges (e.g. Trees, DP) and core computer science concepts.\n• Week 7-8: Mock interview drill downs, aptitude practice, and resume tuning.",
            "monthly_roadmap": f"• Month 1: Foundation. Establish daily coding habit, finalize DSA arrays, stacks, strings.\n• Month 2: Projects & Core Subjects. Complete key backend APIs and learn system internals.\n• Month 3: Interview drills & placement readiness. Grind medium-hard problems and prepare for verbal/logical aptitudes.",
            "recommendations": [
                f"Design your project portfolio specifically towards {target_role} requirements.",
                "Solve at least 2 DSA questions daily. Focus on pattern matching rather than memorizing solutions.",
                "Dedicate 30 minutes every day to aptitude practice (logical & quant) as it filters 80% of candidates in early rounds."
            ],
            "learning_priorities": [
                f"Master key concepts in: {topics_to_learn[0] if topics_to_learn else 'Arrays & Strings'}",
                "Create a high-impact repository with clear READMEs demonstrating database optimization.",
                "Improve mock interview feedback response times."
            ]
        }

    @staticmethod
    async def analyze_productivity(
        tasks_completed: int,
        tasks_total: int,
        habits_completed: int,
        habits_total: int,
        focus_minutes: int,
        coding_solved: int
    ) -> Dict[str, any]:
        """
        Analyze user productivity metrics and generate suggestions using AI.
        """
        prompt = f"""
        Analyze a student's daily stats:
        - Tasks completed: {tasks_completed}/{tasks_total}
        - Habits ticked off: {habits_completed}/{habits_total}
        - Pomodoro focus duration: {focus_minutes} minutes
        - Coding problems solved today: {coding_solved}
        
        Provide constructive coach recommendations in JSON format:
        "productivity_score": (int from 0 to 100 representing performance),
        "insights": "Short feedback paragraph analyzing their consistency",
        "optimization": "One actionable time-management suggestion to optimize tomorrow's schedule"
        """
        
        try:
            text = await AIService.call_llm(prompt)
            return AIService._parse_json(text)
        except Exception as e:
            logger.exception("AI productivity analysis failed. Using custom template calculator.")

        # Fallback scoring logic
        task_ratio = tasks_completed / max(tasks_total, 1)
        habit_ratio = habits_completed / max(habits_total, 1)
        
        base_score = (task_ratio * 40) + (habit_ratio * 30) + (min(focus_minutes, 120) / 120 * 20) + (min(coding_solved, 4) / 4 * 10)
        productivity_score = max(min(int(base_score), 100), 20)
        
        if productivity_score > 80:
            insights = "Excellent job today! Your focus sessions and high coding activity demonstrate exceptional consistency. You're building a strong momentum."
            optimization = "Consider allocating your morning hours to highly complex tasks (e.g. Dynamic Programming or system design) when your cognitive load capacity is at its peak."
        elif productivity_score > 50:
            insights = "Decent progress today, but some planned tasks/habits were skipped. Watch out for potential friction points in your schedule."
            optimization = "Use shorter Pomodoro sessions (e.g., 25/5 mode) to easily restart your momentum without feeling overwhelmed by long focus blocks."
        else:
            insights = "Today was a slow day. Remember that consistency overrides perfection. It's perfectly okay to have down days, but try to tick off at least one simple habit tomorrow."
            optimization = "Simplify your schedule tomorrow. Plan only 2 high-priority tasks and do not focus on streaks. Just get the ball rolling."
            
        return {
            "productivity_score": productivity_score,
            "insights": insights,
            "optimization": optimization
        }

    @staticmethod
    async def generate_reflection_summary(q_well: str, q_distracted: str, q_improve: str) -> Dict[str, any]:
        """
        Summarizes daily reflections using AI.
        """
        prompt = f"""
        Synthesize this user's daily reflection log:
        What went well: "{q_well}"
        What distracted: "{q_distracted}"
        What to improve: "{q_improve}"
        
        Return a JSON response with keys:
        "summary": "A 1-2 sentence supportive summary highlighting the user's psychological state or progress",
        "suggestions": ["list of 2 specific, actionable suggestions to combat the stated distraction and realize the improvement"]
        """
        
        try:
            text = await AIService.call_llm(prompt)
            return AIService._parse_json(text)
        except Exception as e:
            logger.exception("AI reflection summary failed. Using templates.")
            
        suggestions = ["Silence notifications or block websites during deep work blocks."]
        if "phone" in q_distracted.lower() or "social" in q_distracted.lower():
            suggestions.append("Place your mobile phone in another room during your Pomodoro focus intervals.")
        elif "sleep" in q_distracted.lower() or "tired" in q_distracted.lower():
            suggestions.append("Enforce a hard digital curfew 30 minutes before bed to optimize sleep hygiene.")
        else:
            suggestions.append("Break large study items into tiny, 15-minute sub-tasks to reduce start-friction.")
            
        return {
            "summary": "You are showing strong self-awareness. Recognizing blockers is the first step toward improving system workflow efficiency.",
            "suggestions": suggestions
        }

    @staticmethod
    async def evaluate_burnout(
        missed_tasks_count: int,
        focus_hours_decline: bool,
        consistency_drop: bool,
        user_target: str
    ) -> Dict[str, any]:
        """
        Analyze indicators to raise alarms for burnout using AI.
        """
        prompt = f"""
        Evaluate if a user is showing signs of student burnout.
        Metrics:
        - Missed tasks in last 5 days: {missed_tasks_count}
        - Focus hours showing a decline: {focus_hours_decline}
        - Daily consistency dropping: {consistency_drop}
        - Target Role: {user_target}
        
        Return a JSON with:
        "burnout_detected": (true/false),
        "burnout_percentage": (int from 0 to 100),
        "recovery_plan": "A paragraph recommending adjustments (e.g. light days, reduced hours)",
        "schedule_adjustments": ["list of 2 concrete tips for schedule redesign"]
        """
        try:
            text = await AIService.call_llm(prompt)
            return AIService._parse_json(text)
        except Exception as e:
            logger.exception("AI burnout engine failed. Calculating stats internally.")

        burnout_pct = 10
        if missed_tasks_count > 4:
            burnout_pct += 30
        if focus_hours_decline:
            burnout_pct += 30
        if consistency_drop:
            burnout_pct += 20
            
        burnout_detected = burnout_pct >= 60
        
        if burnout_detected:
            recovery_plan = "Alert: You are showing noticeable signs of burnout. Rapidly declining focus durations combined with missed targets suggests a high-stress load. It is strongly advised to scale back study hours by 50% for the next 2 days to recharge."
            schedule_adjustments = [
                "Temporarily toggle all tasks to Medium/Low priority and disable push alarms.",
                "Dedicate 1 study session entirely to hands-on, low-stress personal project building, or take a complete rest day."
            ]
        else:
            recovery_plan = "Your stress indicators are in a healthy range. Your productivity metrics show normal daily fluctuations. Keep going!"
            schedule_adjustments = [
                "Maintain your regular habits.",
                "Ensure your daily available study hours match your realistic workload limits."
            ]
            
        return {
            "burnout_detected": burnout_detected,
            "burnout_percentage": burnout_pct,
            "recovery_plan": recovery_plan,
            "schedule_adjustments": schedule_adjustments
        }

    @staticmethod
    async def generate_cs_questions(subject: str) -> List[str]:
        """
        Generates 5 dynamic, randomized technical interview questions for the specified CS subject.
        """
        prompt = f"""
        Generate 5 distinct, high-quality, professional technical interview questions for the computer science subject: '{subject}'.
        Ensure the questions range from conceptual understanding to real-world application, specific to the domain of {subject} (e.g. DBMS could include database scaling, indexing, Normalization, ACID; CN could include HTTP/HTTPS, OSI, routing; OS could include concurrency, memory management, virtualization; OOP could include patterns, composition vs inheritance).
        
        You must return a raw JSON payload with exactly one key "questions" containing a list of 5 string questions.
        Example output format:
        {{
            "questions": [
                "Question 1 description here...",
                "Question 2 description here...",
                "Question 3 description here...",
                "Question 4 description here...",
                "Question 5 description here..."
            ]
        }}
        Do not output any introductory or conversational text, only the raw JSON structure.
        """
        try:
            raw_response = await AIService.call_llm(prompt)
            data = AIService._parse_json(raw_response)
            if "questions" in data and isinstance(data["questions"], list) and len(data["questions"]) == 5:
                return [str(q).strip() for q in data["questions"]]
        except Exception as e:
            logger.error(f"Failed to generate AI questions for {subject}: {e}")
        
        # Fallback to static default questions
        fallbacks = {
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
        return fallbacks.get(subject, [])

    @staticmethod
    async def generate_aptitude_questions(topic: str) -> List[str]:
        """
        Generates 5 dynamic, randomized aptitude questions/problems for the specified topic.
        """
        prompt = f"""
        Generate 5 distinct, high-quality, professional technical screening aptitude questions/problems for the topic: '{topic}'.
        If the topic is Quantitative Aptitude or Logical Reasoning, provide numerical/word problems that test critical logic (e.g. compound interest, puzzles, syllogisms, relative speed). If it is Verbal Ability, provide questions testing grammar, sentence restructuring, or reading comprehension style inquiries.
        
        For each question, you MUST append a double-pipe ' || ' followed by a relevant IndiaBIX topic URL for practice.
        For example:
        - If the question is about Percentages, append: ' || https://www.indiabix.com/quantitative-aptitude/percentage/'
        - If the question is about Blood Relations, append: ' || https://www.indiabix.com/verbal-reasoning/blood-relation-test/'
        - If the question is about Reading Comprehension, append: ' || https://www.indiabix.com/verbal-ability/comprehension/'
        If no specific sub-topic is clear, fallback to ' || https://www.indiabix.com/quantitative-aptitude/', ' || https://www.indiabix.com/logical-reasoning/', or ' || https://www.indiabix.com/verbal-ability/'.
        
        You must return a raw JSON payload with exactly one key "questions" containing a list of 5 string questions formatted like this.
        Example output format:
        {{
            "questions": [
                "Problem 1: ... Description ... || https://www.indiabix.com/quantitative-aptitude/percentage/",
                "Problem 2: ... Description ... || https://www.indiabix.com/logical-reasoning/number-series/",
                "Problem 3: ... || ...",
                "Problem 4: ... || ...",
                "Problem 5: ... || ..."
            ]
        }}
        Do not output any introductory or conversational text, only the raw JSON structure.
        """
        try:
            raw_response = await AIService.call_llm(prompt)
            data = AIService._parse_json(raw_response)
            if "questions" in data and isinstance(data["questions"], list) and len(data["questions"]) == 5:
                return [str(q).strip() for q in data["questions"]]
        except Exception as e:
            logger.error(f"Failed to generate AI aptitude questions for {topic}: {e}")
            
        # Fallback default static aptitude questions with IndiaBIX links
        fallbacks = {
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
        return fallbacks.get(topic, [])

    @staticmethod
    async def analyze_resume(resume_text: str) -> Dict[str, any]:
        """
        Analyze a student's resume text for ATS compatibility and placement readiness.
        """
        prompt = f"""
        Analyze the following student resume text for technical placement readiness and ATS compatibility.
        
        Resume Text:
        \"\"\"{resume_text}\"\"\"
        
        Provide your analysis in JSON format with these exact keys:
        "score": (int from 0 to 100 representing ATS match score and strength of the resume),
        "strengths": ["list of 3 key strengths or positive points in the resume"],
        "improvements": ["list of 3 areas of improvement or negative points in the resume"],
        "suggestions": ["list of 3 specific actionable suggestions to optimize the resume"],
        "suggested_status": (one of: "in_progress", "completed", "reviewed" based on quality of resume)
        
        Only output the JSON block.
        """
        try:
            raw_response = await AIService.call_llm(prompt)
            return AIService._parse_json(raw_response)
        except Exception as e:
            logger.error(f"Failed to analyze resume with AI: {e}")
            
        # Fallback default analysis
        return {
            "score": 65,
            "strengths": ["Clear structure and formatting", "Mentions relevant coursework", "Includes contact information"],
            "improvements": ["Needs more quantitative metrics for projects", "Skills section should be categorized", "Action verbs could be stronger"],
            "suggestions": ["Add numbers/percentages to describe project impacts (e.g., 'reduced latency by 20%')", "Categorize technical skills into languages, frameworks, databases, and tools", "Include links to LeetCode and GitHub profiles next to your contact info"],
            "suggested_status": "completed"
        }

    @staticmethod
    async def generate_company_round_questions(company: str, round_name: str, round_desc: str) -> List[str]:
        """
        Generates 3 randomized, realistic interview items (questions, scenarios, or coding problems)
        for the specified company's round.
        """
        prompt = f"""
        Generate 3 distinct, high-quality, professional and realistic interview items (questions, behavioral scenarios, or coding problems)
        for {company}'s '{round_name}' recruitment stage.
        The description of this round is: "{round_desc}".
        Ensure these items perfectly match the difficulty and approach that {company} uses in actual placements (e.g. for mass recruiters like TCS/Infosys use standard arithmetic aptitude, basic logic, or fundamental OOP/SQL questions; for product giants like Amazon/Microsoft use standard DSA problems, code optimization, or system design challenges).
        
        You must return a raw JSON payload with exactly one key "questions" containing a list of 3 string items.
        Example output format:
        {{
            "questions": [
                "Item 1 description here...",
                "Item 2 description here...",
                "Item 3 description here..."
            ]
        }}
        Do not output any introductory or conversational text, only the raw JSON structure.
        """
        try:
            raw_response = await AIService.call_llm(prompt)
            data = AIService._parse_json(raw_response)
            if "questions" in data and isinstance(data["questions"], list) and len(data["questions"]) == 3:
                return [str(q).strip() for q in data["questions"]]
        except Exception as e:
            logger.error(f"Failed to generate AI company round questions for {company} - {round_name}: {e}")
            
        # Fallback default items will be handled in the frontend or default templates.
        return [
            f"Practice technical concepts for {company}'s {round_name}.",
            f"Prepare a walk-through explanation of your major resume project related to {round_name}.",
            f"Solve standard practice problems covering topics listed under: {round_desc}."
        ]

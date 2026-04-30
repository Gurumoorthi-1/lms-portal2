import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import axios from 'axios';

const pdfParse = require('pdf-parse');

@Injectable()
export class AiService {
  private openai: OpenAI;
  constructor(private configService: ConfigService) {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // Fallback YouTube Scraper: Try Transcript, then Title/Description
  private async getYoutubeContent(videoId: string): Promise<{ transcript: string, title: string }> {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      let title = 'Unknown Topic';
      let description = '';

      // Step 1: Fetch page HTML for Title and Description
      try {
        const response = await axios.get(videoUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const html = response.data;
        const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
        if (titleMatch) title = titleMatch[1];

        const descMatch = html.match(/<meta name="description" content="(.*?)">/);
        if (descMatch) description = descMatch[1];
      } catch (e) {
        console.warn('Page fetch failed, continuing...');
      }

      // Step 2: Try fetching real transcript via standard youtube-transcript library
      let transcript = '';
      try {
        const ytModule = await eval('import("youtube-transcript")');
        const YoutubeTranscript = ytModule.YoutubeTranscript || ytModule.default.YoutubeTranscript;
        const transcriptLines = await YoutubeTranscript.fetchTranscript(videoId);
        transcript = transcriptLines.map((t: any) => t.text).join(' ');
      } catch (e) {
        console.warn('Transcript extraction failed, falling back to title and description');
      }

      let finalContent = `Title: ${title}\nDescription: ${description}\n`;
      if (transcript) {
        finalContent += `Content: ${transcript}`;
      } else {
        finalContent += `(Note: No closed captions were available. Generate best-effort questions based strictly on the title and description provided above.)`;
      }

      if (finalContent.length > 20000) {
        finalContent = finalContent.substring(0, 20000);
      }

      return { transcript: finalContent, title };
    } catch (error) {
      console.error('YouTube Fetch Error:', error?.message || error);
      throw new BadRequestException('Failed to process YouTube URL. Please check the URL.');
    }
  }

  async generateQuestions(formData: any, file?: Express.Multer.File) {
    const { sourceMode, difficulty, questionCount, topic, prompt } = formData;
    let contextData = '';
    let detectedTopic = topic || 'AI Exam';

    try {
      if (sourceMode === 'topic') {
        detectedTopic = prompt ? (prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt) : 'AI Exam';
        contextData = `Topic/Subject: ${prompt}.
        Rigor Requirements: This is a ${difficulty} level exam. 
        - Beginner: Focus on basic syntax, definitions, and core concepts.
        - Intermediate: Focus on real-world application, common design patterns, and debugging.
        - Advanced: Focus on performance optimizations, edge cases, deep internal architecture, and complex scenarios.`;
      } else if (sourceMode === 'youtube') {
        const url = formData.youtubeUrl || '';
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) throw new Error('Invalid YouTube URL');
        
        const ytData = await this.getYoutubeContent(videoId);
        detectedTopic = ytData.title;
        contextData = `Transcript/Content: ${ytData.transcript || `Topic is ${ytData.title}. Generate questions base on general knowledge of this subject.`}`;
      } else if (sourceMode === 'upload' && file) {
        if (file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(file.buffer);
          contextData = pdfData.text;
        } else if (file.mimetype.startsWith('image/')) {
          const base64Image = file.buffer.toString('base64');
          const visionResponse = await this.openai.chat.completions.create({
            model: 'openai/gpt-4o',
            messages: [{ role: 'user', content: [{ type: 'text', text: 'Extract quiz content from this image. Focus on the core technical concepts.' }, { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64Image}` } }] }]
          });
          contextData = (visionResponse.choices?.[0]?.message?.content as string) || '';
        } else {
          contextData = file.buffer.toString('utf-8');
        }
        detectedTopic = formData.topic || 'Document Assessment';
      }

      const fullPrompt = `Task: Generate EXACTLY ${questionCount} high-quality Multiple Choice Questions (MCQs).
      Difficulty Level: ${difficulty} (STRICT ADHERENCE REQUIRED).
      
      Topic/Context: ${contextData}
      
      Technical Requirements:
      1. CRITICAL: For technical or programming questions, you MUST NOT embed code within the sentence. NEVER do this: "What is the output of class A { ... }?". 
      2. INSTEAD: State the question, then provide a separate, valid Markdown code block using triple backticks and the language ID. 
      3. Example:
         "Analyze the following Java code:
         \`\`\`java
         public class Test {
             public static void main(String[] args) {
                 System.out.println(\"Hello\");
             }
         }
         \`\`\`
         What will be the output?"
      4. Language IDs are MANDATORY (java, python, javascript, cpp, etc.).
      5. Options (a, b, c, d) must be technically sound. One must be objectively correct.
      
      Response Format (STRICT JSON ONLY - No conversational text):
      {
        "topic": "Summarized Topic Name",
        "questions": [
          {
            "id": 1,
            "text": "Question text here",
            "code": "Only the code snippet here. CRITICAL: Use multiple lines, proper indentation, and escaped newlines (\\n). NEVER generate code on a single line.",
            "language": "javascript/java/python/etc",
            "options": [
              {"id": "a", "text": "Option A"},
              {"id": "b", "text": "Option B"},
              {"id": "c", "text": "Option C"},
              {"id": "d", "text": "Option D"}
            ],
            "correct": "a",
            "difficulty": "${difficulty}",
            "topic": "Sub-topic"
          }
        ]
      }`;

      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini', 
        messages: [{ role: 'user', content: fullPrompt }],
        response_format: { type: 'json_object' }
      });

      const rawText = response.choices?.[0]?.message?.content || '{}';
      
      let parsedData;
      try {
        parsedData = JSON.parse(rawText);
      } catch (e) {
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('AI returned invalid data format.');
        }
      }

      const finalTopic = parsedData.topic || detectedTopic;
      const questions = (parsedData.questions || []).map((q: any) => {
        let text = q.text;
        let image = q.image || q.imageUrl || null;
        const code = q.code || '';
        const lang = q.language || 'javascript';

        // Code-to-Image Conversion Logic
        // If there is code and no manually provided image, we "convert" code to a premium image URL
        if (code.trim() && !image) {
          // Using Ray.so style parameters for high-quality rendering
          // We Encode the code to be safely passed in a URL
          const encodedCode = Buffer.from(code).toString('base64');
          
          // We use a helper service that renders code as a beautiful image
          // Using a reliable open-source code-to-image proxy
          image = `https://carbonara.vercel.app/api/cook?code=${encodeURIComponent(code)}&backgroundColor=%231a1a1a&theme=dracula&fontSize=16px&exportSize=2x&paddingHorizontal=30px&paddingVertical=30px`;
          
          // If the text is very short and just says "Analyze code", we keep it clean
          if (text.toLowerCase().includes('following code') || text.toLowerCase().includes('analyze the code')) {
             // text is fine as is
          }
        }

        return { 
          ...q, 
          text, 
          image, // Code is now an image
          topic: finalTopic 
        };
      });

      if (questions.length === 0) throw new Error('AI could not generate questions.');

      return { questions, topic: finalTopic };
    } catch (error) {
      console.error('Final Error Details:', error);
      // Friendly Error handling for upstream AI failure
      if (error?.status === 503 || error?.message?.includes('unreachable') || error?.status === 429) {
        throw new BadRequestException('AI Generator is temporarily busy (OpenAI limit reached). Please try again in a few minutes or provide a new key.');
      }
      throw new BadRequestException(error?.message || 'Unknown AI Error');
    }
  }

  async getTutorResponse(question: string, type: string, userInput?: string) {
    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: `Task: ${type}. Question: ${question}. User Input: ${userInput || ''}. Response as a helpful tutor.` }],
      });
      return { response: response.choices?.[0]?.message?.content };
    } catch (e) { return { response: 'Tutor unavailable.' }; }
  }

  async generateStudyPlan(stats: any) {
    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: `Create study plan: ${JSON.stringify(stats)}. JSON { plan: [] }.` }],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}').plan || [];
    } catch (e) { return []; }
  }

  async analyzeCode(language: string, code: string): Promise<string> {
    try {
      const fullPrompt = `You are an expert ${language} code reviewer.
Analyze the following code step-by-step:
1. Potential logic bugs or edge cases.
2. Code style, naming, and best practices.
3. Performance/complexity.
4. Provide a summarized verdict on how to improve the code.

Return your response entirely formatted in Markdown.

Code:
\`\`\`${language}
${code}
\`\`\`
`;
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
      });
      return response.choices?.[0]?.message?.content || 'No review available.';
    } catch (error) {
      console.error('AI Review Error:', error);
      return 'Failed to analyze code at this time.';
    }
  }

  // --- NEW AI INTERVIEW METHODS ---

  async analyzeResume(text: string): Promise<any> {
    const analysisPrompt = `Analyze this resume and provide a comprehensive assessment. Return ONLY valid JSON with no extra text.

Resume Content:
${text.substring(0, 3000)}

Return this exact JSON structure:
{
  "atsScore": <number 0-100>,
  "skills": ["skill1", "skill2", ...],
  "primaryProgrammingLanguage": "javascript | python | java | cpp | typescript",
  "experience": ["exp1", "exp2", ...],
  "education": ["edu1", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "missingSkills": ["skill1", ...],
  "formattingIssues": ["issue1", ...],
  "strengths": ["strength1", ...],
  "jobTitles": ["title1", ...],
  "summary": "brief professional summary"
}

IMPORTANT for primaryProgrammingLanguage: Only choose ONE from [javascript, python, java, cpp, typescript] that is most prominent in their experience and projects.`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert ATS resume analyzer. Return only valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Resume Analysis Error:', error);
      if (error?.status === 402 || error?.code === 402) {
        throw new BadRequestException('AI Service credit limit reached. Resume analysis unavailable.');
      }
      if (error?.status === 429) {
        throw new BadRequestException('AI Service rate limit exceeded. Please wait a moment.');
      }
      throw new BadRequestException('Failed to analyze resume: ' + (error?.message || 'Unknown AI Error'));
    }
  }

  async generateAptitudeQuestions(skills: string, numQuestions: number): Promise<any[]> {
    const prompt = `Generate exactly ${numQuestions} high-quality, professional multiple-choice questions for a standard corporate Aptitude Test.

CRITICAL INSTRUCTIONS:
1. NO TECHNICAL/CODING QUESTIONS: Questions MUST be strictly general aptitude.
2. ACCURACY & OPTIONS: Each question must have EXACTLY one logically and mathematically correct answer. The options array MUST contain the actual numerical or verbal answers (e.g., "45", "Brother", "10%"). DO NOT generate generic placeholders like "Option A", "Option B".
3. GUARANTEED CORRECT OPTION: You MUST ensure that the exact correct answer is present as one of the 4 items in the 'options' array.
4. VALID JSON: Return only a valid JSON array.
5. CATEGORIES: Provide a balanced mix of:
   - Quantitative Aptitude (percentages, profit/loss, time/work, ratios, simple/compound interest, algebra).
   - Logical Reasoning (syllogisms, blood relations, number series, seating arrangements, coding-decoding).
   - Verbal Ability (sentence correction, synonyms/antonyms, idioms, contextual meaning).
   - Data Interpretation (using hypothetical tables/charts described in text).

Return ONLY valid JSON array in this format:
[
  {
    "id": "q1",
    "question": "Clear, unambiguous question text",
    "options": ["Actual Answer 1", "Actual Answer 2", "Actual Answer 3", "Actual Answer 4"],
    "correctAnswer": 0, 
    "hint": "Brief hint to guide the candidate",
    "category": "quantitative | logical | verbal | di",
    "difficulty": "medium",
    "explanation": "Provide a thorough, step-by-step logical or mathematical proof of why the correct option is right and others are wrong."
  }
]

IMPORTANT: The 'correctAnswer' MUST be an integer between 0 and 3 representing the EXACT index of the true correct answer in your 'options' array. Ensure there are no ambiguous questions.`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert test designer. Return only valid JSON array.' },
          { role: 'user', content: prompt }
        ]
      });
      const rawText = response.choices?.[0]?.message?.content || '[]';
      
      // Extract JSON array using regex in case of markdown blocks or extra text
      const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return JSON.parse(rawText);
    } catch (error) {
      console.error('Aptitude Generation Error:', error);
      throw new BadRequestException('Failed to generate aptitude questions');
    }
  }

  async generateCodingProblems(ctx: any, detectedLanguage: string): Promise<any[]> {
    const prompt = `You are a senior technical interviewer. Generate EXACTLY 5 coding problems tailored to this candidate's resume.

CANDIDATE PROFILE:
- Skills: ${ctx.skills}
- Technologies: ${ctx.technologies}
- Experience: ${ctx.experience}
- Projects: ${ctx.projects}
- Resume Excerpt: ${ctx.resumeText}

REQUIREMENTS:
- Problem 1: EASY (1 problem) — fundamental algorithm/data structure matching their skill level
- Problems 2-3: MEDIUM (2 problems) — intermediate, related to their tech stack
- Problems 4-5: HARD (2 problems) — advanced, directly referencing their skills/projects

IMPORTANT: Problems MUST reflect their specific skills.

Return ONLY valid JSON array (no extra text):
[
  {
    "id": "p1",
    "title": "Problem Title",
    "difficulty": "easy",
    "description": "Full clear problem statement with context relevant to candidate's background",
    "examples": [
      {"input": "nums = [2,7,11,15], target = 9", "output": "[0,1]", "explanation": "nums[0] + nums[1] = 9"}
    ],
    "constraints": ["1 <= n <= 10^4"],
    "tags": ["array", "hash-table"],
    "starterCode": {
      "${detectedLanguage}": "// starter code in ${detectedLanguage} with function signature"
    },
    "testCases": [
      {"input": "test input string", "expectedOutput": "expected output", "isHidden": false},
      {"input": "hidden test", "expectedOutput": "hidden result", "isHidden": true}
    ],
    "resumeRelevance": "Brief note on why this relates to their background"
  }
]`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert coding interview designer. Return ONLY valid JSON array.' },
          { role: 'user', content: prompt }
        ]
      });
      const rawText = response.choices?.[0]?.message?.content || '[]';
      const match = rawText.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : JSON.parse(rawText);
    } catch (error) {
      console.error('Coding Problem Generation Error:', error);
      if (error?.status === 402 || error?.code === 402) {
        throw new BadRequestException('AI Service credit limit reached. Please check your OpenRouter/OpenAI balance.');
      }
      if (error?.status === 429) {
        throw new BadRequestException('AI Service rate limit exceeded. Please try again in a moment.');
      }
      throw new BadRequestException('Failed to generate coding problems: ' + (error?.message || 'Unknown Error'));
    }
  }

  async evaluateCodeSubmission(problem: any, language: string, code: string): Promise<any> {
    const evalPrompt = `Evaluate this ${language} code solution. Return ONLY valid JSON.

Problem: ${problem.title}
Description: ${problem.description}
All test cases: ${JSON.stringify(problem.testCases)}

Code:
\`\`\`${language}
${code}
\`\`\`

Return:
{
  "passed": true/false,
  "passedCount": number,
  "totalCount": number,
  "results": [],
  "timeComplexity": "O(n)",
  "spaceComplexity": "O(1)",
  "feedback": "Clear, constructive English feedback on the code quality, correctness, and improvements."
}`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a strict code evaluator. Return only JSON.' },
          { role: 'user', content: evalPrompt }
        ],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Code Evaluation Error:', error);
      if (error?.status === 402 || error?.code === 402) {
        throw new BadRequestException('AI Service credit limit reached. Code evaluation unavailable.');
      }
      throw new BadRequestException('Failed to evaluate code: ' + (error?.message || 'Unknown Error'));
    }
  }

  async generateHRQuestions(skills: string, experience: string, context?: any): Promise<any[]> {
    // Extract scores and data from the candidate's context (The 'Red Thread')
    const mcqScore = context?.mcq?.score ?? 'N/A';
    const weakTopics = context?.mcq?.weakAreas?.join(', ') || 'None';
    const aptScore = context?.aptitude?.score ?? 'N/A';
    const codingFeedback = context?.coding?.feedback ?? 'General performance recorded';

    const prompt = `Act as an AI Executive Recruiter and Technical Evaluator. Your objective is to conduct a dynamic HR Interview for a candidate based on their performance in 3 previous rounds (MCQ, Aptitude, Coding) and their uploaded Resume. You must behave like a human interviewer who tailors questions based on the candidate's specific background.

[CANDIDATE CONTEXT]
Resume Data: 
- Skills: ${skills}
- Experience: ${experience}

Performance Data:
- MCQ Result: ${mcqScore}% (Struggled with: ${weakTopics})
- Aptitude Score: ${aptScore}%
- Coding Evaluation: ${codingFeedback}

[INTERVIEW EXECUTION RULES]
1. The 'Gap' Analysis: If the candidate scored high in Coding but low in MCQ theory (or vice versa), ask a question to check if they understand the 'Why' behind their code vs their practical logic.
2. Resume Validation: Pick a specific technology, project, or role from the resume data and ask: 'How did you specifically handle [Task X] using [Skill Y]?'
3. Dynamic Hooking: Design questions that preemptively hook into common behavioral traits. Ask for a 'What If' scenario regarding a team conflict or project failure.
4. Stress Test: Give one high-pressure situation tailored to their role (e.g., 'Imagine your server crashed during a live demo. What is your immediate 3-step action plan?').

Generate exactly 6 to 8 questions incorporating the rules above.
Return ONLY a valid JSON array:
[
  {
    "id": "q1",
    "question": "The question text tailored using the rules above",
    "type": "intro | gap_analysis | resume_validation | dynamic_hooking | stress_test",
    "expectedDuration": 120,
    "followUps": ["Contextual follow-up 1", "Contextual follow-up 2"],
    "evaluationCriteria": "What to look for in the candidate's answer"
  }
]`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert HR interviewer. Return only valid JSON array.' },
          { role: 'user', content: prompt }
        ]
      });
      const rawText = response.choices?.[0]?.message?.content || '[]';
      const match = rawText.match(/\[[\s\S]*\]/);
      return match ? JSON.parse(match[0]) : JSON.parse(rawText);
    } catch (error) {
      console.error('HR Questions Generation Error:', error);
      throw new BadRequestException('Failed to generate HR questions');
    }
  }

  async evaluateInterviewResponse(question: string, answer: string, context?: any): Promise<any> {
    const prompt = `Act as an AI Executive Recruiter evaluating a candidate's real-time response.
    
Question Asked: ${question}
Candidate's Answer: ${answer}
(Cross-reference Context: ${JSON.stringify(context || {})})

[EVALUATION CRITERIA]
1. Technical Consistency: Does their verbal explanation match their coding round performance or general technical standards?
2. Communication: Rate their clarity, confidence, and ability to stay on point.
3. Problem Solving: How they approach the 'What If' scenarios.
4. Actionable Advice: Identify exactly where they need to improve (e.g., 'Needs to work on Database Indexing concepts').

Return ONLY valid JSON in this format:
{
  "score": <0-10>,
  "technicalConsistency": "assessment paragraph",
  "communication": "assessment paragraph",
  "problemSolving": "assessment paragraph",
  "actionableAdvice": "specific actionable advice",
  "followUp": "dynamic follow-up question based on their exact answer",
  "strengths": ["strength1", "strength2"],
  "improvements": ["improvement1", "improvement2"]
}`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert HR interviewer evaluating candidates. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Interview Response Evaluation Error:', error);
      throw new BadRequestException('Failed to evaluate interview response');
    }
  }

  async generateFinalInterviewReport(interviewData: any, context: any): Promise<any> {
    const prompt = `Act as an AI Executive Recruiter. The interview has ended. 
    
[CANDIDATE HISTORICAL DATA]
- MCQ Score: ${context?.mcq?.score ?? 'N/A'}%
- Aptitude Score: ${context?.aptitude?.score ?? 'N/A'}%
- Coding Evaluation: ${context?.coding?.feedback ?? 'N/A'}
- HR Interview Evaluations: ${JSON.stringify(interviewData)}

[FINAL TASK]
Generate a Comprehensive Performance Report in a structured JSON format suitable for final PDF generation.

Output ONLY valid JSON matching this exact structure:
{
  "executiveSummary": "A concise overall fitment paragraph summarizing their profile.",
  "roundWiseBreakdown": {
    "mcq": "Highlighting struggles and strengths",
    "aptitude": "Highlighting struggles and strengths",
    "coding": "Highlighting struggles and strengths",
    "hrInterview": "Highlighting struggles and strengths"
  },
  "criticalImprovementAreas": [
    "Specific topic to study 1",
    "Specific topic to study 2"
  ],
  "finalVerdict": "Hire | Develop | Reject",
  "overallScore": <0-100>
}`;

    try {
      const response: any = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o',
        messages: [
          { role: 'system', content: 'You are an Executive AI Recruiter. Return only valid JSON for the final report.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      console.error('Final Report Generation Error:', error);
      throw new BadRequestException('Failed to generate final report');
    }
  }
}

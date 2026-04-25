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
}

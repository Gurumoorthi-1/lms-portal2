import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Injectable()
export class InterviewService {
  constructor(private readonly aiService: AiService) {}

  async generateQuestions(context: any): Promise<any[]> {
    const skills = context?.resume?.skills || [];
    const experience = context?.resume?.experience || [];
    
    const skillsString = skills.slice(0, 5).join(', ');
    const expString = experience.slice(0, 3).join('; ');

    // Phase 5: Pass the entire context to AI for deep-dive questions
    const questions = await this.aiService.generateHRQuestions(skillsString, expString, context);

    if (!questions || questions.length === 0) {
      throw new BadRequestException('Failed to generate interview questions.');
    }

    return questions.map((q, i) => ({
      id: q.id || `iq${i + 1}`,
      question: q.question,
      type: q.type || 'behavioral',
      expectedDuration: q.expectedDuration || 90,
      followUps: q.followUps || [],
      evaluationCriteria: q.evaluationCriteria || 'Clarity, relevance, examples'
    }));
  }

  async analyzeResponse(question: string, answer: string, context: any): Promise<any> {
    if (!answer || answer.trim().length < 10) {
      return {
        success: true,
        score: 0,
        technicalConsistency: 'N/A',
        communication: 'No response',
        analysis: 'No meaningful response provided.',
        followUp: 'Could you please elaborate on your answer?',
        strengths: [],
        improvements: ['Provide a detailed response']
      };
    }

    const analysis = await this.aiService.evaluateInterviewResponse(question, answer, context);
    return { success: true, ...analysis };
  }
}

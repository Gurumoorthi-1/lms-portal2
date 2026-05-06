import { Injectable, BadRequestException } from '@nestjs/common';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AptitudeService {
  constructor(private readonly aiService: AiService) {}

  async generateTest(skills: string, totalQuestions: number = 10): Promise<any> {
    const numQuestions = Math.min(Math.max(totalQuestions, 5), 50);

    const questions = await this.aiService.generateAptitudeQuestions(skills, numQuestions);

    if (!questions || questions.length === 0) {
      throw new BadRequestException('Failed to generate test questions.');
    }

    // Shuffle questions
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }

    // Shuffle options and fix correctAnswer index
    const processedQuestions = questions.map((q, i) => {
      const options = q.options || [];
      
      let correctIndex = 0;
      if (typeof q.correctAnswer === 'number') {
        correctIndex = q.correctAnswer;
      } else if (typeof q.correctAnswer === 'string') {
        // Handle "A", "B", "C", "D" or string numbers
        const match = q.correctAnswer.match(/^[A-D]/i);
        if (match) {
          correctIndex = match[0].toUpperCase().charCodeAt(0) - 65;
        } else if (!isNaN(parseInt(q.correctAnswer))) {
          correctIndex = parseInt(q.correctAnswer);
        }
      }
      
      // bounds check
      if (correctIndex < 0 || correctIndex >= options.length) {
        correctIndex = 0;
      }
      
      const correctText = options[correctIndex];
      
      const shuffledOptions = [...options];
      for (let x = shuffledOptions.length - 1; x > 0; x--) {
        const y = Math.floor(Math.random() * (x + 1));
        [shuffledOptions[x], shuffledOptions[y]] = [shuffledOptions[y], shuffledOptions[x]];
      }

      return {
        ...q,
        id: q.id || `q${i + 1}`,
        options: shuffledOptions,
        correctAnswer: shuffledOptions.indexOf(correctText),
      };
    });

    return {
      success: true,
      questions: processedQuestions,
      totalQuestions: processedQuestions.length,
      timeLimit: processedQuestions.length * 60 // 1 min per question
    };
  }

  evaluateTest(answers: any[], questions: any[]): any {
    let rawScore = 0;
    const maxScore = questions.length;
    const processedAnswers: any[] = [];

    for (const answer of answers) {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) continue;

      const isCorrect = answer.selectedAnswer === question.correctAnswer;
      const hintPenalty = answer.usedHint ? 0.5 : 0;
      const questionScore = isCorrect ? Math.max(1 - hintPenalty, 0.5) : 0;

      rawScore += questionScore;
      processedAnswers.push({
        questionId: answer.questionId,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: question.correctAnswer,
        isCorrect,
        usedHint: answer.usedHint || false,
        score: questionScore,
        explanation: question.explanation
      });
    }

    const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0;
    const passed = percentage >= 60;

    return {
      success: true,
      score: Math.round(rawScore * 10) / 10,
      maxScore,
      percentage: Math.round(percentage),
      passed,
      processedAnswers,
      message: passed ? 'Congratulations! You passed the Aptitude round.' : 'You did not pass the Aptitude round (Requires 60% or above).'
    };
  }
}

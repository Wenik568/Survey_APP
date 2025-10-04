import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import type { Survey, SurveyResponse } from '../types';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';

// Initialize fonts
(pdfMake as any).vfs = pdfFonts;

interface QuestionStats {
  questionId: string;
  questionText: string;
  questionType: string;
  totalAnswers: number;
  textAnswers?: string[];
  optionStats?: { option: string; count: number; percentage: number }[];
  ratingAverage?: number;
  ratingDistribution?: { rating: number; count: number }[];
}

export const exportToPDF = async (
  survey: Survey,
  responses: SurveyResponse[],
  stats: QuestionStats[]
) => {
  const content: Content = [];

  // Title
  content.push({
    text: 'Звіт опитування',
    style: 'header',
    alignment: 'center',
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Survey Title
  content.push({
    text: survey.title,
    style: 'surveyTitle',
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // Survey Description
  if (survey.description) {
    content.push({
      text: survey.description,
      style: 'description',
      margin: [0, 0, 0, 15] as [number, number, number, number],
    });
  }

  // Stats Summary
  content.push({
    columns: [
      { text: `📝 Питань: ${survey.questions.length}`, bold: true },
      { text: `✉️ Відповідей: ${responses.length}`, bold: true },
    ],
    margin: [0, 0, 0, 10] as [number, number, number, number],
  });

  // Separator
  content.push({
    canvas: [
      {
        type: 'line',
        x1: 0,
        y1: 0,
        x2: 515,
        y2: 0,
        lineWidth: 1,
        lineColor: '#e5e7eb',
      },
    ],
    margin: [0, 0, 0, 20] as [number, number, number, number],
  });

  // Process each question
  stats.forEach((stat, index) => {
    const question = survey.questions[index];

    // Question header
    content.push({
      text: `${index + 1}. ${stat.questionText}`,
      style: 'question',
      margin: [0, 10, 0, 5] as [number, number, number, number],
    });

    content.push({
      text: `Відповідей: ${stat.totalAnswers} / ${responses.length}`,
      style: 'questionInfo',
      margin: [0, 0, 0, 10] as [number, number, number, number],
    });

    // Rating visualization
    if (question.type === 'rating' && stat.ratingDistribution && stat.ratingAverage !== undefined) {
      content.push({
        text: `⭐ Середній рейтинг: ${stat.ratingAverage.toFixed(2)} / 5`,
        bold: true,
        margin: [0, 0, 0, 8] as [number, number, number, number],
      });

      const maxCount = Math.max(...stat.ratingDistribution.map((d) => d.count));
      const ratingRows = stat.ratingDistribution.map((dist) => {
        const percentage = maxCount > 0 ? (dist.count / maxCount) * 100 : 0;
        const barWidth = Math.round(percentage * 2); // Scale to max 200 chars
        const bar = '|'.repeat(Math.round(barWidth / 10)) || '-';

        return [
          { text: `${dist.rating} ⭐`, alignment: 'left' as const },
          { text: bar, color: '#3b82f6', fontSize: 8 },
          { text: dist.count.toString(), alignment: 'right' as const },
        ];
      });

      content.push({
        table: {
          widths: [40, '*', 40],
          body: ratingRows,
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15] as [number, number, number, number],
      });
    }

    // Radio/Checkbox visualization
    if ((question.type === 'radio' || question.type === 'checkbox') && stat.optionStats && stat.optionStats.length > 0) {
      const maxCount = Math.max(...stat.optionStats.map((o) => o.count));
      const optionRows = stat.optionStats.map((optStat) => {
        const percentage = maxCount > 0 ? (optStat.count / maxCount) * 100 : 0;
        const barWidth = Math.round(percentage * 2); // Scale to max 200 chars
        const bar = '|'.repeat(Math.round(barWidth / 10)) || '-';

        return [
          { text: optStat.option, alignment: 'left' as const, width: 'auto' },
          { text: bar, color: '#6366f1', fontSize: 8 },
          { text: `${optStat.percentage.toFixed(1)}% (${optStat.count})`, alignment: 'right' as const, width: 'auto' },
        ];
      });

      content.push({
        table: {
          widths: ['*', 80, 60],
          body: optionRows,
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 15] as [number, number, number, number],
      });
    }

    // Text answers
    if ((question.type === 'text' || question.type === 'textarea') && stat.textAnswers && stat.textAnswers.length > 0) {
      content.push({
        text: '📝 Останні відповіді:',
        fontSize: 10,
        bold: true,
        margin: [0, 0, 0, 5] as [number, number, number, number],
      });

      const displayAnswers = stat.textAnswers.slice(0, 5);
      displayAnswers.forEach((answer) => {
        content.push({
          text: answer,
          style: 'textAnswer',
          margin: [10, 2, 0, 2] as [number, number, number, number],
        });
      });

      if (stat.textAnswers.length > 5) {
        content.push({
          text: `... і ще ${stat.textAnswers.length - 5} відповідей`,
          italics: true,
          color: '#6b7280',
          fontSize: 9,
          margin: [10, 5, 0, 0] as [number, number, number, number],
        });
      }

      content.push({ text: '', margin: [0, 0, 0, 10] as [number, number, number, number] });
    }

    // Separator between questions
    if (index < stats.length - 1) {
      content.push({
        canvas: [
          {
            type: 'line',
            x1: 0,
            y1: 0,
            x2: 515,
            y2: 0,
            lineWidth: 0.5,
            lineColor: '#e5e7eb',
          },
        ],
        margin: [0, 10, 0, 0] as [number, number, number, number],
      });
    }
  });

  // Footer
  content.push({
    text: `Згенеровано: ${new Date().toLocaleString('uk-UA')}`,
    style: 'footer',
    alignment: 'center',
    margin: [0, 30, 0, 0] as [number, number, number, number],
  });

  const docDefinition: TDocumentDefinitions = {
    content,
    styles: {
      header: {
        fontSize: 22,
        bold: true,
        color: '#1f2937',
      },
      surveyTitle: {
        fontSize: 18,
        bold: true,
        color: '#374151',
      },
      description: {
        fontSize: 11,
        color: '#6b7280',
      },
      question: {
        fontSize: 13,
        bold: true,
        color: '#1f2937',
      },
      questionInfo: {
        fontSize: 9,
        color: '#9ca3af',
      },
      textAnswer: {
        fontSize: 10,
        color: '#4b5563',
        background: '#f9fafb',
      },
      footer: {
        fontSize: 8,
        color: '#9ca3af',
      },
    },
    defaultStyle: {
      font: 'Roboto',
    },
    pageMargins: [40, 40, 40, 40] as [number, number, number, number],
  };

  pdfMake.createPdf(docDefinition).download(`${survey.title.replace(/[^a-zа-яіїє0-9]/gi, '_')}_zvit.pdf`);
};

// ============ USER TYPES ============
export interface User {
  _id: string;
  email: string;
  username?: string;
  name?: string;
  googleId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    accessToken: string;
  };
  message: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
  name?: string;
}

// ============ SURVEY TYPES ============
export type QuestionType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'rating' | 'date';

export interface QuestionOption {
  text: string;
  value: string;
}

export type SkipLogicOperator =
  | 'equals'         // Точна відповідь
  | 'not_equals'     // Не дорівнює
  | 'contains'       // Містить варіант (для checkbox)
  | 'not_contains'   // Не містить
  | 'is_answered';   // Просто відповіли

export interface SkipLogic {
  enabled: boolean;
  condition?: {
    questionId: string;           // ID питання на яке дивимось
    operator: SkipLogicOperator;  // Тип перевірки
    value?: string | number;      // Очікуване значення
  };
}

export interface Question {
  _id?: string;
  id?: string; // For frontend-created questions before saving
  text: string;
  type: QuestionType;
  options?: string[] | QuestionOption[];
  required: boolean;
  order?: number;
  skipLogic?: SkipLogic;
}

export interface Survey {
  _id: string;
  title: string;
  description?: string;
  questions: Question[];
  creator: string | User;
  isActive: boolean;
  uniqueLink: string;
  allowMultipleResponses?: boolean;
  participantLimit?: number | null;
  createdAt: string;
  updatedAt: string;
  aiGenerated?: boolean;
  aiProvider?: string;
}

export interface CreateSurveyInput {
  title: string;
  description?: string;
  questions: Omit<Question, '_id'>[];
}

// ============ RESPONSE TYPES ============
export interface ResponseAnswer {
  questionId: string;
  answer: string | string[];
}

export interface SurveyResponse {
  _id: string;
  survey: string | Survey;
  answers: ResponseAnswer[];
  submittedAt: string;
}

export interface SubmitResponseInput {
  answers: ResponseAnswer[];
}

// ============ STATISTICS TYPES ============
export interface QuestionStats {
  text: string;
  type: QuestionType;
  answers: Record<string, number>;
  totalResponses: number;
}

export interface SurveyStats {
  totalResponses: number;
  questionStats: QuestionStats[];
}

export interface DashboardStats {
  activeSurveys: number;
  completedSurveys: number;
  totalResponses: number;
  recentSurveys: Survey[];
}

// ============ AI TYPES ============
export interface AIGenerateSurveyInput {
  topic: string;
  goal?: string;
  questionCount?: number;
  questionTypes?: QuestionType[];
  additionalInstructions?: string;
}

export interface AIGeneratedSurvey {
  title: string;
  description: string;
  questions: Omit<Question, '_id'>[];
  aiGenerated: boolean;
  aiProvider: string;
}

export interface AIAnalysisResult {
  analysis: string;
  metadata: {
    surveyTitle: string;
    totalResponses: number;
    analyzedAt: string;
    aiProvider: string;
  };
}

export interface AIChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  message: string;
  history: AIChatMessage[];
}

// ============ API RESPONSE TYPES ============
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  message: string;
  errors?: string[];
}

// ============ FORM TYPES ============
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  validation?: (value: any) => string | undefined;
}

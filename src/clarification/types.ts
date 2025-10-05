export type MissingInfoType =
  | "framework"
  | "port"
  | "database"
  | "authentication"
  | "styling"
  | "testFramework";

export type ClarificationQuestionType = "choice" | "text" | "number";

export interface ClarificationQuestion {
  id: string;
  text: string;
  type: ClarificationQuestionType;
  options?: string[];
}

export interface ClarificationRequest {
  questions: ClarificationQuestion[];
}

export interface ClarificationAnswer {
  questionId: string;
  value: string | number | boolean;
}

export interface ClarificationResponse {
  answers: ClarificationAnswer[];
}

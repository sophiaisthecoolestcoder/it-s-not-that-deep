export type AssistantObjectType = 'offer' | 'guest' | 'employee' | 'daily_briefing';

export type AssistantObjectAction = 'open' | 'download';

export interface AssistantObjectRef {
  object_type: AssistantObjectType;
  object_id: string;
  title: string;
  subtitle?: string;
  actions?: AssistantObjectAction[];
}

export interface AskAssistantResponse {
  question: string;
  answer: string;
  role: string;
  tools_available: string[];
  references: AssistantObjectRef[];
}

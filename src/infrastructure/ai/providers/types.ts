export interface AiChatRequest {
  system?: string;
  user: string;
  temperature?: number;
  /** optional stream callback — providers may support later */
  onToken?: (token: string) => void;
}

export interface AiChatResult {
  ok: boolean;
  text?: string;
  model?: string;
  provider?: string;
  error?: string;
  needsSetup?: boolean;
}

export interface AiProvider {
  name: string;
  chat(req: AiChatRequest): Promise<AiChatResult>;
}

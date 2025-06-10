
export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  type: 'text' | 'file_info'; // type can be simplified if ChatMessageItem handles rendering based on content
  text: string; // User's typed text or AI's response text
  files?: File[]; // Array of files for user messages
  timestamp: Date;
  isStreaming?: boolean;
}

export interface User {
  email: string;
  // Add other user properties if needed
}

// New type for communication from aiService to ChatLayout
export type AiServiceChunk =
  | { type: 'status'; text: string }
  | { type: 'content'; text: string; isPartial: boolean };

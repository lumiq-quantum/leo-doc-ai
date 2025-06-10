export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  type: 'text' | 'file_info';
  text: string;
  file?: File;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface User {
  email: string;
  // Add other user properties if needed
}

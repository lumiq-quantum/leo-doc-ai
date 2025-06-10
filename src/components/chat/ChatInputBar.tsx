
"use client";

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { FileUploadButton } from './FileUploadButton';

interface ChatInputBarProps {
  onSendMessage: (text: string, file?: File) => void;
  isSending: boolean;
}

export function ChatInputBar({ onSendMessage, isSending }: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | undefined>(undefined);

  const handleSend = () => {
    if (inputText.trim() === '' && !selectedFile) return;
    onSendMessage(inputText.trim(), selectedFile);
    setInputText('');
    setSelectedFile(undefined);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    // Optionally, you could auto-send or require text with file.
    // For now, user must click send or press enter.
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t bg-background p-4 shadow- ऊपर">
      {selectedFile && (
        <div className="mb-2 text-sm text-muted-foreground">
          Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
          <Button variant="link" size="sm" className="ml-2 p-0 h-auto text-destructive" onClick={() => setSelectedFile(undefined)}>
            Remove
          </Button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <FileUploadButton onFileSelect={handleFileSelect} disabled={isSending || !!selectedFile} />
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message or upload a document..."
          className="flex-1 resize-none rounded-full border-2 border-border focus-visible:ring-primary/50 px-4 py-2.5 min-h-[48px] max-h-[120px]"
          rows={1}
          disabled={isSending}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={isSending || (inputText.trim() === '' && !selectedFile)}
          className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-full p-3"
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

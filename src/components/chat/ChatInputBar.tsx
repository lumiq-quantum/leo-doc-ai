
"use client";

import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, XCircle } from 'lucide-react';
import { FileUploadButton } from './FileUploadButton';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ChatInputBarProps {
  onSendMessage: (text: string, files?: File[]) => void;
  isSending: boolean;
  isFileUploading?: boolean; // New prop
}

export function ChatInputBar({ onSendMessage, isSending, isFileUploading }: ChatInputBarProps) {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDisabled = isSending || isFileUploading; // Combined disabled state

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${scrollHeight}px`;
    }
  }, [inputText]);

  const handleSend = () => {
    if (inputText.trim() === '' && selectedFiles.length === 0) return;
    onSendMessage(inputText.trim(), selectedFiles.length > 0 ? selectedFiles : undefined);
    setInputText('');
    setSelectedFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && !isDisabled) { // Check isDisabled here
      event.preventDefault();
      handleSend();
    }
  };

  const handleFilesSelect = (newFiles: File[]) => {
    setSelectedFiles(prevFiles => {
      const updatedFiles = [...prevFiles];
      newFiles.forEach(newFile => {
        if (!prevFiles.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size && existingFile.lastModified === newFile.lastModified)) {
          updatedFiles.push(newFile);
        }
      });
      return updatedFiles;
    });
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 border-t bg-background p-4 shadow-lg">
      {selectedFiles.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {selectedFiles.map((file, index) => (
            <Badge key={index} variant="secondary" className="flex items-center gap-1.5 pr-1.5 group">
              <span className="text-xs">{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
              <button
                type="button"
                onClick={() => handleRemoveFile(file)}
                className="rounded-full opacity-50 group-hover:opacity-100 hover:bg-muted focus:outline-none"
                aria-label={`Remove ${file.name}`}
                disabled={isDisabled} // Disable remove button when processing
              >
                <XCircle size={14} className="text-muted-foreground hover:text-destructive" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <div className="flex items-end gap-2">
        <FileUploadButton onFileSelect={handleFilesSelect} disabled={isDisabled} />
        <Textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={isFileUploading ? "Uploading files..." : (isSending ? "Waiting for LEO Doc AI..." : "Type your message or upload documents...")}
          className="flex-1 resize-none rounded-2xl border-2 border-border focus-visible:ring-primary/50 px-4 py-2.5 min-h-[48px] max-h-[120px] overflow-y-auto"
          disabled={isDisabled}
        />
        <Button
          type="button"
          onClick={handleSend}
          disabled={isDisabled || (inputText.trim() === '' && selectedFiles.length === 0)}
          className={cn(
            "h-12 w-12 bg-accent hover:bg-accent/90 text-accent-foreground rounded-full self-end flex items-center justify-center"
          )}
          aria-label="Send message"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

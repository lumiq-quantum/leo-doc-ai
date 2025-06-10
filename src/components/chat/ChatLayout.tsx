
"use client";

import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { AppHeader } from '@/components/common/AppHeader';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInputBar } from './ChatInputBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { streamChatResponse } from '@/lib/aiService'; // Mock AI service
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '../ui/button';

export function ChatLayout() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAISending, setIsAISending] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Initial welcome message from AI
  useEffect(() => {
    setMessages([
      {
        id: 'ai-welcome',
        sender: 'ai',
        type: 'text',
        text: "Hello! I am DocumentIQ. How can I assist you today? You can ask questions or upload a document for analysis.",
        timestamp: new Date(),
      }
    ]);
  }, []);


  const handleSendMessage = async (text: string, file?: File) => {
    setIsAISending(true);
    const userMessageId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      type: file ? 'file_info' : 'text',
      text: file ? (text || `Uploaded: ${file.name}`) : text,
      file: file,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    const aiMessageId = `ai-${Date.now()}`;
    const initialAIMessage: ChatMessage = {
      id: aiMessageId,
      sender: 'ai',
      type: 'text',
      text: '',
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, initialAIMessage]);

    try {
      await streamChatResponse(
        text,
        file,
        (chunk) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: msg.text + chunk } : msg
            )
          );
        },
        () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsAISending(false);
        },
        (error) => {
          console.error('AI Error:', error);
          toast({
            title: "AI Error",
            description: "Sorry, I encountered an error processing your request.",
            variant: "destructive",
          });
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: "Sorry, an error occurred.", isStreaming: false } : msg
            )
          );
          setIsAISending(false);
        }
      );
    } catch (error) {
        // This catch is mostly for unexpected errors in streamChatResponse setup, actual errors are handled by onError callback
        console.error("Failed to initiate AI stream:", error);
        toast({
            title: "Error",
            description: "Could not connect to AI service.",
            variant: "destructive",
        });
        setIsAISending(false);
         setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: "Error connecting to AI.", isStreaming: false } : msg
            )
          );
    }
  };

  return (
    <div className="flex h-screen flex-col bg-secondary">
      <AppHeader />
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef} viewportRef={viewportRef}>
        <div className="mx-auto max-w-3xl space-y-1 pb-4">
          {messages.map((msg) => (
            <ChatMessageItem key={msg.id} message={msg} />
          ))}
           {messages.length > 0 && messages[messages.length - 1].sender === 'ai' && !messages[messages.length - 1].isStreaming && (
            <div className="flex justify-start pl-10 pt-1">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                <ThumbsUp size={16} className="mr-1" />
              </Button>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                <ThumbsDown size={16} className="mr-1" />
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
      <ChatInputBar onSendMessage={handleSendMessage} isSending={isAISending} />
    </div>
  );
}


"use client";

import { useState, useEffect, useRef } from 'react';
import type { ChatMessage } from '@/types';
import { AppHeader } from '@/components/common/AppHeader';
import { ChatMessageItem } from './ChatMessageItem';
import { ChatInputBar } from './ChatInputBar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { streamChatResponse } from '@/lib/aiService';
import { useToast } from '@/hooks/use-toast';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { Button } from '../ui/button';

const CHAT_API_BASE_URL = 'http://127.0.0.1:8000'; // As per API spec

export function ChatLayout() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAISending, setIsAISending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize session
    async function initSession() {
      const newSessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      try {
        const response = await fetch(`${CHAT_API_BASE_URL}/apps/doc_agent/users/user/sessions/${newSessionId}`, {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Empty body as per cURL example for session creation
        });

        if (response.ok) {
          setSessionId(newSessionId);
          console.log("Chat session created:", newSessionId);
          // No initial welcome message from AI
        } else {
          const errorData = await response.text();
          console.error("Failed to create session:", response.status, errorData);
          toast({
            title: "Initialization Error",
            description: "Could not initialize chat session. Please refresh the page.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Error creating session:", error);
        toast({
          title: "Network Error",
          description: "Could not connect to initialize chat session. Please check your connection or try again later.",
          variant: "destructive",
        });
      }
    }

    if (!sessionId) {
      initSession();
    }
  }, [sessionId, toast]);


  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({ top: viewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text: string, file?: File) => {
    if (!sessionId) {
      toast({
        title: "Session Error",
        description: "Chat session not ready. Please wait or refresh.",
        variant: "destructive",
      });
      return;
    }

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
        userMessage.text, 
        file,
        sessionId,
        (chunkData) => { // onChunk receives { text: string; isPartial: boolean }
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                return {
                  ...msg,
                  text: chunkData.isPartial ? msg.text + chunkData.text : chunkData.text,
                };
              }
              return msg;
            })
          );
        },
        () => { // onComplete
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, isStreaming: false } : msg
            )
          );
          setIsAISending(false);
        },
        (error) => { // onError
          console.error('AI Error:', error);
          toast({
            title: "AI Error",
            description: error.message || "Sorry, I encountered an error processing your request.",
            variant: "destructive",
          });
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: `Sorry, an error occurred: ${error.message}`, isStreaming: false } : msg
            )
          );
          setIsAISending(false);
        }
      );
    } catch (error) {
        console.error("Failed to initiate AI stream:", error);
        toast({
            title: "Error",
            description: (error instanceof Error ? error.message : "Could not connect to AI service."),
            variant: "destructive",
        });
        setMessages((prev) =>
            prev.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: "Error connecting to AI.", isStreaming: false } : msg
            )
          );
        setIsAISending(false);
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

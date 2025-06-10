
"use client";

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, Bot, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

  // Basic styling for markdown elements to match the chat bubble
  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 className="text-xl font-semibold my-2" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-lg font-semibold my-1.5" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-base font-semibold my-1" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-1 last:mb-0" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside my-1 pl-2" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside my-1 pl-2" {...props} />,
    li: ({node, ...props}: any) => <li className="mb-0.5" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold" {...props} />,
    em: ({node, ...props}: any) => <em className="italic" {...props} />,
    a: ({node, ...props}: any) => <a className="underline hover:text-accent" target="_blank" rel="noopener noreferrer" {...props} />,
    // Add more custom renderers as needed
  };

  return (
    <div
      className={cn(
        'flex items-end gap-2 py-3',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {isAI && (
        <Avatar className="h-8 w-8 self-start mt-1">
          <AvatarFallback className="bg-primary text-primary-foreground">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <Card
        className={cn(
          'max-w-[70%] rounded-xl p-0 shadow-md',
          isUser ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-card text-card-foreground rounded-bl-none border-primary/20'
        )}
      >
        <CardContent className="p-3">
          {message.type === 'file_info' && message.file && (
            <div className="mb-1 flex items-center gap-2 p-2 rounded-md bg-background/10">
              <FileText size={24} className={isUser ? "text-primary-foreground/80" : "text-primary"} />
              <div className="flex flex-col">
                <span className="font-medium text-sm">{message.file.name}</span>
                <span className="text-xs opacity-80">{(message.file.size / 1024).toFixed(2)} KB</span>
              </div>
            </div>
          )}
          
          {isAI ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-current">
               <ReactMarkdown components={markdownComponents}>
                {message.text}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.text}
            </p>
          )}

          {isAI && message.isStreaming && (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current ml-1 align-middle" />
          )}

          <p className={cn(
            "mt-1.5 text-xs",
            isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground text-left"
          )}>
            {format(message.timestamp, 'p')}
          </p>
        </CardContent>
      </Card>
      {isUser && (
        <Avatar className="h-8 w-8 self-start mt-1">
          <AvatarFallback className="bg-accent text-accent-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

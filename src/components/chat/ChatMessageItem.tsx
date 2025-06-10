
"use client";

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Bot, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Badge } from '@/components/ui/badge'; // Added for file display

interface ChatMessageItemProps {
  message: ChatMessage;
}

export function ChatMessageItem({ message }: ChatMessageItemProps) {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';

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
          {isUser && message.files && message.files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {message.files.map((file, index) => (
                <Badge key={index} variant={isUser ? "secondary" : "outline"} className={cn(
                  "flex items-center gap-1.5 text-xs p-1.5",
                  isUser ? "bg-primary-foreground/20 text-primary-foreground" : "border-primary/30 text-primary"
                )}>
                  <FileText size={14} />
                  <span>{file.name}</span>
                  <span className="opacity-70">({(file.size / 1024).toFixed(1)}KB)</span>
                </Badge>
              ))}
            </div>
          )}
          
          {message.text && (
            isAI ? (
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-current">
                 <ReactMarkdown components={markdownComponents}>
                  {message.text}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.text}
              </p>
            )
          )}

          {isAI && message.isStreaming && !message.text && (
             <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current ml-1 align-middle" />
          )}
          {isAI && message.isStreaming && message.text && (
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


"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FileUploadButtonProps {
  onFileSelect: (files: File[]) => void; // Changed to accept File[]
  disabled?: boolean;
  className?: string;
}

export function FileUploadButton({ onFileSelect, disabled, className }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.size > 5 * 1024 * 1024) { // 5MB limit per file
          toast({
            title: `File too large: ${file.name}`,
            description: "Please select files smaller than 5MB.",
            variant: "destructive",
          });
        } else {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        onFileSelect(validFiles);
      }
      // Reset file input to allow selecting the same file(s) again
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png" // Example file types
        disabled={disabled}
        multiple // Added multiple attribute
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Attach documents"
        className={cn("h-12 w-12 text-primary hover:text-primary/80", className)}
      >
        <Paperclip className="h-5 w-5" />
      </Button>
    </>
  );
}

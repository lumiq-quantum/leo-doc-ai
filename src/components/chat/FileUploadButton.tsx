
"use client";

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadButtonProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploadButton({ onFileSelect, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select a file smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }
      onFileSelect(file);
      // Reset file input to allow selecting the same file again
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
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={disabled}
        aria-label="Attach document"
        className="text-primary hover:text-primary/80"
      >
        <Paperclip className="h-5 w-5" />
      </Button>
    </>
  );
}

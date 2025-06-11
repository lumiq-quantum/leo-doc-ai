
"use client";

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import Image from 'next/image';

export function AppHeader() {
  const { logout, user } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b bg-background/95 px-4 shadow-sm backdrop-blur-md md:px-6">
      <div className="flex items-center">
         <Image 
           src="https://litecone.ai/wp-content/uploads/2025/01/08.jpg" 
           alt="LEO Doc AI Logo" 
           width={32} 
           height={32} 
           className="mr-2 rounded-md" 
         />
        <h1 className="text-xl font-headline font-semibold text-primary">LEO Doc AI</h1>
      </div>
      <div className="flex items-center gap-4">
        {user && <span className="text-sm text-muted-foreground hidden sm:inline">Welcome, {user.email}</span>}
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </header>
  );
}

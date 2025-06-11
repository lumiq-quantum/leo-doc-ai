
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LoginForm } from '@/components/auth/LoginForm';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import Image from 'next/image';

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <LoadingSpinner size={48} />
        <p className="mt-4 text-muted-foreground">Preparing LEO Doc AI...</p>
      </div>
    );
  }
  
  if (isAuthenticated) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <LoadingSpinner size={48} />
         <p className="mt-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-4 antialiased overflow-hidden">
      <Image
        src="https://placehold.co/1920x1080.png"
        alt="Abstract background"
        layout="fill"
        objectFit="cover"
        quality={75}
        priority // Prioritize loading for LCP
        className="-z-20 animate-pulse-slowly" // Furthest behind, subtle animation
        data-ai-hint="futuristic technology network" // Updated hint
      />
      {/* Overlay for readability & aesthetic */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-black/60 via-slate-950/70 to-black/60"></div>

      <div className="z-0 flex flex-col items-center text-center max-w-md w-full px-4">
        <div className="mb-10 flex flex-col items-center">
          <Image 
            src="https://placehold.co/100x100.png?text=LD" 
            alt="LEO Doc AI Logo" 
            data-ai-hint="logo abstract tech" 
            width={90} 
            height={90} 
            className="rounded-2xl mb-6 shadow-2xl border-2 border-primary/20" 
          />
          <h1 className="text-5xl md:text-6xl font-headline font-bold text-transparent bg-clip-text bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-50 drop-shadow-[0_2px_3px_rgba(0,0,0,0.6)]">
            LEO Doc AI
          </h1>
          <p className="mt-3 text-lg md:text-xl text-neutral-300/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
            Intelligent Document Interaction
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}

// Add this to globals.css or tailwind.config.js if you want the animation globally
// For now, defining it locally in tailwind.config is better if not already there.
// tailwind.config.ts keyframes:
// 'pulse-slowly': {
//   '0%, 100%': { opacity: '0.8' },
//   '50%': { opacity: '1' },
// }
// animation:
// 'pulse-slowly': 'pulse-slowly 5s cubic-bezier(0.4, 0, 0.6, 1) infinite',

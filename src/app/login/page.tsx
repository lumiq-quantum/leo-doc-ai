
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
        <LoadingSpinner size={48} />
      </div>
    );
  }
  
  // Prevent rendering LoginForm if already authenticated and waiting for redirect
  if (isAuthenticated) {
     return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <div className="mb-8 flex flex-col items-center">
        <Image src="https://placehold.co/100x100.png?text=LD" alt="LEO Doc AI Logo" data-ai-hint="logo lettermark" width={80} height={80} className="rounded-lg" />
        <h1 className="mt-4 text-3xl font-headline font-bold text-primary">LEO Doc AI</h1>
        <p className="text-muted-foreground">Intelligent Document Interaction</p>
      </div>
      <LoginForm />
    </div>
  );
}

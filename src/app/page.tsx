
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ChatLayout } from '@/components/chat/ChatLayout';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';


export default function DocumentIQAppPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary">
        <LoadingSpinner size={48} />
        <p className="ml-4 text-lg text-muted-foreground">Loading DocumentIQ...</p>
      </div>
    );
  }

  return <ChatLayout />;
}

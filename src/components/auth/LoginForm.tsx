
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Keep this import
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const form = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setIsSubmitting(true);
    const success = await login(data.email, data.password);
    if (!success) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-sm shadow-2xl bg-black/30 dark:bg-slate-900/50 backdrop-blur-lg border border-white/10 dark:border-slate-700/40 rounded-xl">
      <CardHeader className="pt-8">
        <CardTitle className="text-3xl font-headline text-neutral-100 text-center">Welcome Back</CardTitle>
        <CardDescription className="text-neutral-300/90 text-center pt-1">
          Enter your credentials to access LEO Doc AI.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 px-6 pb-6 pt-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300/80">Email Address</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      {...field}
                      className="bg-slate-700/30 border-slate-600/50 text-neutral-100 placeholder:text-neutral-400/70 focus:bg-slate-600/50 focus:ring-accent/70"
                      data-ai-hint="email input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-neutral-300/80">Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...field}
                      className="bg-slate-700/30 border-slate-600/50 text-neutral-100 placeholder:text-neutral-400/70 focus:bg-slate-600/50 focus:ring-accent/70"
                      data-ai-hint="password input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="px-6 pb-8">
            <Button 
              type="submit" 
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold py-3 text-base transition-all duration-300 ease-in-out transform hover:scale-105" 
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Verifying...' : 'Login Securely'}
              {!isSubmitting && <LogIn className="ml-2 h-5 w-5" />}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

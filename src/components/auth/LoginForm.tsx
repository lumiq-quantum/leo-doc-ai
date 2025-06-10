
"use client";

import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    // On success, AuthContext handles redirect
    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-sm shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline">Welcome Back</CardTitle>
        <CardDescription>Enter your credentials to access DocumentIQ.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="email">Email</FormLabel>
                  <FormControl>
                    <Input
                      id="email"
                      type="email"
                      placeholder="demouser@lumiq.ai"
                      {...field}
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
                  <FormLabel htmlFor="password">Password</FormLabel>
                  <FormControl>
                    <Input
                      id="password"
                      type="password"
                      placeholder="lumiq123"
                      {...field}
                      data-ai-hint="password input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
              {!isSubmitting && <LogIn className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, User, LogIn } from 'lucide-react';

export function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const result = login(username, password);
    if (!result.success) {
      setError(result.error);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-secondary opacity-50"></div>
      
      <Card className="w-full max-w-md glass-effect animate-fade-in-up relative z-10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full gold-gradient flex items-center justify-center">
            <Lock className="w-8 h-8 text-black" />
          </div>
          <CardTitle className="text-2xl font-bold gold-gradient bg-clip-text text-transparent">
            تسجيل دخول الإدارة
          </CardTitle>
          <p className="text-muted-foreground">Admin Panel Login</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                اسم المستخدم
              </label>
              <Input
                type="text"
                placeholder="fahmy or ewis"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="glass-effect border-primary/20 focus:border-primary"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Lock className="w-4 h-4" />
                كلمة المرور
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-effect border-primary/20 focus:border-primary"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit"
              className="w-full gold-gradient text-black font-semibold hover-lift"
            >
              <LogIn className="w-4 h-4 mr-2" />
              تسجيل الدخول
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

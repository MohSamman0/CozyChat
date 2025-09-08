'use client';

import { motion } from 'framer-motion';
import { Header, Container } from '@/components/layout';
import { Button, Card, CardHeader, CardTitle, CardContent, Input } from '@/components/ui';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [interestInput, setInterestInput] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const parseInterests = (input: string): string[] => {
    return input
      .split(',')
      .map(i => i.trim().toLowerCase())
      .filter(i => i.length > 0)
      .slice(0, 10); // Limit to 10 interests
  };

  const handleStartChat = () => {
    const parsedInterests = parseInterests(interestInput);
    
    // Store in session storage
    sessionStorage.setItem('cozy-chat-interests', JSON.stringify(parsedInterests));
    
    setIsStarting(true);
    // Simulate a brief loading state before navigation
    setTimeout(() => {
      router.push('/chat');
    }, 800);
  };

  const handleLearnMore = () => {
    // Scroll to features section
    const featuresSection = document.querySelector('.features-section');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <Header />
      <main 
        className="min-h-screen"
        style={{
          background: `linear-gradient(to bottom right, var(--cozy-bg), var(--cozy-surface-2), var(--cozy-bg))`,
          backgroundColor: 'var(--cozy-bg)'
        }}
      >
        <Container>
          <div className="py-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center mb-16"
            >
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="font-display text-5xl md:text-6xl lg:text-7xl font-bold mb-6"
                style={{ color: 'var(--cozy-text)' }}
              >
                Welcome to CozyChat
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed"
                style={{ color: 'var(--cozy-text-muted)' }}
              >
                A warm & cozy place to connect with strangers through anonymous text conversations
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center items-center"
              >
                <Button 
                  size="lg"
                  onClick={handleStartChat}
                  isLoading={isStarting}
                >
                  {isStarting ? '🚀 Starting...' : '🚀 Start Chatting Now'}
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={handleLearnMore}
                >
                  📖 Learn More
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="max-w-md mx-auto mt-8"
              >
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-lg">
                    🏷️
                  </div>
                  <input
                    type="text"
                    placeholder="Your interests (optional)"
                    value={interestInput}
                    onChange={(e) => setInterestInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-500 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 transition-all duration-200"
                    style={{ 
                      backgroundColor: 'var(--cozy-surface)',
                      borderColor: 'var(--cozy-border)',
                      color: 'var(--cozy-text)'
                    }}
                  />
                </div>
                <p className="text-sm text-center mt-2" style={{ color: 'var(--cozy-text-muted)' }}>
                  Add interests to find people with similar hobbies
                </p>
              </motion.div>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16 features-section">
              <Card animate>
                <CardHeader>
                  <CardTitle>🔒 Anonymous & Safe</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>No registration required. Chat anonymously with complete privacy protection and robust moderation.</p>
                </CardContent>
              </Card>

              <Card animate>
                <CardHeader>
                  <CardTitle>💬 Text-Only Focus</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Pure text conversations without distractions. Focus on meaningful connections through words.</p>
                </CardContent>
              </Card>

              <Card animate>
                <CardHeader>
                  <CardTitle>🎨 Beautiful Design</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Warm, cozy interface designed for comfort with smooth animations and delightful interactions.</p>
                </CardContent>
              </Card>

              <Card animate>
                <CardHeader>
                  <CardTitle>⚡ Instant Connections</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Get matched with someone new in seconds. Real-time messaging with typing indicators.</p>
                </CardContent>
              </Card>

              <Card animate>
                <CardHeader>
                  <CardTitle>🏷️ Interest Matching</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Optional tags to connect with like-minded people who share your interests and hobbies.</p>
                </CardContent>
              </Card>

              <Card animate>
                <CardHeader>
                  <CardTitle>🌟 Quality First</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>AI-powered moderation and community guidelines ensure positive, respectful conversations.</p>
                </CardContent>
              </Card>
            </div>

          </div>
        </Container>
      </main>
    </>
  );
}

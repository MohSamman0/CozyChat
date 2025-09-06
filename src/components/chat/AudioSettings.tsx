'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { audioManager } from '@/lib/audio';

interface AudioSettingsProps {
  isVisible: boolean;
  onClose: () => void;
}

export const AudioSettings = ({ isVisible, onClose }: AudioSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(audioManager.getEnabled());
  const [volume, setVolume] = useState(audioManager.getVolume());
  const [testingAudio, setTestingAudio] = useState(false);

  useEffect(() => {
    setIsEnabled(audioManager.getEnabled());
    setVolume(audioManager.getVolume());
  }, [isVisible]);

  const handleToggleAudio = (enabled: boolean) => {
    setIsEnabled(enabled);
    audioManager.setEnabled(enabled);
    
    if (enabled) {
      audioManager.playSuccess();
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    audioManager.setVolume(newVolume);
  };

  const handleTestAudio = async () => {
    if (testingAudio) return;
    
    setTestingAudio(true);
    
    try {
      await audioManager.testAudio();
      setTimeout(() => setTestingAudio(false), 1000);
    } catch (error) {
      console.error('Audio test failed:', error);
      setTestingAudio(false);
    }
  };

  const testSounds = [
    { name: 'Message Received', action: () => audioManager.playMessageReceived(), icon: '📥' },
    { name: 'Message Sent', action: () => audioManager.playMessageSent(), icon: '📤' },
    { name: 'User Connected', action: () => audioManager.playUserConnected(), icon: '🟢' },
    { name: 'User Disconnected', action: () => audioManager.playUserDisconnected(), icon: '🔴' },
    { name: 'Typing', action: () => audioManager.playTypingIndicator(), icon: '⌨️' },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    🔊 Audio Settings
                  </span>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    ×
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable Audio */}
                <div className="space-y-3">
                  <h3 className="font-medium text-cozy-brown-800">Sound Notifications</h3>
                  <div className="flex items-center gap-4">
                    <Button
                      variant={isEnabled ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handleToggleAudio(true)}
                    >
                      🔊 Enabled
                    </Button>
                    <Button
                      variant={!isEnabled ? "primary" : "outline"}
                      size="sm"
                      onClick={() => handleToggleAudio(false)}
                    >
                      🔇 Disabled
                    </Button>
                  </div>
                </div>

                {/* Volume Control */}
                {isEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <h3 className="font-medium text-cozy-brown-800">Volume</h3>
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={volume}
                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                        className="w-full h-2 bg-cozy-brown-200 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #f97316 0%, #f97316 ${volume * 100}%, #d6d3d1 ${volume * 100}%, #d6d3d1 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-cozy-brown-500">
                        <span>Quiet</span>
                        <span>{Math.round(volume * 100)}%</span>
                        <span>Loud</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Test Audio */}
                {isEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    <h3 className="font-medium text-cozy-brown-800">Test Sounds</h3>
                    
                    {/* General Test */}
                    <Button
                      onClick={handleTestAudio}
                      disabled={testingAudio}
                      variant="outline"
                      className="w-full"
                    >
                      {testingAudio ? (
                        <motion.span
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 0.5, repeat: Infinity }}
                        >
                          🎵 Testing...
                        </motion.span>
                      ) : (
                        '🎵 Test Audio'
                      )}
                    </Button>

                    {/* Specific Sound Tests */}
                    <div className="grid grid-cols-1 gap-2">
                      {testSounds.map((sound) => (
                        <button
                          key={sound.name}
                          onClick={sound.action}
                          className="flex items-center gap-3 p-2 rounded-lg border border-cozy-brown-200 hover:bg-cozy-orange-50 hover:border-cozy-orange-300 transition-colors text-sm text-left"
                        >
                          <span>{sound.icon}</span>
                          <span>{sound.name}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Audio Info */}
                <div className="bg-cozy-orange-50 border border-cozy-orange-200 rounded-lg p-3">
                  <p className="text-sm text-cozy-orange-700">
                    💡 <strong>Tip:</strong> Sound notifications help you know when messages arrive, 
                    users connect, or someone is typing - even when the tab isn&apos;t active!
                  </p>
                </div>

                {/* Close Button */}
                <Button onClick={onClose} className="w-full">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

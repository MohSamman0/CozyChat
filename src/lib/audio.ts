// Audio notifications for chat events
export class AudioManager {
  private audioContext: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Check if user has previously disabled audio
    const audioEnabled = localStorage.getItem('cozy-chat-audio-enabled');
    if (audioEnabled !== null) {
      this.isEnabled = audioEnabled === 'true';
    }

    const savedVolume = localStorage.getItem('cozy-chat-audio-volume');
    if (savedVolume) {
      this.volume = parseFloat(savedVolume);
    }
  }

  private async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    // Resume audio context if it's suspended
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext;
  }

  private async createBeep(frequency: number, duration: number, volume: number = this.volume): Promise<void> {
    if (!this.isEnabled) return;

    try {
      const context = await this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.frequency.setValueAtTime(frequency, context.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(volume, context.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + duration);

      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + duration);
    } catch (error) {
      console.warn('Audio notification failed:', error);
    }
  }

  // Sound for incoming messages
  async playMessageReceived(): Promise<void> {
    await this.createBeep(800, 0.1);
    setTimeout(() => this.createBeep(600, 0.1), 100);
  }

  // Sound for message sent
  async playMessageSent(): Promise<void> {
    await this.createBeep(600, 0.08);
  }

  // Sound for user connected
  async playUserConnected(): Promise<void> {
    await this.createBeep(523, 0.15); // C
    setTimeout(() => this.createBeep(659, 0.15), 150); // E
    setTimeout(() => this.createBeep(784, 0.15), 300); // G
  }

  // Sound for user disconnected
  async playUserDisconnected(): Promise<void> {
    await this.createBeep(784, 0.15); // G
    setTimeout(() => this.createBeep(659, 0.15), 150); // E
    setTimeout(() => this.createBeep(523, 0.15), 300); // C
  }

  // Sound for typing indicator
  async playTypingIndicator(): Promise<void> {
    await this.createBeep(400, 0.05, this.volume * 0.3);
  }

  // Sound for error/warning
  async playError(): Promise<void> {
    await this.createBeep(300, 0.2);
    setTimeout(() => this.createBeep(250, 0.2), 250);
  }

  // Sound for successful action
  async playSuccess(): Promise<void> {
    await this.createBeep(600, 0.1);
    setTimeout(() => this.createBeep(800, 0.1), 100);
    setTimeout(() => this.createBeep(1000, 0.1), 200);
  }

  // Settings management
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    localStorage.setItem('cozy-chat-audio-enabled', enabled.toString());
  }

  getEnabled(): boolean {
    return this.isEnabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('cozy-chat-audio-volume', this.volume.toString());
  }

  getVolume(): number {
    return this.volume;
  }

  // Test audio functionality
  async testAudio(): Promise<void> {
    await this.createBeep(440, 0.5); // A4 note
  }
}

// Global audio manager instance
export const audioManager = new AudioManager();

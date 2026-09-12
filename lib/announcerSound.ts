/**
 * Announcer & Sound FX Engine for MT-Vocab Live Session
 * 100% Original arcade synth audio via Web Audio API + Speech Synthesis
 */

class AnnouncerEngine {
    private audioCtx: AudioContext | null = null;
    private soundEnabled: boolean = true;

    constructor() {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('mt_vocab_announcer_sound');
            this.soundEnabled = saved !== 'false';
        }
    }

    public isEnabled(): boolean {
        return this.soundEnabled;
    }

    public setEnabled(enabled: boolean): void {
        this.soundEnabled = enabled;
        if (typeof window !== 'undefined') {
            localStorage.setItem('mt_vocab_announcer_sound', enabled ? 'true' : 'false');
        }
    }

    private getAudioContext(): AudioContext | null {
        if (typeof window === 'undefined') return null;
        try {
            if (!this.audioCtx) {
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    this.audioCtx = new AudioContextClass();
                }
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().catch(() => {});
            }
            return this.audioCtx;
        } catch {
            return null;
        }
    }

    /**
     * Original Arcade Turn Announcement Fanfare (Synth Chimes)
     */
    public playArcadeTurnIntro(): void {
        if (!this.soundEnabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const now = ctx.currentTime;
            
            // Rapid 3-note arcade power chord (C5 -> E5 -> G5 -> C6)
            const notes = [523.25, 659.25, 783.99, 1046.50];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = i === 3 ? 'triangle' : 'sawtooth';
                osc.frequency.setValueAtTime(freq, now + i * 0.07);

                gain.gain.setValueAtTime(0, now + i * 0.07);
                gain.gain.linearRampToValueAtTime(0.2, now + i * 0.07 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(now + i * 0.07);
                osc.stop(now + i * 0.07 + 0.36);
            });
        } catch {}
    }

    /**
     * Dramatic Voice Announcement for Student's Turn
     */
    public announceStudentTurn(studentName: string, onEnd?: () => void): void {
        if (!this.soundEnabled) return;
        try {
            this.playArcadeTurnIntro();

            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel(); // Cancel any ongoing utterance

                const cleanName = studentName.trim();
                const utterance = new SpeechSynthesisUtterance(cleanName);
                utterance.rate = 0.82; // Slower, clearer, articulated pronunciation
                utterance.pitch = 1.0; // Natural balanced pitch
                utterance.volume = 1.0;

                if (onEnd) {
                    let called = false;
                    const safeCallback = () => {
                        if (!called) {
                            called = true;
                            onEnd();
                        }
                    };
                    utterance.onend = safeCallback;
                    utterance.onerror = safeCallback;
                    setTimeout(safeCallback, 3000);
                }

                // Try to find English or native default voice
                const voices = window.speechSynthesis.getVoices();
                if (voices.length > 0) {
                    const bestVoice = voices.find(v => v.lang.startsWith('uz') || v.lang.startsWith('tr')) 
                        || voices.find(v => v.lang.startsWith('en') && !v.name.includes('Google') || v.default);
                    if (bestVoice) utterance.voice = bestVoice;
                }

                // Autoplay restriction safety
                window.speechSynthesis.speak(utterance);
            }
        } catch {
            // Audio failure must never block gameplay
        }
    }
}

export const announcer = new AnnouncerEngine();

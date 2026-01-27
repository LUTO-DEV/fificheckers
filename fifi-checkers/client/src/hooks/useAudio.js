import { useCallback, useRef } from 'react';

export default function useAudio() {
    const audioContextRef = useRef(null);

    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    const playTone = useCallback((frequency, duration, type = 'sine') => {
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = type;

            gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (e) {
            console.log('Audio not available');
        }
    }, [getAudioContext]);

    const playMove = useCallback(() => {
        playTone(800, 0.1, 'sine');
    }, [playTone]);

    const playCapture = useCallback(() => {
        playTone(400, 0.15, 'square');
        setTimeout(() => playTone(600, 0.1, 'square'), 100);
    }, [playTone]);

    const playWin = useCallback(() => {
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            setTimeout(() => playTone(freq, 0.2, 'sine'), i * 150);
        });
    }, [playTone]);

    const playLose = useCallback(() => {
        playTone(300, 0.3, 'sawtooth');
        setTimeout(() => playTone(200, 0.4, 'sawtooth'), 200);
    }, [playTone]);

    const playClick = useCallback(() => {
        playTone(1000, 0.05, 'sine');
    }, [playTone]);

    const playError = useCallback(() => {
        playTone(200, 0.2, 'square');
    }, [playTone]);

    return {
        playMove,
        playCapture,
        playWin,
        playLose,
        playClick,
        playError
    };
}
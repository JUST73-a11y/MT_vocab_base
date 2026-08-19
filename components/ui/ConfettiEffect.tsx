'use client';

import confetti from 'canvas-confetti';

export function fireConfetti(options?: confetti.Options) {
    confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6'],
        ...options,
    });
}

export function fireVictoryConfetti() {
    const end = Date.now() + 2 * 1000;
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899'];

    (function frame() {
        confetti({
            particleCount: 4,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: colors,
        });
        confetti({
            particleCount: 4,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: colors,
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    })();
}
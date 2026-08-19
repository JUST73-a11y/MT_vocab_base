'use client';

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';

export interface ParticleCanvasRef {
    triggerBurst: (x: number, y: number, color?: string, count?: number) => void;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    alpha: number;
    decay: number;
    shape: 'circle' | 'star';
}

export const ParticleCanvas = forwardRef<ParticleCanvasRef, { className?: string }>(({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animRef = useRef<number | null>(null);

    useImperativeHandle(ref, () => ({
        triggerBurst: (x: number, y: number, color = '#6366f1', count = 25) => {
            const colors = [color, '#38bdf8', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6'];
            const newParticles: Particle[] = [];
            for (let i = 0; i < count; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 8;
                newParticles.push({
                    x,
                    y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 1,
                    size: 3 + Math.random() * 6,
                    color: colors[Math.floor(Math.random() * colors.length)],
                    alpha: 1,
                    decay: 0.015 + Math.random() * 0.02,
                    shape: Math.random() > 0.5 ? 'circle' : 'star',
                });
            }
            particlesRef.current.push(...newParticles);
        },
    }));

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const particles = particlesRef.current;

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.15; // gravity
                p.alpha -= p.decay;

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.fillStyle = p.color;

                if (p.shape === 'circle') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Star shape
                    ctx.translate(p.x, p.y);
                    ctx.beginPath();
                    for (let s = 0; s < 5; s++) {
                        ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * p.size, -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.size);
                        ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.size / 2), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.size / 2));
                    }
                    ctx.closePath();
                    ctx.fill();
                }
                ctx.restore();
            }

            animRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            if (animRef.current) cancelAnimationFrame(animRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className={className || "fixed inset-0 pointer-events-none z-[9999]"}
        />
    );
});

ParticleCanvas.displayName = 'ParticleCanvas';
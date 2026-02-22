import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiBurstProps {
  trigger: number;
  disabled: boolean;
}

export const ConfettiBurst = ({ trigger, disabled }: ConfettiBurstProps): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!trigger || disabled || !canvasRef.current) {
      return;
    }

    const burst = confetti.create(canvasRef.current, {
      resize: true,
      useWorker: true
    });

    burst({
      particleCount: 24,
      spread: 65,
      startVelocity: 30,
      ticks: 60,
      scalar: 0.8,
      origin: { x: 0.5, y: 0.8 }
    });
  }, [disabled, trigger]);

  return <canvas className="confetti-canvas" ref={canvasRef} aria-hidden />;
};

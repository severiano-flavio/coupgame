import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useUiStore } from '../store/ui.js';
import { CAMERA_LIMITS, computeBaseOrientation } from './orientation.js';

/**
 * Câmera em primeira pessoa fixa na cabeça do assento. Controle próprio com
 * limites explícitos (requirements §8):
 * - yaw: ~ -95°..+95° relativo à orientação inicial (centro da mesa)
 * - pitch: ~ -40°..+50°
 * - sem translação, zoom livre, WASD ou rotação de 360°.
 * Suporta mouse (arrastar) e toque. Movimento suave (lerp). Não usa setState
 * por frame — muta a câmera diretamente (constituição §9, performance).
 */

const { YAW_MIN, YAW_MAX, PITCH_MIN, PITCH_MAX } = CAMERA_LIMITS;

interface SeatCameraProps {
  /** Posição da cabeça do jogador (seu assento). */
  headPosition: [number, number, number];
  /** Ponto para onde a orientação inicial aponta (centro da mesa). */
  lookAt?: [number, number, number];
}

export function SeatCamera({ headPosition, lookAt = [0, 1, 0] }: SeatCameraProps): JSX.Element {
  const { camera, gl } = useThree();
  const sensitivity = useUiStore((s) => s.cameraSensitivity);
  const sensRef = useRef(sensitivity);
  sensRef.current = sensitivity;

  // Yaw/pitch alvo e atual (relativos à orientação base que olha ao centro).
  const baseYaw = useRef(0);
  const basePitch = useRef(0);
  const targetYaw = useRef(0);
  const targetPitch = useRef(0);
  const curYaw = useRef(0);
  const curPitch = useRef(0);
  const dragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Define a posição fixa e a orientação base (olhando ao centro) uma vez.
  useEffect(() => {
    camera.position.set(headPosition[0], headPosition[1], headPosition[2]);
    // Orientação base que faz a câmera olhar do assento para o centro da mesa.
    // (A convenção -Z do Three.js e o teste de regressão estão em orientation.ts.)
    const base = computeBaseOrientation(headPosition, lookAt);
    baseYaw.current = base.yaw;
    basePitch.current = base.pitch;
    // reinicia alvos ao trocar de assento (restauração por assento na reconexão)
    targetYaw.current = 0;
    targetPitch.current = 0;
    curYaw.current = 0;
    curPitch.current = 0;
  }, [camera, headPosition, lookAt]);

  // Handlers de ponteiro no canvas (mouse + toque unificados por Pointer Events).
  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e: PointerEvent): void => {
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      el.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent): void => {
      if (!dragging.current || !lastPointer.current) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      const k = 0.0035 * sensRef.current;
      targetYaw.current = THREE.MathUtils.clamp(targetYaw.current - dx * k, YAW_MIN, YAW_MAX);
      targetPitch.current = THREE.MathUtils.clamp(targetPitch.current - dy * k, PITCH_MIN, PITCH_MAX);
    };
    const onUp = (e: PointerEvent): void => {
      dragging.current = false;
      lastPointer.current = null;
      el.releasePointerCapture?.(e.pointerId);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointerleave', onUp);
    // Evita scroll/gestos de página ao arrastar em toque.
    el.style.touchAction = 'none';

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointerleave', onUp);
    };
  }, [gl]);

  // Suavização e aplicação da orientação (sem setState por frame).
  useFrame((_, delta) => {
    const smoothing = 1 - Math.pow(0.0001, delta); // ~ lerp dependente de dt
    curYaw.current += (targetYaw.current - curYaw.current) * smoothing;
    curPitch.current += (targetPitch.current - curPitch.current) * smoothing;

    const euler = new THREE.Euler(
      basePitch.current + curPitch.current,
      baseYaw.current + curYaw.current,
      0,
      'YXZ',
    );
    camera.quaternion.setFromEuler(euler);
  });

  return <></>;
}

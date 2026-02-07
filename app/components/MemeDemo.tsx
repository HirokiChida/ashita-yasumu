"use client";

import {
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import styles from "./MemeDemo.module.scss";

type Point = {
  x: number;
  y: number;
};

type Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

type PickParams = {
  stageW: number;
  stageH: number;
  noW: number;
  noH: number;
  safeTop: number;
  pointer?: Point;
  yesBox?: Box;
  current?: Point;
};

type ConfettiPiece = {
  id: string;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  hue: number;
};

const NO_LABELS = [
  "やすまない",
  "たぶんやすまない",
  "会議あるし…",
  "午前だけなら…",
  "本当に？",
  "カレンダー見た？",
  "有給残ってる？",
  "5分だけやすむ？",
  "それでもやすまない？",
  "もうやすもう"
];

export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const dist = (p1: Point, p2: Point) =>
  Math.hypot(p1.x - p2.x, p1.y - p2.y);

const overlapArea = (a: Box, b: Box) => {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
};

export const pickNextNoPosition = ({
  stageW,
  stageH,
  noW,
  noH,
  safeTop,
  pointer,
  yesBox,
  current
}: PickParams): Point => {
  const padding = 12;
  const minX = padding;
  const maxX = Math.max(minX, stageW - noW - padding);
  const minY = clamp(safeTop + 8, padding, Math.max(padding, stageH - noH - padding));
  const maxY = Math.max(minY, stageH - noH - padding);

  const centerOf = (p: Point) => ({ x: p.x + noW / 2, y: p.y + noH / 2 });

  const candidates: Point[] = [];

  if (current) {
    candidates.push(current);
  }

  if (pointer && current) {
    const c = centerOf(current);
    const vx = c.x - pointer.x;
    const vy = c.y - pointer.y;
    const len = Math.hypot(vx, vy) || 1;
    for (let i = 0; i < 8; i += 1) {
      const jump = 85 + Math.random() * 120;
      const nx = clamp(c.x + (vx / len) * jump - noW / 2, minX, maxX);
      const ny = clamp(c.y + (vy / len) * jump - noH / 2, minY, maxY);
      candidates.push({ x: nx, y: ny });
    }
  }

  for (let i = 0; i < 28; i += 1) {
    candidates.push({
      x: clamp(minX + Math.random() * (maxX - minX), minX, maxX),
      y: clamp(minY + Math.random() * (maxY - minY), minY, maxY)
    });
  }

  const yesCenter = yesBox
    ? {
        x: yesBox.x + yesBox.w / 2,
        y: yesBox.y + yesBox.h / 2
      }
    : null;

  let best = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const c of candidates) {
    const center = centerOf(c);
    let score = Math.random() * 10;

    if (pointer) {
      score += dist(center, pointer) * 2.25;
    }

    if (yesCenter && yesBox) {
      score += dist(center, yesCenter) * 1.4;
      const overlap = overlapArea(
        { x: c.x, y: c.y, w: noW, h: noH },
        { x: yesBox.x, y: yesBox.y, w: yesBox.w, h: yesBox.h }
      );
      score -= overlap * 20;
    }

    if (current) {
      score += dist(center, centerOf(current)) * 0.35;
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }

  return best;
};

const createConfetti = (seed: number): ConfettiPiece[] =>
  Array.from({ length: 36 }).map((_, i) => ({
    id: `${seed}-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 1.8 + Math.random() * 1.3,
    drift: (Math.random() - 0.5) * 240,
    hue: Math.floor(Math.random() * 360)
  }));

export function MemeDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const yesRef = useRef<HTMLButtonElement>(null);
  const noRef = useRef<HTMLButtonElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const lastMoveAtRef = useRef(0);

  const [attempt, setAttempt] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [yesPos, setYesPos] = useState<Point>({ x: 0, y: 0 });
  const [noPos, setNoPos] = useState<Point>({ x: 0, y: 0 });
  const [isReady, setIsReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [confettiSeed, setConfettiSeed] = useState(0);

  const noLabel = NO_LABELS[Math.min(attempt, NO_LABELS.length - 1)];
  const yesScale = clamp(1 + attempt * 0.18, 1, 3.4);

  const confettiPieces = useMemo(
    () => (modalOpen && !reducedMotion ? createConfetti(confettiSeed) : []),
    [modalOpen, reducedMotion, confettiSeed]
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setReducedMotion(media.matches);
    };

    update();

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }

    media.addListener(update);
    return () => media.removeListener(update);
  }, []);

  const placeInitial = useCallback(() => {
    const stageEl = stageRef.current;
    const noEl = noRef.current;
    const yesEl = yesRef.current;
    const questionEl = questionRef.current;

    if (!stageEl || !noEl || !yesEl || !questionEl) {
      return;
    }

    const stageRect = stageEl.getBoundingClientRect();
    const noRect = noEl.getBoundingClientRect();
    const yesRect = yesEl.getBoundingClientRect();
    const questionRect = questionEl.getBoundingClientRect();

    const gap = 20;
    const safeTop = questionRect.bottom - stageRect.top + 14;
    const rowHeight = Math.max(yesRect.height, noRect.height);
    const groupWidth = yesRect.width + gap + noRect.width;

    const minGroupX = 12;
    const maxGroupX = Math.max(minGroupX, stageRect.width - groupWidth - 12);
    const groupX = clamp((stageRect.width - groupWidth) / 2, minGroupX, maxGroupX);

    const minGroupY = clamp(safeTop + 8, 12, Math.max(12, stageRect.height - rowHeight - 12));
    const maxGroupY = Math.max(minGroupY, stageRect.height - rowHeight - 12);
    const groupY = clamp((safeTop + stageRect.height - rowHeight) / 2, minGroupY, maxGroupY);

    const yesX = groupX;
    const yesY = groupY + (rowHeight - yesRect.height) / 2;
    const noX = yesX + yesRect.width + gap;
    const noY = groupY + (rowHeight - noRect.height) / 2;

    setYesPos({ x: yesX, y: yesY });

    setNoPos({
      x: noX,
      y: noY
    });

    setIsReady(true);
  }, []);

  const moveNo = useCallback(
    (pointerClient?: Point) => {
      if (reducedMotion || modalOpen) {
        return;
      }

      const stageEl = stageRef.current;
      const noEl = noRef.current;
      const yesEl = yesRef.current;
      const questionEl = questionRef.current;

      if (!stageEl || !noEl || !yesEl || !questionEl) {
        return;
      }

      const now = performance.now();
      if (now - lastMoveAtRef.current < 90) {
        return;
      }
      lastMoveAtRef.current = now;

      const stageRect = stageEl.getBoundingClientRect();
      const noRect = noEl.getBoundingClientRect();
      const yesRect = yesEl.getBoundingClientRect();
      const questionRect = questionEl.getBoundingClientRect();

      const safeTop = questionRect.bottom - stageRect.top + 14;
      const pointer = pointerClient
        ? {
            x: pointerClient.x - stageRect.left,
            y: pointerClient.y - stageRect.top
          }
        : undefined;

      const yesBox = {
        x: yesRect.left - stageRect.left,
        y: yesRect.top - stageRect.top,
        w: yesRect.width,
        h: yesRect.height
      };

      const next = pickNextNoPosition({
        stageW: stageRect.width,
        stageH: stageRect.height,
        noW: noRect.width,
        noH: noRect.height,
        safeTop,
        pointer,
        yesBox,
        current: noPos
      });

      setNoPos(next);
      setAttempt((prev) => prev + 1);
    },
    [reducedMotion, modalOpen, noPos]
  );

  useEffect(() => {
    const frame = requestAnimationFrame(() => placeInitial());

    const onResize = () => {
      placeInitial();
    };

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [placeInitial]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const stageEl = stageRef.current;
    const noEl = noRef.current;
    const questionEl = questionRef.current;

    if (!stageEl || !noEl || !questionEl) {
      return;
    }

    const stageRect = stageEl.getBoundingClientRect();
    const noRect = noEl.getBoundingClientRect();
    const questionRect = questionEl.getBoundingClientRect();

    const safeTop = questionRect.bottom - stageRect.top + 14;
    const minX = 12;
    const maxX = Math.max(minX, stageRect.width - noRect.width - 12);
    const minY = clamp(safeTop + 8, 12, Math.max(12, stageRect.height - noRect.height - 12));
    const maxY = Math.max(minY, stageRect.height - noRect.height - 12);

    setNoPos((prev) => ({
      x: clamp(prev.x, minX, maxX),
      y: clamp(prev.y, minY, maxY)
    }));
  }, [attempt, isReady]);

  const handleStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || modalOpen || !noRef.current) {
      return;
    }

    const noRect = noRef.current.getBoundingClientRect();
    const noCenter = {
      x: noRect.left + noRect.width / 2,
      y: noRect.top + noRect.height / 2
    };

    const pointer = { x: event.clientX, y: event.clientY };
    const threshold = 140 + attempt * 8;

    if (dist(pointer, noCenter) < threshold) {
      moveNo(pointer);
    }
  };

  const handleNoPointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    moveNo({ x: event.clientX, y: event.clientY });
  };

  const handleNoClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (event.detail === 0) {
      moveNo();
      return;
    }

    moveNo({ x: event.clientX, y: event.clientY });
  };

  const handleYesClick = () => {
    setConfettiSeed((prev) => prev + 1);
    setModalOpen(true);
  };

  const resetDemo = () => {
    setAttempt(0);
    setModalOpen(false);
    lastMoveAtRef.current = 0;

    requestAnimationFrame(() => {
      placeInitial();
    });
  };

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <h1 className={styles.title}>明日は月曜日かぁ？？</h1>

        <div className={styles.stage} ref={stageRef} onPointerMove={handleStagePointerMove}>
          <div className={styles.questionArea} ref={questionRef}>
            <p className={styles.question}>どうするやすんじゃう？?</p>
            {reducedMotion && (
              <p className={styles.reducedText}>
                モーション軽減設定が有効なため、「やすまない」ボタンは固定表示です。
              </p>
            )}
          </div>

          <button
            className={styles.yesButton}
            ref={yesRef}
            onClick={handleYesClick}
            style={{
              left: `${yesPos.x}px`,
              top: `${yesPos.y}px`,
              transform: `scale(${yesScale})`,
              visibility: isReady ? "visible" : "hidden"
            }}
          >
            やすむ！
          </button>

          <button
            className={styles.noButton}
            ref={noRef}
            onPointerEnter={handleNoPointerEnter}
            onClick={handleNoClick}
            style={{
              left: `${noPos.x}px`,
              top: `${noPos.y}px`,
              visibility: isReady ? "visible" : "hidden"
            }}
          >
            {noLabel}
          </button>
        </div>
      </section>

      {modalOpen && (
        <div className={styles.modalLayer} role="presentation">
          <div className={styles.confettiField} aria-hidden="true">
            {confettiPieces.map((piece) => (
              <div
                className={styles.confetti}
                key={piece.id}
                style={
                  {
                    left: `${piece.left}%`,
                    animationDelay: `${piece.delay}s`,
                    animationDuration: `${piece.duration}s`,
                    "--drift": `${piece.drift}px`,
                    "--hue": piece.hue
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="result-title">
            <h2 id="result-title">おめでとう！！君は自由だ！！</h2>
            <ul>
              <li>仕事のことはぜーーんぶ忘れちゃえ！！！</li>
              <li>今日はおもいきって夜更かしだぁ！！</li>
              <li>明日の朝はお昼まで寝ちゃおう！</li>
              <li>（おやすみの連絡だけは忘れないようにね！！！）</li>
            </ul>
            <button className={styles.retryButton} onClick={resetDemo}>
              もう一回考え直す？
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

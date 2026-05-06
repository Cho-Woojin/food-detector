import { useEffect, useRef, useState } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

type Props = {
  text: string;
  speed?: number; // ms per char
  startDelay?: number;
  cursor?: boolean;
  style?: StyleProp<TextStyle>;
  cursorStyle?: StyleProp<TextStyle>;
  onDone?: () => void;
};

/**
 * 한 글자씩 타이핑되는 텍스트. 마스코트가 말하는 느낌을 살림.
 * text가 바뀌면 처음부터 다시 타이핑.
 */
export function Typewriter({
  text,
  speed = 45,
  startDelay = 200,
  cursor = true,
  style,
  cursorStyle,
  onDone,
}: Props) {
  const [shown, setShown] = useState('');
  const [done, setDone] = useState(false);
  const [blink, setBlink] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blinkRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setShown('');
    setDone(false);
    let i = 0;
    const startTimer = setTimeout(() => {
      const tick = () => {
        i++;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          setDone(true);
          onDone?.();
          return;
        }
        timerRef.current = setTimeout(tick, speed);
      };
      tick();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // 커서 깜빡임
  useEffect(() => {
    if (!cursor) return;
    blinkRef.current = setInterval(() => setBlink((b) => !b), 500);
    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
    };
  }, [cursor]);

  return (
    <Text style={style}>
      {shown}
      {cursor && (!done || blink) ? (
        <Text style={cursorStyle ?? { opacity: blink ? 1 : 0 }}>▍</Text>
      ) : null}
    </Text>
  );
}

// Hook pentru comunicarea WebSocket dintre frontend si backend-ul KinetoLive
import { useCallback, useEffect, useRef, useState } from "react";
import {
  WS_URL,
  type LiveSensorBroadcastMessage,
  type SensorSample,
} from "@/lib/api";

export type WSStatus = "idle" | "connecting" | "open" | "closed" | "error";

function isLiveSensorBroadcastMessage(
  value: unknown,
): value is LiveSensorBroadcastMessage {
  // Verifica daca mesajul primit de la backend are forma mesajului live retransmis
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<LiveSensorBroadcastMessage>;

  return Boolean(message.sample && typeof message.bufferedSampleCount === "number");
}

function getSampleFromWebSocketMessage(value: unknown): {
  sample: SensorSample | null;
  bufferedSampleCount: number | null;
} {
  // Extrage sample-ul indiferent daca backend-ul il trimite direct sau impachetat
  if (!value || typeof value !== "object") {
    return {
      sample: null,
      bufferedSampleCount: null,
    };
  }

  if (isLiveSensorBroadcastMessage(value)) {
    return {
      sample: value.sample,
      bufferedSampleCount: value.bufferedSampleCount,
    };
  }

  const possibleSample = value as SensorSample;

  if (typeof possibleSample.sessionId === "number") {
    return {
      sample: possibleSample,
      bufferedSampleCount: null,
    };
  }

  return {
    sample: null,
    bufferedSampleCount: null,
  };
}

export function useSensorWebSocket(sessionId: number | null) {
  const [status, setStatus] = useState<WSStatus>("idle");
  const [samples, setSamples] = useState<SensorSample[]>([]);
  const [count, setCount] = useState(0);

  // Referinte interne pentru WebSocket, simulator si timpul real al graficului
  const wsRef = useRef<WebSocket | null>(null);
  const simRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simIdxRef = useRef(0);
  const firstSampleTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Deschide conexiunea WebSocket cand exista o sesiune activa
    if (!sessionId) {
      setStatus("idle");
      return;
    }

    setStatus("connecting");

    let ws: WebSocket;

    try {
      ws = new WebSocket(WS_URL);
    } catch {
      setStatus("error");
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("open");
    };

    ws.onclose = () => {
      setStatus("closed");
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(event.data);
        const { sample, bufferedSampleCount } =
          getSampleFromWebSocketMessage(parsedMessage);

        if (!sample || sample.sessionId !== sessionId) {
          return;
        }

        if (typeof bufferedSampleCount === "number") {
          setCount(bufferedSampleCount);
        } else {
          setCount((currentCount) => currentCount + 1);
        }

        // Adauga timpul real al sample-ului pentru grafic
        const now = performance.now();

        if (firstSampleTimeRef.current === null) {
          firstSampleTimeRef.current = now;
        }

        const sampleWithRealTime: SensorSample = {
          ...sample,
          timeSeconds: Number(
            ((now - firstSampleTimeRef.current) / 1000).toFixed(2),
          ),
        };

        setSamples((currentSamples) => {
          return [...currentSamples, sampleWithRealTime];
        });
      } catch {
        // Ignora mesajele WebSocket care nu sunt JSON valid
      }
    };

    return () => {
      ws.close();

      if (simRef.current) {
        clearInterval(simRef.current);
        simRef.current = null;
      }
    };
  }, [sessionId]);

  const sendSample = useCallback((sample: SensorSample) => {
    // Trimite un esantion catre backend sau actualizeaza local daca WebSocket-ul nu este deschis
    const ws = wsRef.current;

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(sample));
      return;
    }

    setCount((currentCount) => currentCount + 1);

    setSamples((currentSamples) => {
      const nextSamples = [...currentSamples, sample];

      return nextSamples.length > 100
        ? nextSamples.slice(nextSamples.length - 100)
        : nextSamples;
    });
  }, []);

  const startSimulator = useCallback(() => {
    // Porneste simulatorul local de date BNO055 la 25 Hz
    if (!sessionId || simRef.current) {
      return;
    }

    simIdxRef.current = 0;

    simRef.current = setInterval(() => {
      const sampleIndex = simIdxRef.current++;
      const timeSeconds = sampleIndex / 25;

      const sample: SensorSample = {
        sessionId,
        sampleIndex,

        accX:
          0.3 * Math.sin(timeSeconds * 1.5) +
          (Math.random() - 0.5) * 0.1,
        accY:
          0.2 * Math.cos(timeSeconds * 1.2) +
          (Math.random() - 0.5) * 0.1,
        accZ:
          9.81 +
          0.4 * Math.sin(timeSeconds * 0.8) +
          (Math.random() - 0.5) * 0.1,

        gyrX:
          0.6 * Math.sin(timeSeconds * 2) +
          (Math.random() - 0.5) * 0.05,
        gyrY:
          0.4 * Math.cos(timeSeconds * 1.7) +
          (Math.random() - 0.5) * 0.05,
        gyrZ:
          0.2 * Math.sin(timeSeconds * 2.4) +
          (Math.random() - 0.5) * 0.05,

        magX: 12 + Math.sin(timeSeconds) * 2,
        magY: 3 + Math.cos(timeSeconds) * 1.5,
        magZ: -8 + Math.sin(timeSeconds * 0.5) * 1,

        quatW: 1,
        quatX: 0,
        quatY: 0,
        quatZ: 0,

        calSys: 3,
        calAcc: 3,
        calGyr: 3,
        calMag: 3,
      };

      sendSample(sample);
    }, 40);
  }, [sessionId, sendSample]);

  const stopSimulator = useCallback(() => {
    // Opreste simulatorul local de date
    if (simRef.current) {
      clearInterval(simRef.current);
      simRef.current = null;
    }
  }, []);

  // Reseteaza datele live afisate in frontend
  const reset = useCallback(() => {
    setSamples([]);
    setCount(0);
    firstSampleTimeRef.current = null;
  }, []);

  return {
    status,
    samples,
    count,
    startSimulator,
    stopSimulator,
    reset,
  };
}
import { useEffect, useRef } from "react";

export async function vraagBewegingToestemming() {
  const DME = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof DME.requestPermission === "function") {
    try {
      const resultaat = await DME.requestPermission();
      return resultaat === "granted";
    } catch {
      return false;
    }
  }
  return true;
}

export function useSchudDetectie(actief: boolean, onSchud: (kracht: number) => void) {
  const onSchudRef = useRef(onSchud);
  onSchudRef.current = onSchud;

  useEffect(() => {
    if (!actief) return;
    if (typeof window === "undefined" || typeof DeviceMotionEvent === "undefined") return;

    let laatsteMagnitude = 0;
    let laatsteSchudTijd = 0;

    function handleMotion(e: DeviceMotionEvent) {
      const acc = e.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const delta = Math.abs(magnitude - laatsteMagnitude);
      laatsteMagnitude = magnitude;

      const nu = Date.now();
      if (delta > 15 && nu - laatsteSchudTijd > 150) {
        laatsteSchudTijd = nu;
        onSchudRef.current(Math.min(1, delta / 30));
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [actief]);
}

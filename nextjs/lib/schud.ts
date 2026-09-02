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
      // Drempel 11 (was 15): een lichte schud is genoeg voor óns, zodat de
      // gebruiker niet zo hard hoeft te schudden als iOS "Shake to Undo"
      // (Herstel/ongedaan maken) verwacht.
      //
      // Beperking: Shake to Undo is een iOS-systeemgebaar. Vanuit een
      // webpagina is het niet te onderdrukken (geen preventDefault, geen
      // web-API; alleen native UIApplication.applicationSupportsShakeToEdit).
      // Een restant van die melding kan dus blijven verschijnen.
      if (delta > 11 && nu - laatsteSchudTijd > 120) {
        laatsteSchudTijd = nu;
        const focus = document.activeElement;
        if (focus instanceof HTMLElement) focus.blur();
        onSchudRef.current(Math.min(1, delta / 28));
      }
    }

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [actief]);
}

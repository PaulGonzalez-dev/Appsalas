import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export interface Coordenadas {
  lat: number;
  lng: number;
}

/**
 * Ubicación actual del dispositivo.
 * - App Android: plugin nativo (pide permiso de ubicación en runtime).
 * - Navegador/web: API de geolocalización estándar.
 */
export async function obtenerUbicacion(): Promise<Coordenadas> {
  if (Capacitor.isNativePlatform()) {
    let perm = await Geolocation.checkPermissions();
    if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
      perm = await Geolocation.requestPermissions();
      if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
        throw new Error('Permiso de ubicación denegado');
      }
    }
    const pos = await Geolocation.getCurrentPosition({ timeout: 6000 });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Sin geolocalización'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    );
  });
}

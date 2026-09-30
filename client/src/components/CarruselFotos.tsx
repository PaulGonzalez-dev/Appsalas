import { useState, type MouseEvent } from 'react';

/** Mini carrusel de fotos (placeholder ♪ si no hay imágenes). */
export default function CarruselFotos({ imagenes, alt }: { imagenes: string[]; alt: string }) {
  const [i, setI] = useState(0);
  const total = imagenes.length;

  if (total === 0) {
    return (
      <div className="cerc-foto-vacio" aria-hidden>
        ♪
      </div>
    );
  }

  const idx = Math.min(i, total - 1);
  const avanzar = (delta: number) => (e: MouseEvent) => {
    e.stopPropagation();
    setI((x) => (x + delta + total) % total);
  };

  return (
    <div className="cerc-fotos">
      <img
        src={imagenes[idx]}
        alt={alt}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.style.opacity = '0';
        }}
      />
      {total > 1 && (
        <>
          <button type="button" className="foto-btn izq" onClick={avanzar(-1)} aria-label="Foto anterior">
            ‹
          </button>
          <button type="button" className="foto-btn der" onClick={avanzar(1)} aria-label="Foto siguiente">
            ›
          </button>
          <div className="foto-dots">
            {imagenes.map((_, k) => (
              <button
                key={k}
                type="button"
                className={`foto-dot${k === idx ? ' on' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setI(k);
                }}
                aria-label={`Foto ${k + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

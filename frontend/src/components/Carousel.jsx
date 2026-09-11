import { useState, useEffect } from 'react';
import './Carousel.css';

function Carousel({ items }) {
  const [indiceActual, setIndiceActual] = useState(0);

  const anterior = () => {
    setIndiceActual((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  };

  const siguiente = () => {
    setIndiceActual((prev) => (prev === items.length - 1 ? 0 : prev + 1));
  };

  const irAIndice = (indice) => {
    setIndiceActual(indice);
  };

  useEffect(() => {
    const intervalo = setInterval(() => {
      siguiente();
    }, 4000);

    return () => clearInterval(intervalo);
  }, [indiceActual]);

  const item = items[indiceActual];

  return (
    <div className="carousel mx-auto w-full">
      <div className="carousel-imagen-contenedor">
        <button className="carousel-flecha carousel-flecha-izq" onClick={anterior}>&#10094;</button>

        <img src={item.imagen} alt={item.titulo} className="carousel-imagen w-full object-cover" />

        <button className="carousel-flecha carousel-flecha-der" onClick={siguiente}>&#10095;</button>
      </div>

      <div className="carousel-info">
        <h3>{item.titulo}</h3>
        <p>{item.descripcion}</p>
      </div>

      <div className="carousel-indicadores">
        {items.map((_, indice) => (
          <span
            key={indice}
            className={`carousel-punto ${indice === indiceActual ? 'activo' : ''}`}
            onClick={() => irAIndice(indice)}
          />
        ))}
      </div>
    </div>
  );
}

export default Carousel;




//  Configuración del tablero

const miCanvas = document.getElementById('miCanvas');
const ctx      = miCanvas.getContext('2d');

const COLUMNAS  = 20;
const FILAS     = 20;
const TAMCELDA  = miCanvas.width / COLUMNAS;  // 20px por celda

const COLORES = {
  cabeza:          '#7F77DD',
  cabezaOscura:    '#534AB7',
  cuerpo:          '#AFA9EC',
  cuerpoAlt:       '#7F77DD',
  manzana:         '#D85A30',
  manzanaBrillo:   '#F0997B',
  manzanaTallo:    '#3B6D11',
  cuadricula:      'rgba(255,255,255,0.03)',
};


// juego

let serpiente, direccion, proximaDireccion, manzana;
let puntuacion, mejorPuntuacion, nivel;
let intervaloJuego, jugando;

// Cargar la mejor puntuación guardada en el navegador
try { mejorPuntuacion = parseInt(localStorage.getItem('serpienteMejor')) || 0; }
catch(e) { mejorPuntuacion = 0; }


//  MÚSICA
let contextoAudio = null;
let musicaActiva  = true;
let nodoGanancia  = null;
let notaActual    = null;
let intervaloMusica = null;


const melodia = [
  262, 294, 330, 349,  // Do Re Mi Fa
  392, 349, 330, 294,  // Sol Fa Mi Re
  262, 0,   330, 392,  // Do silencio Mi Sol
  440, 392, 349, 330,  // La Sol Fa Mi
  294, 262, 0,   262,  // Re Do silencio Do
  330, 392, 440, 392,  // Mi Sol La Sol
  349, 330, 294, 262   // Fa Mi Re Do
];
let posicionMelodía = 0;

function iniciarAudio() {
  if (contextoAudio) return;  // Ya estaba creado
  contextoAudio = new (window.AudioContext || window.webkitAudioContext)();

  //volumen general
  nodoGanancia = contextoAudio.createGain();
  nodoGanancia.gain.value = 0.08;  // Volumen bajo para no molestar
  nodoGanancia.connect(contextoAudio.destination);
}

function tocarNota(frecuencia, duracion) {
  if (!contextoAudio || !musicaActiva) return;

  // Silencio
  if (frecuencia === 0) return;

  const oscilador = contextoAudio.createOscillator();
  oscilador.type = 'square';  // Sonido retro de 8 bits
  oscilador.frequency.value = frecuencia;
  oscilador.connect(nodoGanancia);
  oscilador.start();
  oscilador.stop(contextoAudio.currentTime + duracion);
}

function reproducirMelodia() {
  if (!musicaActiva) return;
  const nota = melodia[posicionMelodía % melodia.length];
  tocarNota(nota, 0.18);
  posicionMelodía++;
}

function empezarMusica() {
  iniciarAudio();
  if (intervaloMusica) return;
  intervaloMusica = setInterval(reproducirMelodia, 220);
}

function pararMusica() {
  if (intervaloMusica) {
    clearInterval(intervaloMusica);
    intervaloMusica = null;
  }
}

// Botón de Música
const botonMusica = document.getElementById('botonMusica');
botonMusica.addEventListener('click', () => {
  musicaActiva = !musicaActiva;

  if (musicaActiva) {
    botonMusica.textContent = '🎵 Musica: ON';
    botonMusica.classList.add('activo');
    if (jugando) empezarMusica();
  } else {
    botonMusica.textContent = '🔇 Musica: OFF';
    botonMusica.classList.remove('activo');
    pararMusica();
  }
});


//  inicio del juego

function inicializar() {
  serpiente        = [{x:10,y:10}, {x:9,y:10}, {x:8,y:10}];
  direccion        = {x:1, y:0};
  proximaDireccion = {x:1, y:0};
  puntuacion       = 0;
  nivel            = 1;
  jugando          = false;

  colocarManzana();
  actualizarMarcadores();
  dibujar();
}


//   manzanas

function colocarManzana() {
  let posicion;
  do {
    posicion = {
      x: Math.floor(Math.random() * COLUMNAS),
      y: Math.floor(Math.random() * FILAS)
    };
  } while (serpiente.some(trozo => trozo.x === posicion.x && trozo.y === posicion.y));
  manzana = posicion;
}


//  Empezar / reiniciar partida

function empezarJuego() {
  document.getElementById('pantalla').style.display = 'none';
  serpiente        = [{x:10,y:10}, {x:9,y:10}, {x:8,y:10}];
  direccion        = {x:1, y:0};
  proximaDireccion = {x:1, y:0};
  puntuacion       = 0;
  nivel            = 1;
  colocarManzana();
  actualizarMarcadores();
  jugando = true;

  if (intervaloJuego) clearInterval(intervaloJuego);
  intervaloJuego = setInterval(actualizarJuego, calcularVelocidad());

  
  if (musicaActiva) empezarMusica();
}

function calcularVelocidad() {
  
  return Math.max(50, 140 - (nivel - 1) * 12);
}


//  Bucle principal del juego

function actualizarJuego() {
  direccion = proximaDireccion;

  const nuevaCabeza = {
    x: serpiente[0].x + direccion.x,
    y: serpiente[0].y + direccion.y
  };


  if (nuevaCabeza.x < 0 || nuevaCabeza.x >= COLUMNAS ||
      nuevaCabeza.y < 0 || nuevaCabeza.y >= FILAS) {
    perderJuego();
    return;
  }

 
  if (serpiente.some(trozo => trozo.x === nuevaCabeza.x && trozo.y === nuevaCabeza.y)) {
    perderJuego();
    return;
  }

  serpiente.unshift(nuevaCabeza);

  
  if (nuevaCabeza.x === manzana.x && nuevaCabeza.y === manzana.y) {
    puntuacion += nivel * 10;
    if (puntuacion > mejorPuntuacion) {
      mejorPuntuacion = puntuacion;
      try { localStorage.setItem('serpienteMejor', mejorPuntuacion); } catch(e) {}
    }
    
    const nivelNuevo = Math.min(10, Math.floor(puntuacion / 50) + 1);
    if (nivelNuevo !== nivel) {
      nivel = nivelNuevo;
      clearInterval(intervaloJuego);
      intervaloJuego = setInterval(actualizarJuego, calcularVelocidad());
    }
    colocarManzana();
  } else {
    serpiente.pop();  
  }

  actualizarMarcadores();
  dibujar();
}


//  Perder el juego

function perderJuego() {
  clearInterval(intervaloJuego);
  pararMusica();
  jugando = false;

 
  let vecesParpadeo = 0;
  const parpadear = setInterval(() => {
    dibujar(vecesParpadeo % 2 === 0);  // Ocultar serpiente en parpadeos pares
    vecesParpadeo++;
    if (vecesParpadeo >= 6) {
      clearInterval(parpadear);
      mostrarPantalla('💀 Game Over', `Puntuación final: ${puntuacion}`, 'Reintentar');
    }
  }, 120);
}

function mostrarPantalla(titulo, mensaje, textoBoton) {
  document.getElementById('tituloPantalla').textContent = titulo;
  document.getElementById('mensajePantalla').textContent = mensaje;
  document.getElementById('botonJugar').textContent      = textoBoton;
  document.getElementById('pantalla').style.display      = 'flex';
}


//  Actualizar los números en pantalla

function actualizarMarcadores() {
  document.getElementById('puntos').textContent = puntuacion;
  document.getElementById('mejor').textContent  = mejorPuntuacion;
  document.getElementById('nivel').textContent  = nivel;
}


//  Dibujar el juego en el canvas

function dibujar(ocultarSerpiente = false) {
  ctx.clearRect(0, 0, miCanvas.width, miCanvas.height);

  //cuadrícula de fondo
  for (let x = 0; x < COLUMNAS; x++) {
    for (let y = 0; y < FILAS; y++) {
      ctx.fillStyle = COLORES.cuadricula;
      ctx.fillRect(x * TAMCELDA + 0.5, y * TAMCELDA + 0.5, TAMCELDA - 1, TAMCELDA - 1);
    }
  }

  // manzana
  dibujarManzana();

  // serpiente 
  if (!ocultarSerpiente) dibujarSerpiente();
}

function dibujarManzana() {
  const cx = manzana.x * TAMCELDA + TAMCELDA / 2;
  const cy = manzana.y * TAMCELDA + TAMCELDA / 2;
  const radio = TAMCELDA / 2 - 3;

  //manzana
  ctx.beginPath();
  ctx.arc(cx, cy, radio, 0, Math.PI * 2);
  ctx.fillStyle = COLORES.manzana;
  ctx.fill();

  // manzana
  ctx.beginPath();
  ctx.arc(cx - radio * 0.28, cy - radio * 0.28, radio * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = COLORES.manzanaBrillo;
  ctx.fill();

  //manzana
  ctx.beginPath();
  ctx.moveTo(cx + radio * 0.2, cy - radio);
  ctx.lineTo(cx + radio * 0.55, cy - radio * 1.45);
  ctx.strokeStyle = COLORES.manzanaTallo;
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

function dibujarSerpiente() {
  serpiente.forEach((trozo, indice) => {
    const x = trozo.x * TAMCELDA + 2;
    const y = trozo.y * TAMCELDA + 2;
    const tamanio = TAMCELDA - 4;
    const redondeo = indice === 0 ? 7 : 4;

   
    ctx.beginPath();
    ctx.roundRect(x, y, tamanio, tamanio, redondeo);

    if (indice === 0) {
      ctx.fillStyle = COLORES.cabeza;
    } else {
      ctx.fillStyle = indice % 2 === 0 ? COLORES.cuerpo : COLORES.cuerpoAlt;
    }
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth   = 0.5;
    ctx.stroke();

    // Ojos
    if (indice === 0) dibujarOjos(trozo);
  });
}

function dibujarOjos(trozo) {
  const cx = trozo.x * TAMCELDA + TAMCELDA / 2;
  const cy = trozo.y * TAMCELDA + TAMCELDA / 2;
  const separacion = 3.5;
  const radioOjo   = 2.5;

  let ojo1, ojo2;

  
  if (direccion.x === 1)       { ojo1 = {x: cx+3, y: cy-separacion}; ojo2 = {x: cx+3, y: cy+separacion}; }
  else if (direccion.x === -1) { ojo1 = {x: cx-3, y: cy-separacion}; ojo2 = {x: cx-3, y: cy+separacion}; }
  else if (direccion.y === -1) { ojo1 = {x: cx-separacion, y: cy-3}; ojo2 = {x: cx+separacion, y: cy-3}; }
  else                         { ojo1 = {x: cx-separacion, y: cy+3}; ojo2 = {x: cx+separacion, y: cy+3}; }

  [ojo1, ojo2].forEach(ojo => {
  
    ctx.beginPath();
    ctx.arc(ojo.x, ojo.y, radioOjo, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();

    // Pupila
    ctx.beginPath();
    ctx.arc(ojo.x, ojo.y, radioOjo * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
  });
}


//  Controles del teclado

const teclasDireccion = {
  ArrowUp:    {x: 0,  y: -1},
  ArrowDown:  {x: 0,  y:  1},
  ArrowLeft:  {x: -1, y:  0},
  ArrowRight: {x: 1,  y:  0},
};

document.addEventListener('keydown', evento => {
  if (teclasDireccion[evento.key]) {
    evento.preventDefault();
    const nuevaDireccion = teclasDireccion[evento.key];
  
    if (nuevaDireccion.x !== -direccion.x || nuevaDireccion.y !== -direccion.y) {
      proximaDireccion = nuevaDireccion;
    }
  }

  if ((evento.key === 'Enter' || evento.key === ' ') && !jugando) {
    empezarJuego();
  }
});


//  Controles táctiles (botones de la pantalla)

const mapaDirectional = {
  arriba:    {x: 0,  y: -1},
  abajo:     {x: 0,  y:  1},
  izquierda: {x: -1, y:  0},
  derecha:   {x: 1,  y:  0},
};

document.querySelectorAll('.tecla').forEach(boton => {
  boton.addEventListener('pointerdown', evento => {
    evento.preventDefault();
    boton.classList.add('presionada');
    if (!jugando) return;
    const nuevaDireccion = mapaDirectional[boton.dataset.dir];
    if (nuevaDireccion.x !== -direccion.x || nuevaDireccion.y !== -direccion.y) {
      proximaDireccion = nuevaDireccion;
    }
  });
  boton.addEventListener('pointerup',    () => boton.classList.remove('presionada'));
  boton.addEventListener('pointerleave', () => boton.classList.remove('presionada'));
});


//  Botón de jugar

document.getElementById('botonJugar').addEventListener('click', empezarJuego);


//  Arranque inicial

inicializar();
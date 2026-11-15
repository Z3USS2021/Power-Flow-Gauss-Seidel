import { BusInput, LineInput, SystemPreset } from './types';

export function cargarEjemploStevenson92(): SystemPreset {
  const barras: BusInput[] = [
    {
      id: 1,
      tipo: 'Slack',
      V_mag: 1.0,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 0.5,
      QD: 0.3099,
    },
    {
      id: 2,
      tipo: 'PQ',
      V_mag: 1.0,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 1.7,
      QD: 1.0535,
    },
    {
      id: 3,
      tipo: 'PQ',
      V_mag: 1.0,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 2.0,
      QD: 1.2394,
    },
    {
      id: 4,
      tipo: 'PV',
      V_mag: 1.02,
      delta_deg: 0.0,
      PG: 3.18,
      QG: 0.0,
      PD: 0.8,
      QD: 0.4958,
      Q_min: -Infinity,
      Q_max: Infinity,
    },
  ];

  const lineas: LineInput[] = [
    { id: 'L1', de: 1, a: 2, r: 0.01008, x: 0.0504, b_sh: 0.1025 },
    { id: 'L2', de: 1, a: 3, r: 0.00744, x: 0.0372, b_sh: 0.0775 },
    { id: 'L3', de: 2, a: 4, r: 0.00744, x: 0.0372, b_sh: 0.0775 },
    { id: 'L4', de: 3, a: 4, r: 0.01272, x: 0.0636, b_sh: 0.1275 },
  ];

  const indicaciones = [
    'S_base = 100 MVA: todas las potencias en MW/Mvar de la Tabla 9.3 se dividen entre 100.',
    'Demandas (P_D, Q_D): se ingresan POSITIVAS (ej. 170 MW y 105.35 Mvar -> 1.70 y 1.0535 pu).',
    'Barra 4 es tipo PV: |V|_esp = 1.02 pu, P_G = 318 MW (3.18 pu), P_D = 80 MW (0.80 pu), Q_D = 49.58 Mvar (0.4958 pu).',
    'Susceptancia shunt: en la Tabla 9.2 dan Y/2; aquí se ingresa B_sh_tot = 2 * (Y/2).',
    'Iteraciones sugeridas (α=1.0): 9 iter. para tol=1e-4, 16 iter. para tol=1e-6, 24 iter. para tol=1e-8.',
  ];

  return {
    key: 'stevenson_9_2',
    titulo: 'Ejemplo 9.2 de Grainger & Stevenson',
    subtitulo: 'Sistema de 4 barras, Base 100 MVA (230 kV), líneas con modelo π y barra PV.',
    S_base: 100.0,
    barras,
    lineas,
    indicaciones,
    sugerenciasIter: [
      { label: '9 iter. (tol 1e-4)', n_iter: 9, tol: 1e-4 },
      { label: '16 iter. (tol 1e-6)', n_iter: 16, tol: 1e-6 },
      { label: '24 iter. (tol 1e-8)', n_iter: 24, tol: 1e-8 },
    ],
  };
}

export function cargarSistemaEjemplo3Barras(): SystemPreset {
  const barras: BusInput[] = [
    {
      id: 1,
      tipo: 'Slack',
      V_mag: 1.05,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 0.0,
      QD: 0.0,
    },
    {
      id: 2,
      tipo: 'PQ',
      V_mag: 1.0,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 4.0,
      QD: 2.5,
    },
    {
      id: 3,
      tipo: 'PV',
      V_mag: 1.04,
      delta_deg: 0.0,
      PG: 2.0,
      QG: 0.0,
      PD: 0.0,
      QD: 0.0,
      Q_min: -1.0,
      Q_max: 3.0,
    },
  ];

  const lineas: LineInput[] = [
    { id: 'L1', de: 1, a: 2, r: 0.02, x: 0.04, b_sh: 0.0 },
    { id: 'L2', de: 1, a: 3, r: 0.01, x: 0.03, b_sh: 0.0 },
    { id: 'L3', de: 2, a: 3, r: 0.0125, x: 0.025, b_sh: 0.0 },
  ];

  const indicaciones = [
    'Sistema de 3 barras en Base 100 MVA sin susceptancia shunt en las líneas (B_sh_tot = 0).',
    'Barra 3 es PV con límites de generación reactiva: -100 Mvar <= Q_G3 <= 300 Mvar.',
  ];

  return {
    key: 'ejemplo_3_barras',
    titulo: 'Sistema de ejemplo de 3 barras',
    subtitulo: 'Red triangular Base 100 MVA con barra PV sujeta a límites reactivos Q_min / Q_max.',
    S_base: 100.0,
    barras,
    lineas,
    indicaciones,
    sugerenciasIter: [
      { label: '10 iter. (tol 1e-4)', n_iter: 10, tol: 1e-4 },
      { label: '20 iter. (tol 1e-6)', n_iter: 20, tol: 1e-6 },
    ],
  };
}

export function crearSistemaManual(
  nBarras: number,
  nLineas: number,
  sBase: number
): SystemPreset {
  const safeBarras = Math.max(2, Math.min(20, Math.floor(nBarras) || 2));
  const safeLineas = Math.max(1, Math.min(40, Math.floor(nLineas) || 1));
  const safeSBase = sBase > 0 ? sBase : 100.0;

  const barras: BusInput[] = Array.from({ length: safeBarras }, (_, idx) => {
    const id = idx + 1;
    if (id === 1) {
      return {
        id,
        tipo: 'Slack',
        V_mag: 1.0,
        delta_deg: 0.0,
        PG: 0.0,
        QG: 0.0,
        PD: 0.0,
        QD: 0.0,
      };
    }
    return {
      id,
      tipo: 'PQ',
      V_mag: 1.0,
      delta_deg: 0.0,
      PG: 0.0,
      QG: 0.0,
      PD: 0.0,
      QD: 0.0,
      Q_min: -Infinity,
      Q_max: Infinity,
    };
  });

  const lineas: LineInput[] = Array.from({ length: safeLineas }, (_, idx) => {
    const de = (idx % safeBarras) + 1;
    const a = ((idx + 1) % safeBarras) + 1;
    return {
      id: `L${idx + 1}`,
      de: de === a ? 1 : de,
      a: de === a ? 2 : a,
      r: 0.01,
      x: 0.05,
      b_sh: 0.0,
    };
  });

  return {
    key: 'manual',
    titulo: 'Sistema ingresado manualmente',
    subtitulo: 'Configure las barras, sus tipos/potencias y las impedancias de línea en formato matriz.',
    S_base: safeSBase,
    barras,
    lineas,
    indicaciones: [
      `Potencia base S_base = ${safeSBase.toFixed(1)} MVA${safeSBase === 1 ? ' (ingreso directo en p.u.)' : ' (ingrese potencias en MW/Mvar; se dividen automáticamente entre S_base)'}.`,
      'Las demandas P_D y Q_D se ingresan como valores POSITIVOS.',
      'En barras PV puede dejar Q_min y Q_max vacíos si no existen límites de generación reactiva.',
    ],
  };
}

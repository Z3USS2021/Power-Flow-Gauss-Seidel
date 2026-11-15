import { Complex, fmtC, fmtPol } from './complex';
import {
  BusInput,
  IteracionStepHistory,
  LineFlowResult,
  LineInput,
  PasoBusDetail,
  PowerFlowResult,
  SlackResult,
  ValidationResult,
} from './types';

export function validarSistema(
  barras: BusInput[],
  lineas: LineInput[],
  sBase: number
): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(sBase) || sBase <= 0) {
    errors.push('La potencia base S_base debe ser un número positivo mayor que 0.');
  }

  if (barras.length < 2) {
    errors.push('El sistema debe tener al menos 2 barras para ejecutar un flujo de potencia.');
  }

  const ids = new Set<number>();
  let slackCount = 0;

  for (const b of barras) {
    if (!Number.isInteger(b.id) || b.id <= 0) {
      errors.push(`ID de barra inválido: ${b.id}. Debe ser un entero positivo.`);
    } else if (ids.has(b.id)) {
      errors.push(`ID de barra duplicado: Barra ${b.id}.`);
    } else {
      ids.add(b.id);
    }

    if (b.tipo === 'Slack') {
      slackCount += 1;
    }

    if (!Number.isFinite(b.V_mag) || b.V_mag <= 0) {
      errors.push(`Barra ${b.id}: la magnitud de voltaje |V| debe ser mayor que 0.`);
    }

    if (b.tipo === 'PV') {
      const qMin = b.Q_min ?? -Infinity;
      const qMax = b.Q_max ?? Infinity;
      if (qMin > qMax) {
        errors.push(`Barra ${b.id} (PV): Q_min no puede ser mayor que Q_max.`);
      }
    }
  }

  if (slackCount === 0) {
    errors.push('Debe existir al menos una barra de tipo Slack (referencia).');
  }

  if (lineas.length === 0) {
    errors.push('Debe existir al menos una línea de transmisión.');
  }

  const connectedBusIds = new Set<number>();
  for (let idx = 0; idx < lineas.length; idx++) {
    const l = lineas[idx];
    const label = `Línea ${idx + 1} (${l.de}-${l.a})`;
    if (!ids.has(l.de)) {
      errors.push(`${label}: la barra de envío (${l.de}) no existe en la tabla de barras.`);
    }
    if (!ids.has(l.a)) {
      errors.push(`${label}: la barra de recepción (${l.a}) no existe en la tabla de barras.`);
    }
    if (l.de === l.a) {
      errors.push(`${label}: la barra de envío y recepción no pueden ser la misma.`);
    }
    if (!Number.isFinite(l.r) || !Number.isFinite(l.x) || (l.r === 0 && l.x === 0)) {
      errors.push(`${label}: la impedancia serie Z = R + jX no puede ser cero.`);
    }
    connectedBusIds.add(l.de);
    connectedBusIds.add(l.a);
  }

  for (const b of barras) {
    if (!connectedBusIds.has(b.id)) {
      errors.push(`Barra ${b.id} está aislada (no tiene líneas conectadas).`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function construirYbus(
  barras: BusInput[],
  lineas: LineInput[]
): { Ybus: Complex[][]; idAIdx: Map<number, number> } {
  const n = barras.length;
  const idAIdx = new Map<number, number>();
  barras.forEach((b, idx) => idAIdx.set(b.id, idx));

  const Ybus: Complex[][] = Array.from({ length: n }, () =>
    Array.from({ length: n }, () => Complex.ZERO)
  );

  for (const linea of lineas) {
    const i = idAIdx.get(linea.de);
    const j = idAIdx.get(linea.a);
    if (i === undefined || j === undefined) continue;

    const z = new Complex(linea.r, linea.x);
    const y_ij = Complex.ONE.div(z);
    const y_sh_half = new Complex(0, linea.b_sh / 2.0);

    Ybus[i][i] = Ybus[i][i].add(y_ij).add(y_sh_half);
    Ybus[j][j] = Ybus[j][j].add(y_ij).add(y_sh_half);
    Ybus[i][j] = Ybus[i][j].sub(y_ij);
    Ybus[j][i] = Ybus[j][i].sub(y_ij);
  }

  return { Ybus, idAIdx };
}

export function inicializarVoltajes(barras: BusInput[]): Complex[] {
  return barras.map((b) => {
    const tipo = b.tipo.toUpperCase();
    if (tipo === 'SLACK') {
      const deltaRad = (b.delta_deg * Math.PI) / 180;
      return Complex.fromRadians(b.V_mag, deltaRad);
    }
    if (tipo === 'PV') {
      return new Complex(b.V_mag, 0);
    }
    if (tipo === 'PQ') {
      return new Complex(1.0, 0);
    }
    throw new Error(`Tipo de barra no reconocido: ${b.tipo}`);
  });
}

export function resolverFlujoGaussSeidel(
  barras: BusInput[],
  lineas: LineInput[],
  nIter: number,
  tol = 1e-6,
  alpha = 1.0
): PowerFlowResult {
  const n = barras.length;
  const { Ybus, idAIdx } = construirYbus(barras, lineas);
  const V = inicializarVoltajes(barras);

  const P_esp = barras.map((b) => b.PG - b.PD);
  const Q_esp = barras.map((b) => b.QG - b.QD);
  const V_mag_esp = barras.map((b) => b.V_mag);
  const tipo_actual = barras.map((b) => b.tipo.toUpperCase());

  let convergido = false;
  let iter_realizadas = 0;
  let max_error = 0.0;
  const historial_pasos: IteracionStepHistory[] = [];

  for (let k = 1; k <= nIter; k++) {
    const V_prev = V.slice();
    max_error = 0.0;
    const pasos_iter_k: PasoBusDetail[] = [];

    for (let i = 0; i < n; i++) {
      const b_id = barras[i].id;
      const tipo_original = barras[i].tipo.toUpperCase();
      if (tipo_original === 'SLACK') continue;

      const sym_mutua: string[] = [];
      const num_mutua: string[] = [];
      let suma_mutua = Complex.ZERO;

      for (let j = 0; j < n; j++) {
        if (j !== i && Ybus[i][j].abs > 1e-12) {
          const vj = V[j];
          const it_j = j < i ? k : k - 1;
          sym_mutua.push(`Y_${b_id}${barras[j].id}*V_${barras[j].id}^(${it_j})`);
          num_mutua.push(`${fmtC(Ybus[i][j])}*${fmtC(vj)}`);
          suma_mutua = suma_mutua.add(Ybus[i][j].mul(vj));
        }
      }

      const sym_mutua_str = sym_mutua.length > 0 ? sym_mutua.join(' + ') : '0';
      const num_mutua_str = num_mutua.length > 0 ? num_mutua.join(' + ') : '0';

      let es_pv_valido = false;
      let info_q = null;

      if (tipo_original === 'PV') {
        const suma_completa = suma_mutua.add(Ybus[i][i].mul(V_prev[i]));
        const Q_calc = -V_prev[i].conj().mul(suma_completa).im;

        const Q_D = barras[i].QD;
        const Q_G_calc = Q_calc + Q_D;
        const Q_min = barras[i].Q_min ?? -Infinity;
        const Q_max = barras[i].Q_max ?? Infinity;

        let nota_lim = 'dentro de límites (se mantiene PV)';
        if (Q_G_calc < Q_min) {
          Q_esp[i] = Q_min - Q_D;
          tipo_actual[i] = 'PQ (límite Q_min)';
          nota_lim = `Q_G=${Q_G_calc.toFixed(4)} < Q_min=${Q_min.toFixed(4)} -> fija Q_esp=${Q_esp[i].toFixed(4)} (pasa a PQ)`;
        } else if (Q_G_calc > Q_max) {
          Q_esp[i] = Q_max - Q_D;
          tipo_actual[i] = 'PQ (límite Q_max)';
          nota_lim = `Q_G=${Q_G_calc.toFixed(4)} > Q_max=${Q_max.toFixed(4)} -> fija Q_esp=${Q_esp[i].toFixed(4)} (pasa a PQ)`;
        } else {
          Q_esp[i] = Q_calc;
          tipo_actual[i] = 'PV';
          es_pv_valido = true;
        }

        const sym_q = `Y_${b_id}${b_id}*V_${b_id}^(${k - 1}) + ${sym_mutua_str}`;
        const num_q = `${fmtC(Ybus[i][i])}*${fmtC(V_prev[i])} + ${num_mutua_str}`;
        const qSign = Q_calc >= 0 ? '+' : '';
        info_q = {
          formula_q: `Q_${b_id}^(${k}) = -Im{ (V_${b_id}^(${k - 1}))* * [ ${sym_q} ] }`,
          datos_q: `Q_${b_id}^(${k}) = -Im{ ${fmtC(V_prev[i].conj())} * [ ${num_q} ] }`,
          resp_q: `Q_${b_id}^(${k}) = ${qSign}${Q_calc.toFixed(5)} pu  (${nota_lim})`,
        };
      }

      const numer = new Complex(P_esp[i], -Q_esp[i]);
      const term = numer.div(V_prev[i].conj()).sub(suma_mutua);
      const V_tilde = Complex.ONE.div(Ybus[i][i]).mul(term);
      const V_acc = V_prev[i].add(V_tilde.sub(V_prev[i]).mul(alpha));

      if (es_pv_valido) {
        V[i] = V_acc.div(V_acc.abs).mul(V_mag_esp[i]);
      } else {
        V[i] = V_acc;
      }

      const q_lbl =
        tipo_original === 'PV' && es_pv_valido
          ? `Q_${b_id}^(${k})`
          : `Q_${b_id},esp`;
      const v_lbl =
        es_pv_valido || alpha !== 1.0
          ? `V~_${b_id}^(${k})`
          : `V_${b_id}^(${k})`;

      pasos_iter_k.push({
        id: b_id,
        tipo: tipo_actual[i],
        info_q,
        formula_v: `${v_lbl} = (1 / Y_${b_id}${b_id}) * [ (P_${b_id},esp - j${q_lbl})/(V_${b_id}^(${k - 1}))* - (${sym_mutua_str}) ]`,
        datos_v: `${v_lbl} = (1 / ${fmtC(Ybus[i][i])}) * [ ${fmtC(numer)}/${fmtC(V_prev[i].conj())} - (${num_mutua_str}) ]`,
        v_tilde: V_tilde,
        v_acc: V_acc,
        v_final: V[i],
        v_prev: V_prev[i],
        v_esp: V_mag_esp[i],
        alpha,
        es_pv_valido,
        v_lbl,
      });

      const error_i = V[i].sub(V_prev[i]).abs;
      if (error_i > max_error) {
        max_error = error_i;
      }
    }

    historial_pasos.push({
      k,
      max_error,
      voltages: V.slice(),
      pasos: pasos_iter_k,
    });
    iter_realizadas = k;

    if (tol > 0 && max_error <= tol) {
      convergido = true;
      break;
    }
  }

  // Potencias activas y reactivas en todas las barras
  const P_bus = new Array<number>(n).fill(0);
  const Q_bus = new Array<number>(n).fill(0);
  const V_mag = V.map((v) => v.abs);
  const delta = V.map((v) => v.angleRad);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const theta_ij = delta[i] - delta[j];
      const G_ij = Ybus[i][j].re;
      const B_ij = Ybus[i][j].im;
      P_bus[i] +=
        V_mag[i] *
        V_mag[j] *
        (G_ij * Math.cos(theta_ij) + B_ij * Math.sin(theta_ij));
      Q_bus[i] +=
        V_mag[i] *
        V_mag[j] *
        (G_ij * Math.sin(theta_ij) - B_ij * Math.cos(theta_ij));
    }
  }

  const slack_resultados: SlackResult[] = [];
  for (let idx = 0; idx < n; idx++) {
    if (barras[idx].tipo.toUpperCase() === 'SLACK') {
      let I_slack = Complex.ZERO;
      for (let j = 0; j < n; j++) {
        I_slack = I_slack.add(Ybus[idx][j].mul(V[j]));
      }
      const S_slack = V[idx].mul(I_slack.conj());
      slack_resultados.push({
        busId: barras[idx].id,
        I_1: I_slack,
        S_1: S_slack,
      });
    }
  }

  const flujos: LineFlowResult[] = [];
  let S_perd_total = Complex.ZERO;

  for (const linea of lineas) {
    const i = idAIdx.get(linea.de);
    const j = idAIdx.get(linea.a);
    if (i === undefined || j === undefined) continue;

    const z = new Complex(linea.r, linea.x);
    const y_ij = Complex.ONE.div(z);
    const y_sh_half = new Complex(0, linea.b_sh / 2.0);

    const I_ij = V[i].sub(V[j]).mul(y_ij).add(V[i].mul(y_sh_half));
    const I_ji = V[j].sub(V[i]).mul(y_ij).add(V[j].mul(y_sh_half));

    const S_ij = V[i].mul(I_ij.conj());
    const S_ji = V[j].mul(I_ji.conj());
    const S_perd = S_ij.add(S_ji);

    S_perd_total = S_perd_total.add(S_perd);
    flujos.push({
      de: linea.de,
      a: linea.a,
      I_ij,
      I_ji,
      S_ij,
      S_ji,
      S_perd,
    });
  }

  const PG_final = barras.map((b, idx) => P_bus[idx] + b.PD);
  const QG_final = barras.map((b, idx) => Q_bus[idx] + b.QD);
  const PD_total = barras.reduce((acc, b) => acc + b.PD, 0);
  const QD_total = barras.reduce((acc, b) => acc + b.QD, 0);
  const PG_total = PG_final.reduce((acc, val) => acc + val, 0);
  const QG_total = QG_final.reduce((acc, val) => acc + val, 0);

  return {
    Ybus,
    V,
    tipo_actual,
    iter_realizadas,
    convergido,
    max_error,
    P_bus,
    Q_bus,
    PG_final,
    QG_final,
    slack_resultados,
    flujos,
    S_perd_total,
    PG_total,
    QG_total,
    PD_total,
    QD_total,
    historial_pasos,
  };
}

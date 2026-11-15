import { Complex } from './complex';

export type BusType = 'Slack' | 'PQ' | 'PV';

export interface BusInput {
  id: number;
  tipo: BusType;
  V_mag: number; // pu
  delta_deg: number; // grados
  PG: number; // pu
  QG: number; // pu
  PD: number; // pu (valor positivo)
  QD: number; // pu (valor positivo)
  Q_min?: number; // pu (-Infinity si no hay límite)
  Q_max?: number; // pu (+Infinity si no hay límite)
}

export interface LineInput {
  id: string;
  de: number;
  a: number;
  r: number; // pu
  x: number; // pu
  b_sh: number; // susceptancia shunt TOTAL B_sh = 2*(Y/2) en pu
}

export interface SystemPreset {
  key: 'stevenson_9_2' | 'ejemplo_3_barras' | 'manual';
  titulo: string;
  subtitulo: string;
  S_base: number;
  barras: BusInput[];
  lineas: LineInput[];
  indicaciones: string[];
  sugerenciasIter?: { label: string; n_iter: number; tol: number }[];
}

export interface InfoQDetail {
  formula_q: string;
  datos_q: string;
  resp_q: string;
}

export interface PasoBusDetail {
  id: number;
  tipo: string;
  info_q: InfoQDetail | null;
  formula_v: string;
  datos_v: string;
  v_tilde: Complex;
  v_acc: Complex;
  v_final: Complex;
  v_prev: Complex;
  v_esp: number;
  alpha: number;
  es_pv_valido: boolean;
  v_lbl: string;
}

export interface IteracionStepHistory {
  k: number;
  max_error: number;
  voltages: Complex[];
  pasos: PasoBusDetail[];
}

export interface SlackResult {
  busId: number;
  I_1: Complex;
  S_1: Complex;
}

export interface LineFlowResult {
  de: number;
  a: number;
  I_ij: Complex;
  I_ji: Complex;
  S_ij: Complex;
  S_ji: Complex;
  S_perd: Complex;
}

export interface PowerFlowResult {
  Ybus: Complex[][];
  V: Complex[];
  tipo_actual: string[];
  iter_realizadas: number;
  convergido: boolean;
  max_error: number;
  P_bus: number[];
  Q_bus: number[];
  PG_final: number[];
  QG_final: number[];
  slack_resultados: SlackResult[];
  flujos: LineFlowResult[];
  S_perd_total: Complex;
  PG_total: number;
  QG_total: number;
  PD_total: number;
  QD_total: number;
  historial_pasos: IteracionStepHistory[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

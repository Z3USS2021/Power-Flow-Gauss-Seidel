import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { fmtC, fmtPol, fmtRectPlain } from '../core/complex';
import { BusInput, LineInput, PowerFlowResult } from '../core/types';
import { InputSummaryTables } from './InputSummaryTables';

type ResultsTab =
  | 'tensiones'
  | 'flujos'
  | 'ybus'
  | 'iteraciones'
  | 'entrada';

interface ResultsStepProps {
  titulo: string;
  sBase: number;
  barras: BusInput[];
  lineas: LineInput[];
  indicaciones: string[];
  nIter: number;
  tol: number;
  alpha: number;
  result: PowerFlowResult;
  onEditConfig: () => void;
  onEditParams: () => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  titulo,
  sBase,
  barras,
  lineas,
  indicaciones,
  nIter,
  tol,
  alpha,
  result,
  onEditConfig,
  onEditParams,
}) => {
  const [activeTab, setActiveTab] = useState<ResultsTab>('tensiones');
  const [showStepByStep, setShowStepByStep] = useState<boolean>(false);
  const [selectedIter, setSelectedIter] = useState<string>('all');

  const pDiff = result.PG_total - (result.PD_total + result.S_perd_total.re);
  const qDiff = result.QG_total - (result.QD_total + result.S_perd_total.im);

  const tabs: { id: ResultsTab; label: string }[] = [
    { id: 'tensiones', label: 'Tensiones y Barras' },
    { id: 'flujos', label: 'Flujos y Balance' },
    { id: 'ybus', label: 'Matriz Y_bus' },
    { id: 'iteraciones', label: 'Evolución Iterativa' },
    { id: 'entrada', label: 'Datos de Entrada' },
  ];

  const filteredSteps =
    selectedIter === 'all'
      ? result.historial_pasos
      : result.historial_pasos.filter(
          (item) => String(item.k) === selectedIter
        );

  return (
    <section className="max-w-[1360px] mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Header & Quick Re-edit Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Paso 4 · Reporte Tabulado del Flujo de Potencia
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{titulo}</h1>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            S_base = {sBase.toFixed(1)} MVA · Máx. iter = {nIter} · ε ={' '}
            {tol === 0 ? '0 (sin parada)' : tol.toExponential(1)} · α ={' '}
            {alpha.toFixed(2)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onEditConfig}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Editar matrices
          </button>
          <button
            type="button"
            onClick={onEditParams}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Ajustar iteraciones
          </button>
        </div>
      </div>

      {/* Resumen de Convergencia (4-column KPI strip) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">
            Estado de convergencia
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            {result.convergido ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm font-semibold text-emerald-700">
                  SÍ · Tolerancia alcanzada
                </span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-sm font-semibold text-amber-700">
                  NO · Límite de iteraciones
                </span>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">
            Iteraciones ejecutadas
          </p>
          <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900">
            {result.iter_realizadas}{' '}
            <span className="text-xs font-normal text-slate-500">
              / {nIter} máx.
            </span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">
            Error máximo final (max|ΔV|)
          </p>
          <p className="mt-1.5 text-xl font-bold font-mono tabular-nums text-slate-900">
            {result.max_error.toExponential(4)}{' '}
            <span className="text-xs font-normal text-slate-500">pu</span>
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs font-medium text-slate-500">
            Pérdidas totales del sistema
          </p>
          <p className="mt-1.5 text-sm font-bold font-mono tabular-nums text-slate-900">
            P = {(result.S_perd_total.re * sBase).toFixed(3)}{' '}
            <span className="text-xs font-normal text-slate-500">
              {sBase !== 1 ? 'MW' : 'pu'}
            </span>{' '}
            · Q = {(result.S_perd_total.im * sBase).toFixed(3)}{' '}
            <span className="text-xs font-normal text-slate-500">
              {sBase !== 1 ? 'Mvar' : 'pu'}
            </span>
          </p>
        </div>
      </div>

      {/* Results Sub-Tabs */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div
          role="tablist"
          aria-label="Secciones de resultados"
          className="flex items-center gap-1 p-1.5 bg-slate-100 border-b border-slate-200 overflow-x-auto"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-white text-blue-700 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 sm:p-6">
          {/* TAB 1: Tensiones y Barras */}
          {activeTab === 'tensiones' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-3">
                  Tensiones y Potencias en Barras (Forma Polar y Rectangular) [p.u.]
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-lg matrix-scroll">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Barra</th>
                        <th className="py-2.5 px-3">Tipo final</th>
                        <th className="py-2.5 px-3 text-right">|V| [pu]</th>
                        <th className="py-2.5 px-3 text-right">δ [°]</th>
                        <th className="py-2.5 px-3 text-right">V_rect [pu]</th>
                        <th className="py-2.5 px-3 text-right">P_neta [pu]</th>
                        <th className="py-2.5 px-3 text-right">Q_neta [pu]</th>
                        <th className="py-2.5 px-3 text-right">P_G [pu]</th>
                        <th className="py-2.5 px-3 text-right">Q_G [pu]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                      {barras.map((b, idx) => {
                        const v = result.V[idx];
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                              Barra {b.id}
                            </td>
                            <td className="py-2.5 px-3 font-sans text-slate-700">
                              {result.tipo_actual[idx]}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                              {v.abs.toFixed(6)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-800">
                              {v.angleDeg.toFixed(4)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-700">
                              {fmtRectPlain(v, 5)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-800">
                              {result.P_bus[idx].toFixed(5)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-800">
                              {result.Q_bus[idx].toFixed(5)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-blue-800">
                              {result.PG_final[idx].toFixed(5)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-blue-800">
                              {result.QG_final[idx].toFixed(5)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {sBase !== 1.0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
                      Potencias Generadas con S_base = {sBase.toFixed(1)} MVA
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                            <th className="py-2 px-3">Barra</th>
                            <th className="py-2 px-3 text-right">P_G [MW]</th>
                            <th className="py-2 px-3 text-right">Q_G [Mvar]</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                          {barras.map((b, idx) => (
                            <tr key={b.id} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                                Barra {b.id}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-800">
                                {(result.PG_final[idx] * sBase).toFixed(3)}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-800">
                                {(result.QG_final[idx] * sBase).toFixed(3)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
                      Potencia Calculada en Barra Slack (S_1 = V_1 · I_1*)
                    </h3>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                            <th className="py-2 px-3">Barra</th>
                            <th className="py-2 px-3 text-right">I_1 [pu]</th>
                            <th className="py-2 px-3 text-right">P_1 [pu]</th>
                            <th className="py-2 px-3 text-right">Q_1 [pu]</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                          {result.slack_resultados.map((s) => (
                            <tr key={s.busId} className="hover:bg-slate-50/70">
                              <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                                Barra {s.busId}
                              </td>
                              <td className="py-2 px-3 text-right text-slate-700">
                                {fmtRectPlain(s.I_1, 5)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                {s.S_1.re.toFixed(6)}
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-slate-900">
                                {s.S_1.im.toFixed(6)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {sBase === 1.0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-2.5">
                    Potencia Calculada en Barra Slack (S_1 = V_1 · I_1*)
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                          <th className="py-2 px-3">Barra</th>
                          <th className="py-2 px-3 text-right">I_1 [pu]</th>
                          <th className="py-2 px-3 text-right">P_1 [pu]</th>
                          <th className="py-2 px-3 text-right">Q_1 [pu]</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                        {result.slack_resultados.map((s) => (
                          <tr key={s.busId}>
                            <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                              Barra {s.busId}
                            </td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {fmtRectPlain(s.I_1, 5)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {s.S_1.re.toFixed(6)}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-slate-900">
                              {s.S_1.im.toFixed(6)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Flujos y Balance */}
          {activeTab === 'flujos' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-base font-semibold text-slate-900 mb-3">
                  Flujos de Potencia y Pérdidas en Líneas [p.u.]
                </h2>
                <div className="overflow-x-auto border border-slate-200 rounded-lg matrix-scroll">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">De → A</th>
                        <th className="py-2.5 px-3 text-right">P_ij [pu]</th>
                        <th className="py-2.5 px-3 text-right">Q_ij [pu]</th>
                        <th className="py-2.5 px-3 text-right">P_ji [pu]</th>
                        <th className="py-2.5 px-3 text-right">Q_ji [pu]</th>
                        <th className="py-2.5 px-3 text-right">P_perd [pu]</th>
                        <th className="py-2.5 px-3 text-right">Q_perd [pu]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                      {result.flujos.map((f, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                            {f.de} → {f.a}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800">
                            {f.S_ij.re.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800">
                            {f.S_ij.im.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800">
                            {f.S_ji.re.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-800">
                            {f.S_ji.im.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            {f.S_perd.re.toFixed(5)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                            {f.S_perd.im.toFixed(5)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-50 border-t border-slate-200 text-xs font-mono tabular-nums font-semibold">
                        <td className="py-2.5 px-3 font-sans text-slate-900" colSpan={5}>
                          Pérdidas totales ({sBase !== 1 ? `${(result.S_perd_total.re * sBase).toFixed(3)} MW / ${(result.S_perd_total.im * sBase).toFixed(3)} Mvar` : 'en p.u.'})
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-800">
                          {result.S_perd_total.re.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-blue-800">
                          {result.S_perd_total.im.toFixed(6)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-3">
                  Balance de Potencia del Sistema [p.u.]
                </h3>
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                        <th className="py-2.5 px-3">Componente</th>
                        <th className="py-2.5 px-3 text-right">Generación total (ΣG)</th>
                        <th className="py-2.5 px-3 text-right">Demanda total (ΣD)</th>
                        <th className="py-2.5 px-3 text-right">Pérdidas totales</th>
                        <th className="py-2.5 px-3 text-right">ΣD + Pérdidas</th>
                        <th className="py-2.5 px-3 text-right">Desbalance (Δ)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                      <tr>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                          Potencia Activa (P)
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                          {result.PG_total.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {result.PD_total.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {result.S_perd_total.re.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                          {(result.PD_total + result.S_perd_total.re).toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {pDiff.toExponential(2)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                          Potencia Reactiva (Q)
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                          {result.QG_total.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {result.QD_total.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-700">
                          {result.S_perd_total.im.toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-900 font-semibold">
                          {(result.QD_total + result.S_perd_total.im).toFixed(6)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {qDiff.toExponential(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Matriz Y_bus */}
          {activeTab === 'ybus' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Matriz de Admitancias Nodales (Y_bus) [p.u.]
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Elementos diagonales Y_ii resaltados; valores complejos en forma rectangular G + jB.
                </p>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg matrix-scroll">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <th className="py-2.5 px-3 text-left">Y_bus</th>
                      {barras.map((b) => (
                        <th key={b.id} className="py-2.5 px-3 whitespace-nowrap">
                          Barra {b.id}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                    {result.Ybus.map((row, i) => (
                      <tr key={barras[i].id}>
                        <th className="py-2.5 px-3 text-left font-sans font-semibold text-slate-900 bg-slate-50 border-r border-slate-200 whitespace-nowrap">
                          Barra {barras[i].id}
                        </th>
                        {row.map((cell, j) => {
                          const isDiag = i === j;
                          return (
                            <td
                              key={j}
                              className={`py-2.5 px-3 whitespace-nowrap ${
                                isDiag
                                  ? 'bg-blue-50/60 font-semibold text-blue-900'
                                  : cell.abs < 1e-12
                                  ? 'text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {fmtRectPlain(cell, 5)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Evolución de Iteraciones */}
          {activeTab === 'iteraciones' && (
            <div>
              <div className="mb-3">
                <h2 className="text-base font-semibold text-slate-900">
                  Evolución de las Iteraciones (Gauss-Seidel)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Magnitud y ángulo de tensión por barra en cada iteración k hasta alcanzar la tolerancia o el límite.
                </p>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg matrix-scroll max-h-[520px]">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                      <th className="py-2.5 px-3 whitespace-nowrap">Iter</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">
                        max|ΔV| [pu]
                      </th>
                      {barras.map((b) => (
                        <th
                          key={b.id}
                          className="py-2.5 px-3 text-right whitespace-nowrap"
                        >
                          B{b.id} ({b.tipo})
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
                    {result.historial_pasos.map((it) => (
                      <tr key={it.k} className="hover:bg-slate-50/70">
                        <td className="py-2 px-3 font-semibold text-slate-900">
                          {it.k}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-700">
                          {it.max_error.toExponential(2)}
                        </td>
                        {it.voltages.map((v, idx) => (
                          <td
                            key={idx}
                            className="py-2 px-3 text-right text-slate-800 whitespace-nowrap"
                          >
                            {fmtPol(v, 5, 3)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Datos de Entrada Tabulados */}
          {activeTab === 'entrada' && (
            <InputSummaryTables
              titulo={`Datos de entrada utilizados · ${titulo}`}
              sBase={sBase}
              barras={barras}
              lineas={lineas}
              indicaciones={indicaciones}
            />
          )}
        </div>
      </div>

      {/* Final Interactive Prompt from power_flow.py */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              ¿Desea ver el procedimiento paso a paso de las tensiones?
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Muestra la fórmula simbólica, los valores sustituidos y la respuesta corta de cada barra por iteración (incluyendo cálculo de Q y corrección PV).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowStepByStep((prev) => !prev)}
              aria-expanded={showStepByStep}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                showStepByStep
                  ? 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              {showStepByStep ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Ocultar procedimiento
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Sí, mostrar procedimiento
                </>
              )}
            </button>
          </div>
        </div>

        {showStepByStep && (
          <div className="mt-6 pt-5 border-t border-slate-200 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Procedimiento paso a paso por iteración
              </h3>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="filter-iter-step"
                  className="text-xs font-medium text-slate-600"
                >
                  Filtrar iteración:
                </label>
                <select
                  id="filter-iter-step"
                  value={selectedIter}
                  onChange={(e) => setSelectedIter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="all">
                    Todas ({result.historial_pasos.length})
                  </option>
                  {result.historial_pasos.map((it) => (
                    <option key={it.k} value={String(it.k)}>
                      Iteración {it.k} (max|ΔV| = {it.max_error.toExponential(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredSteps.map((iterInfo) => (
                <div
                  key={iterInfo.k}
                  className="border border-slate-200 rounded-lg overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Iteración {iterInfo.k}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-600">
                      max|ΔV| = {iterInfo.max_error.toExponential(2)} p.u.
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {iterInfo.pasos.map((p) => (
                      <div key={p.id} className="p-4 space-y-1.5 text-xs">
                        <p className="font-semibold text-slate-900">
                          Barra {p.id} ({p.tipo})
                        </p>

                        {p.info_q && (
                          <div className="space-y-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200/80 overflow-x-auto">
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Fórmula Q:{' '}
                              </span>
                              {p.info_q.formula_q}
                            </p>
                            <p className="text-slate-600">
                              <span className="font-semibold text-slate-800">
                                Datos Q:{' '}
                              </span>
                              {p.info_q.datos_q}
                            </p>
                            <p className="text-blue-800 font-medium">
                              <span className="font-semibold text-slate-900">
                                Resp. Q:{' '}
                              </span>
                              {p.info_q.resp_q}
                            </p>
                          </div>
                        )}

                        <div className="space-y-1 font-mono text-[11px] bg-slate-50/70 p-2.5 rounded border border-slate-200/80 overflow-x-auto">
                          <p className="text-slate-700">
                            <span className="font-semibold text-slate-900">
                              Fórmula V:{' '}
                            </span>
                            {p.formula_v}
                          </p>
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-800">
                              Datos V:{' '}
                            </span>
                            {p.datos_v}
                          </p>
                          {(p.alpha !== 1.0 || p.es_pv_valido) && (
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Provis.:{' '}
                              </span>
                              {p.v_lbl} = {fmtC(p.v_tilde, 5)} pu ={' '}
                              {fmtPol(p.v_tilde)}
                            </p>
                          )}
                          {p.alpha !== 1.0 && (
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Acelerac.:{' '}
                              </span>
                              V_acc = {fmtC(p.v_prev, 5)} + {p.alpha}*(
                              {fmtC(p.v_tilde, 5)} - {fmtC(p.v_prev, 5)}) ={' '}
                              {fmtC(p.v_acc, 5)}
                            </p>
                          )}
                          {p.es_pv_valido && (
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">
                                Correcc.:{' '}
                              </span>
                              V_{p.id}^({iterInfo.k}) = {p.v_esp.toFixed(4)} * (
                              {fmtC(p.v_acc, 5)} / {p.v_acc.abs.toFixed(5)})
                            </p>
                          )}
                          <p className="text-emerald-800 font-semibold">
                            <span className="text-slate-900">Resp. V: </span>
                            V_{p.id}^({iterInfo.k}) = {fmtC(p.v_final, 5)} pu ={' '}
                            {fmtPol(p.v_final)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

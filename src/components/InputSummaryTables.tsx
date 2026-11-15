import React from 'react';
import { Complex } from '../core/complex';
import { BusInput, LineInput } from '../core/types';

interface InputSummaryTablesProps {
  titulo: string;
  sBase: number;
  barras: BusInput[];
  lineas: LineInput[];
  indicaciones?: string[];
  compact?: boolean;
}

export const InputSummaryTables: React.FC<InputSummaryTablesProps> = ({
  titulo,
  sBase,
  barras,
  lineas,
  indicaciones,
  compact = false,
}) => {
  const unidadP = sBase !== 1 ? 'MW' : 'pu';
  const unidadQ = sBase !== 1 ? 'Mvar' : 'pu';

  const pvConLim = barras.filter(
    (b) =>
      b.tipo === 'PV' &&
      (Number.isFinite(b.Q_min ?? -Infinity) ||
        Number.isFinite(b.Q_max ?? Infinity))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Potencia base S_base ={' '}
            <span className="font-mono tabular-nums font-medium text-slate-700">
              {sBase.toFixed(1)} MVA
            </span>{' '}
            · {barras.length} barras · {lineas.length} líneas
          </p>
        </div>
      </div>

      {/* Tabla de Datos de Barras */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Tabla de datos de barras
        </h4>
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white matrix-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Barra</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3 text-right">|V|_0/esp [pu]</th>
                <th className="py-2.5 px-3 text-right">δ_0 [°]</th>
                <th className="py-2.5 px-3 text-right">P_G [{unidadP}]</th>
                <th className="py-2.5 px-3 text-right">Q_G [{unidadQ}]</th>
                <th className="py-2.5 px-3 text-right">P_D [{unidadP}]</th>
                <th className="py-2.5 px-3 text-right">Q_D [{unidadQ}]</th>
                <th className="py-2.5 px-3 text-right">P_esp [pu]</th>
                <th className="py-2.5 px-3 text-right">Q_esp [pu]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
              {barras.map((b) => {
                const pEsp = b.PG - b.PD;
                const qEsp = b.QG - b.QD;
                const isSlack = b.tipo === 'Slack';
                const isPQ = b.tipo === 'PQ';
                return (
                  <tr key={b.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                      {b.id}
                    </td>
                    <td className="py-2 px-3 font-sans font-medium text-slate-700">
                      {b.tipo}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {b.V_mag.toFixed(4)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {b.delta_deg.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {(b.PG * sBase).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-500">
                      {isPQ ? (b.QG * sBase).toFixed(2) : '---'}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {(b.PD * sBase).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {(b.QD * sBase).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {!isSlack
                        ? `${pEsp >= 0 ? '+' : ''}${pEsp.toFixed(4)}`
                        : '(incógn.)'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {isPQ
                        ? `${qEsp >= 0 ? '+' : ''}${qEsp.toFixed(4)}`
                        : '(incógn.)'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {pvConLim.length > 0 && (
          <div className="mt-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">
              Límites reactivos en barras PV:
            </span>
            <ul className="mt-1 space-y-0.5 font-mono tabular-nums">
              {pvConLim.map((b) => {
                const qmin = b.Q_min ?? -Infinity;
                const qmax = b.Q_max ?? Infinity;
                const qminTxt = Number.isFinite(qmin)
                  ? `${qmin.toFixed(4)} pu (${(qmin * sBase).toFixed(2)} ${unidadQ})`
                  : '-∞';
                const qmaxTxt = Number.isFinite(qmax)
                  ? `${qmax.toFixed(4)} pu (${(qmax * sBase).toFixed(2)} ${unidadQ})`
                  : '+∞';
                return (
                  <li key={b.id}>
                    Barra {b.id}: Q_G,min = {qminTxt} | Q_G,max = {qmaxTxt}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Tabla de Datos de Líneas */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Tabla de datos de líneas (Modelo π en p.u.)
        </h4>
        <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white matrix-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3">Línea</th>
                <th className="py-2.5 px-3 text-right">R [pu]</th>
                <th className="py-2.5 px-3 text-right">X [pu]</th>
                <th className="py-2.5 px-3 text-right">G_ser [pu]</th>
                <th className="py-2.5 px-3 text-right">B_ser [pu]</th>
                <th className="py-2.5 px-3 text-right">Y/2 [pu]</th>
                <th className="py-2.5 px-3 text-right">B_sh_tot [pu]</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-mono tabular-nums">
              {lineas.map((l) => {
                const z = new Complex(l.r, l.x);
                const ySer = z.abs > 0 ? Complex.ONE.div(z) : Complex.ZERO;
                return (
                  <tr key={l.id} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                      {l.de}-{l.a}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {l.r.toFixed(5)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-800">
                      {l.x.toFixed(5)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {ySer.re.toFixed(6)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {ySer.im.toFixed(6)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-600">
                      {(l.b_sh / 2).toFixed(5)}
                    </td>
                    <td className="py-2 px-3 text-right font-medium text-slate-900">
                      {l.b_sh.toFixed(5)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {!compact && indicaciones && indicaciones.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Indicaciones de ingreso
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
            {indicaciones.map((txt, idx) => (
              <li key={idx}>{txt}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

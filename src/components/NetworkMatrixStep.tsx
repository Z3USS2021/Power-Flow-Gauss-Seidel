import React, { useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, Plus, Trash2 } from 'lucide-react';
import { Complex } from '../core/complex';
import { BusInput, BusType, LineInput, ValidationResult } from '../core/types';

interface MatrixNumberCellProps {
  value: number;
  disabled?: boolean;
  placeholder?: string;
  ariaLabel: string;
  onChange: (val: number) => void;
  min?: number;
  allowEmpty?: boolean;
  emptyValue?: number;
}

const MatrixNumberCell: React.FC<MatrixNumberCellProps> = ({
  value,
  disabled = false,
  placeholder = '0',
  ariaLabel,
  onChange,
  min,
  allowEmpty = false,
  emptyValue = 0,
}) => {
  const formatExternal = (v: number) => {
    if (!Number.isFinite(v)) return '';
    return String(Number(v.toFixed(6)));
  };

  const [text, setText] = useState(() => formatExternal(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatExternal(value));
    }
  }, [value, focused]);

  if (disabled) {
    return (
      <div className="w-full px-2 py-1.5 text-right text-xs font-mono tabular-nums text-slate-400 select-none">
        ---
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      placeholder={placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === '' && allowEmpty) {
          onChange(emptyValue);
          return;
        }
        const parsed = Number(raw);
        if (raw.trim() !== '' && Number.isFinite(parsed)) {
          if (min !== undefined && parsed < min) return;
          onChange(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        if (text.trim() === '' && allowEmpty) {
          onChange(emptyValue);
          setText('');
          return;
        }
        const parsed = Number(text);
        if (text.trim() === '' || !Number.isFinite(parsed)) {
          setText(formatExternal(value));
          return;
        }
        const clamped = min !== undefined && parsed < min ? min : parsed;
        onChange(clamped);
        setText(formatExternal(clamped));
      }}
      className="w-full min-w-[78px] px-2 py-1.5 text-right text-xs font-mono tabular-nums bg-white border border-slate-200 rounded hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-colors"
    />
  );
};

interface NetworkMatrixStepProps {
  titulo: string;
  sBase: number;
  barras: BusInput[];
  lineas: LineInput[];
  indicaciones: string[];
  validation: ValidationResult;
  onChangeSBase: (sBase: number) => void;
  onChangeBarras: (barras: BusInput[]) => void;
  onChangeLineas: (lineas: LineInput[]) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const NetworkMatrixStep: React.FC<NetworkMatrixStepProps> = ({
  titulo,
  sBase,
  barras,
  lineas,
  indicaciones,
  validation,
  onChangeSBase,
  onChangeBarras,
  onChangeLineas,
  onBack,
  onContinue,
}) => {
  const unidadP = sBase !== 1 ? 'MW' : 'pu';
  const unidadQ = sBase !== 1 ? 'Mvar' : 'pu';

  const updateBus = (idx: number, patch: Partial<BusInput>) => {
    const next = barras.map((b, i) => (i === idx ? { ...b, ...patch } : b));
    onChangeBarras(next);
  };

  const handleAddBus = () => {
    const maxId = barras.reduce((m, b) => Math.max(m, b.id), 0);
    const newBus: BusInput = {
      id: maxId + 1,
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
    onChangeBarras([...barras, newBus]);
  };

  const handleRemoveBus = (busId: number) => {
    if (barras.length <= 2) return;
    onChangeBarras(barras.filter((b) => b.id !== busId));
    onChangeLineas(lineas.filter((l) => l.de !== busId && l.a !== busId));
  };

  const updateLine = (idx: number, patch: Partial<LineInput>) => {
    const next = lineas.map((l, i) => (i === idx ? { ...l, ...patch } : l));
    onChangeLineas(next);
  };

  const handleAddLine = () => {
    const firstId = barras[0]?.id ?? 1;
    const secondId = barras[1]?.id ?? firstId;
    const nextIdx = lineas.length + 1;
    const newLine: LineInput = {
      id: `L-${Date.now()}-${nextIdx}`,
      de: firstId,
      a: secondId,
      r: 0.01,
      x: 0.05,
      b_sh: 0.0,
    };
    onChangeLineas([...lineas, newLine]);
  };

  const handleRemoveLine = (lineId: string) => {
    if (lineas.length <= 1) return;
    onChangeLineas(lineas.filter((l) => l.id !== lineId));
  };

  const safeSBase = sBase > 0 ? sBase : 1;

  return (
    <section className="max-w-[1360px] mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-6">
      {/* Header & S_base configuration */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Paso 2 · Configuración de Red en Formato Matriz
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{titulo}</h1>
          <p className="text-sm text-slate-600 mt-1">
            Edite directamente las celdas de las tablas. Las columnas calculadas se actualizan en tiempo real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 shrink-0">
          <label
            htmlFor="config-sbase"
            className="text-xs font-semibold text-slate-700 whitespace-nowrap"
          >
            S_base [MVA]:
          </label>
          <input
            id="config-sbase"
            type="number"
            step="any"
            min="0.001"
            value={sBase}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v > 0) onChangeSBase(v);
            }}
            className="w-24 px-2.5 py-1 text-sm font-mono tabular-nums text-right border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">
            Unidades: {unidadP} / {unidadQ}
          </span>
        </div>
      </div>

      {/* Validation Banner */}
      {!validation.valid && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 space-y-1">
            <p className="font-semibold text-sm text-red-900">
              Corrija los siguientes datos antes de continuar:
            </p>
            <ul className="list-disc pl-4 space-y-0.5">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Matrix 1: Bus Data */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Matriz de Datos de Barras ({barras.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese las demandas P_D y Q_D como valores positivos. Las potencias se convierten a p.u. dividiendo entre S_base.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddBus}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar barra
          </button>
        </div>

        <div className="overflow-x-auto matrix-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3 whitespace-nowrap">Barra</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Tipo</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">|V|_0 / esp [pu]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">δ_0 [°]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">P_G [{unidadP}]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Q_G [{unidadQ}]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">P_D [{unidadP}]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Q_D [{unidadQ}]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Q_min [{unidadQ}]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Q_max [{unidadQ}]</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100/70">P_esp [pu]</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100/70">Q_esp [pu]</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {barras.map((b, idx) => {
                const isSlack = b.tipo === 'Slack';
                const isPV = b.tipo === 'PV';
                const isPQ = b.tipo === 'PQ';
                const pEsp = b.PG - b.PD;
                const qEsp = b.QG - b.QD;

                return (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      Barra {b.id}
                    </td>
                    <td className="py-2 px-3">
                      <select
                        aria-label={`Tipo de barra ${b.id}`}
                        value={b.tipo}
                        onChange={(e) => {
                          const newTipo = e.target.value as BusType;
                          updateBus(idx, {
                            tipo: newTipo,
                            delta_deg: newTipo === 'Slack' ? b.delta_deg : 0.0,
                            V_mag: newTipo === 'PQ' ? 1.0 : b.V_mag,
                          });
                        }}
                        className="px-2 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        <option value="Slack">Slack</option>
                        <option value="PQ">PQ</option>
                        <option value="PV">PV</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Voltaje inicial o especificado de barra ${b.id}`}
                        value={b.V_mag}
                        min={0.01}
                        onChange={(val) => updateBus(idx, { V_mag: val })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Ángulo de voltaje de barra ${b.id}`}
                        value={b.delta_deg}
                        disabled={!isSlack}
                        onChange={(val) => updateBus(idx, { delta_deg: val })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Generación activa P_G de barra ${b.id}`}
                        value={b.PG * safeSBase}
                        onChange={(val) => updateBus(idx, { PG: val / safeSBase })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Generación reactiva Q_G de barra ${b.id}`}
                        value={b.QG * safeSBase}
                        disabled={!isPQ}
                        onChange={(val) => updateBus(idx, { QG: val / safeSBase })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Demanda activa P_D de barra ${b.id}`}
                        value={b.PD * safeSBase}
                        min={0}
                        onChange={(val) => updateBus(idx, { PD: Math.abs(val) / safeSBase })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Demanda reactiva Q_D de barra ${b.id}`}
                        value={b.QD * safeSBase}
                        min={0}
                        onChange={(val) => updateBus(idx, { QD: Math.abs(val) / safeSBase })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Límite reactivo mínimo Q_min de barra ${b.id}`}
                        value={
                          Number.isFinite(b.Q_min ?? -Infinity)
                            ? (b.Q_min as number) * safeSBase
                            : NaN
                        }
                        disabled={!isPV}
                        allowEmpty
                        emptyValue={-Infinity}
                        placeholder="-∞"
                        onChange={(val) =>
                          updateBus(idx, {
                            Q_min: Number.isFinite(val) ? val / safeSBase : -Infinity,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Límite reactivo máximo Q_max de barra ${b.id}`}
                        value={
                          Number.isFinite(b.Q_max ?? Infinity)
                            ? (b.Q_max as number) * safeSBase
                            : NaN
                        }
                        disabled={!isPV}
                        allowEmpty
                        emptyValue={Infinity}
                        placeholder="+∞"
                        onChange={(val) =>
                          updateBus(idx, {
                            Q_max: Number.isFinite(val) ? val / safeSBase : Infinity,
                          })
                        }
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900 bg-slate-50/70 whitespace-nowrap">
                      {!isSlack
                        ? `${pEsp >= 0 ? '+' : ''}${pEsp.toFixed(4)}`
                        : '(incógn.)'}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-slate-900 bg-slate-50/70 whitespace-nowrap">
                      {isPQ
                        ? `${qEsp >= 0 ? '+' : ''}${qEsp.toFixed(4)}`
                        : '(incógn.)'}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        disabled={barras.length <= 2}
                        aria-label={`Eliminar barra ${b.id}`}
                        onClick={() => handleRemoveBus(b.id)}
                        className={`p-1.5 rounded transition-colors ${
                          barras.length <= 2
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matrix 2: Line Data */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Matriz de Datos de Líneas — Modelo π en p.u. ({lineas.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ingrese resistencia R, reactancia X y susceptancia shunt total B_sh = 2·(Y/2). Las admitancias serie se calculan automáticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddLine}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Agregar línea
          </button>
        </div>

        <div className="overflow-x-auto matrix-scroll">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600">
                <th className="py-2.5 px-3 whitespace-nowrap">Línea</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Envío (i)</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Recepción (j)</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">R [pu]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">X [pu]</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">B_sh_tot [pu]</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100/70">G_ser [pu]</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100/70">B_ser [pu]</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap bg-slate-100/70">Y/2 [pu]</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {lineas.map((l, idx) => {
                const z = new Complex(l.r, l.x);
                const ySer = z.abs > 0 ? Complex.ONE.div(z) : Complex.ZERO;

                return (
                  <tr key={l.id} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-slate-900 whitespace-nowrap">
                      {l.de}-{l.a}
                    </td>
                    <td className="py-2 px-2">
                      <select
                        aria-label={`Barra de envío de línea ${idx + 1}`}
                        value={l.de}
                        onChange={(e) =>
                          updateLine(idx, { de: parseInt(e.target.value, 10) })
                        }
                        className="px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {barras.map((b) => (
                          <option key={b.id} value={b.id}>
                            Barra {b.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        aria-label={`Barra de recepción de línea ${idx + 1}`}
                        value={l.a}
                        onChange={(e) =>
                          updateLine(idx, { a: parseInt(e.target.value, 10) })
                        }
                        className="px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-600"
                      >
                        {barras.map((b) => (
                          <option key={b.id} value={b.id}>
                            Barra {b.id}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Resistencia R de línea ${l.de}-${l.a}`}
                        value={l.r}
                        onChange={(val) => updateLine(idx, { r: val })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Reactancia X de línea ${l.de}-${l.a}`}
                        value={l.x}
                        onChange={(val) => updateLine(idx, { x: val })}
                      />
                    </td>
                    <td className="py-2 px-2">
                      <MatrixNumberCell
                        ariaLabel={`Susceptancia shunt total B_sh de línea ${l.de}-${l.a}`}
                        value={l.b_sh}
                        onChange={(val) => updateLine(idx, { b_sh: val })}
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 bg-slate-50/70 whitespace-nowrap">
                      {ySer.re.toFixed(6)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 bg-slate-50/70 whitespace-nowrap">
                      {ySer.im.toFixed(6)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-slate-600 bg-slate-50/70 whitespace-nowrap">
                      {(l.b_sh / 2).toFixed(5)}
                    </td>
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        disabled={lineas.length <= 1}
                        aria-label={`Eliminar línea ${l.de}-${l.a}`}
                        onClick={() => handleRemoveLine(l.id)}
                        className={`p-1.5 rounded transition-colors ${
                          lineas.length <= 1
                            ? 'text-slate-300 cursor-not-allowed'
                            : 'text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer'
                        }`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guidance notes */}
      {indicaciones.length > 0 && (
        <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
            Indicaciones de ingreso
          </h3>
          <ul className="space-y-1 text-xs text-slate-700 list-disc pl-4">
            {indicaciones.map((txt, idx) => (
              <li key={idx}>{txt}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Cambiar sistema
        </button>

        <button
          type="button"
          disabled={!validation.valid}
          onClick={onContinue}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
            validation.valid
              ? 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Continuar a parámetros de iteración
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
};

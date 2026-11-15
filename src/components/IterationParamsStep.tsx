import React, { useState } from 'react';
import { ArrowLeft, Play } from 'lucide-react';
import { BusInput, LineInput } from '../core/types';
import { InputSummaryTables } from './InputSummaryTables';

interface IterationParamsStepProps {
  titulo: string;
  sBase: number;
  barras: BusInput[];
  lineas: LineInput[];
  indicaciones: string[];
  sugerenciasIter?: { label: string; n_iter: number; tol: number }[];
  nIter: number;
  tol: number;
  alpha: number;
  onChangeNIter: (n: number) => void;
  onChangeTol: (t: number) => void;
  onChangeAlpha: (a: number) => void;
  onBack: () => void;
  onSolve: () => void;
}

export const IterationParamsStep: React.FC<IterationParamsStepProps> = ({
  titulo,
  sBase,
  barras,
  lineas,
  indicaciones,
  sugerenciasIter,
  nIter,
  tol,
  alpha,
  onChangeNIter,
  onChangeTol,
  onChangeAlpha,
  onBack,
  onSolve,
}) => {
  const [nIterStr, setNIterStr] = useState(String(nIter));
  const [tolStr, setTolStr] = useState(tol === 0 ? '0' : tol.toExponential());
  const [alphaStr, setAlphaStr] = useState(String(alpha));
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedIter = parseInt(nIterStr, 10);
    const parsedTol = Number(tolStr);
    const parsedAlpha = Number(alphaStr);

    if (!Number.isInteger(parsedIter) || parsedIter <= 0 || parsedIter > 500) {
      setErrorMsg('El número máximo de iteraciones debe ser un entero positivo (1 a 500).');
      return;
    }
    if (!Number.isFinite(parsedTol) || parsedTol < 0) {
      setErrorMsg('La tolerancia ε debe ser mayor o igual a 0 (use 0 para ejecutar todas las iteraciones).');
      return;
    }
    if (!Number.isFinite(parsedAlpha) || parsedAlpha <= 0 || parsedAlpha > 2.0) {
      setErrorMsg('El factor de aceleración α debe estar entre 0.1 y 2.0 (1.0 = sin aceleración).');
      return;
    }

    setErrorMsg(null);
    onChangeNIter(parsedIter);
    onChangeTol(parsedTol);
    onChangeAlpha(parsedAlpha);
    onSolve();
  };

  const applyIterPreset = (n: number, t?: number) => {
    setNIterStr(String(n));
    onChangeNIter(n);
    if (t !== undefined) {
      setTolStr(t === 0 ? '0' : t.toExponential());
      onChangeTol(t);
    }
  };

  const applyTolPreset = (t: number) => {
    setTolStr(t === 0 ? '0' : t.toExponential());
    onChangeTol(t);
  };

  const applyAlphaPreset = (a: number) => {
    setAlphaStr(String(a));
    onChangeAlpha(a);
  };

  return (
    <section className="max-w-[1360px] mx-auto py-6 sm:py-8 px-4 sm:px-6 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
          Paso 3 · Criterios de Iteración y Convergencia
        </p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">
          Parámetros del Método de Gauss-Seidel
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Responda las preguntas de control iterativo antes de ejecutar el cálculo sobre el sistema tabulado.
        </p>
      </div>

      {/* Interactive Questions Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-6"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Question 1: n_iter */}
          <div className="space-y-2">
            <label
              htmlFor="param-niter"
              className="block text-sm font-semibold text-slate-900 lg:min-h-[40px]"
            >
              1. ¿Cuántas iteraciones se necesitan / máximo de iteraciones?
            </label>
            <input
              id="param-niter"
              type="number"
              min="1"
              max="500"
              value={nIterStr}
              onChange={(e) => {
                const raw = e.target.value;
                setNIterStr(raw);
                const parsed = parseInt(raw, 10);
                if (Number.isInteger(parsed) && parsed > 0 && parsed <= 500) {
                  onChangeNIter(parsed);
                }
              }}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(sugerenciasIter ?? [
                { label: '10 iter.', n_iter: 10, tol: undefined },
                { label: '16 iter.', n_iter: 16, tol: undefined },
                { label: '25 iter.', n_iter: 25, tol: undefined },
              ]).map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => applyIterPreset(s.n_iter, s.tol)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: tol */}
          <div className="space-y-2">
            <label
              htmlFor="param-tol"
              className="block text-sm font-semibold text-slate-900 lg:min-h-[40px]"
            >
              2. ¿Cuál es la tolerancia de convergencia ε?
            </label>
            <input
              id="param-tol"
              type="text"
              value={tolStr}
              onChange={(e) => {
                const raw = e.target.value;
                setTolStr(raw);
                const parsed = Number(raw);
                if (raw.trim() !== '' && Number.isFinite(parsed) && parsed >= 0) {
                  onChangeTol(parsed);
                }
              }}
              placeholder="1e-6"
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: '1e-4', val: 1e-4 },
                { label: '1e-6', val: 1e-6 },
                { label: '1e-8', val: 1e-8 },
                { label: '0 (todas)', val: 0 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyTolPreset(p.val)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Ingrese 0 para ejecutar todas las iteraciones sin detenerse por tolerancia.
            </p>
          </div>

          {/* Question 3: alpha */}
          <div className="space-y-2">
            <label
              htmlFor="param-alpha"
              className="block text-sm font-semibold text-slate-900 lg:min-h-[40px]"
            >
              3. ¿Cuál es el factor de aceleración α?
            </label>
            <input
              id="param-alpha"
              type="number"
              step="0.05"
              min="0.1"
              max="2.0"
              value={alphaStr}
              onChange={(e) => {
                const raw = e.target.value;
                setAlphaStr(raw);
                const parsed = Number(raw);
                if (raw.trim() !== '' && Number.isFinite(parsed) && parsed > 0 && parsed <= 2.0) {
                  onChangeAlpha(parsed);
                }
              }}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: '1.0 (estándar)', val: 1.0 },
                { label: '1.2', val: 1.2 },
                { label: '1.4', val: 1.4 },
                { label: '1.6', val: 1.6 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyAlphaPreset(p.val)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border border-slate-200 rounded transition-colors cursor-pointer whitespace-nowrap"
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">
              Use 1.0 para el método de Gauss-Seidel sin aceleración.
            </p>
          </div>
        </div>

        {errorMsg && (
          <p
            role="alert"
            className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
          >
            {errorMsg}
          </p>
        )}

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a matrices de entrada
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            Calcular flujo de potencia
          </button>
        </div>
      </form>

      {/* Always-visible Tabulated Input Summary */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <InputSummaryTables
          titulo={`Datos de entrada tabulados · ${titulo}`}
          sBase={sBase}
          barras={barras}
          lineas={lineas}
          indicaciones={indicaciones}
        />
      </div>
    </section>
  );
};

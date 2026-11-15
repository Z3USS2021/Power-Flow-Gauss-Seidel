import React, { useState } from 'react';
import { ArrowRight, BookOpen, GitBranch, SlidersHorizontal } from 'lucide-react';

interface WelcomeStepProps {
  onSelectStevenson: () => void;
  onSelect3Bus: () => void;
  onCreateManual: (nBarras: number, nLineas: number, sBase: number) => void;
}

export const WelcomeStep: React.FC<WelcomeStepProps> = ({
  onSelectStevenson,
  onSelect3Bus,
  onCreateManual,
}) => {
  const [showManualForm, setShowManualForm] = useState(false);
  const [sBaseStr, setSBaseStr] = useState('100');
  const [nBarrasStr, setNBarrasStr] = useState('3');
  const [nLineasStr, setNLineasStr] = useState('3');
  const [manualError, setManualError] = useState<string | null>(null);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sBase = parseFloat(sBaseStr);
    const nBarras = parseInt(nBarrasStr, 10);
    const nLineas = parseInt(nLineasStr, 10);

    if (!Number.isFinite(sBase) || sBase <= 0) {
      setManualError('Ingrese un valor positivo para S_base (ej. 100 o 1).');
      return;
    }
    if (!Number.isInteger(nBarras) || nBarras < 2 || nBarras > 20) {
      setManualError('El número de barras debe ser un entero entre 2 y 20.');
      return;
    }
    if (!Number.isInteger(nLineas) || nLineas < 1 || nLineas > 40) {
      setManualError('El número de líneas debe ser un entero entre 1 y 40.');
      return;
    }

    setManualError(null);
    onCreateManual(nBarras, nLineas, sBase);
  };

  return (
    <section className="max-w-4xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">
          Análisis de Sistemas Eléctricos de Potencia
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
          Solucionador de Flujo de Potencia por el Método de Gauss-Seidel
        </h1>
        <p className="mt-3 text-base text-slate-600 max-w-2xl leading-relaxed">
          Configure su red eléctrica mediante matrices editables de barras y líneas en modelo π, defina los criterios de convergencia y obtenga los resultados tabulados junto con el desarrollo paso a paso de cada iteración.
        </p>
      </div>

      {/* Question 1 matching power_flow.py */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Paso 1 · Seleccione el sistema que desea analizar
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Puede cargar uno de los casos de estudio precargados o definir un sistema propio desde cero.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Stevenson 9.2 */}
          <button
            type="button"
            onClick={onSelectStevenson}
            className="group text-left flex flex-col justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-blue-700">
                  Opción 1
                </span>
                <BookOpen className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Ejemplo 9.2 de Grainger & Stevenson
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Sistema clásico de 4 barras (230 kV) con barra Slack, dos barras PQ, una barra PV y líneas con susceptancia shunt.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-700">
              <span className="font-mono tabular-nums">4 barras · 100 MVA</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Option 2: 3-Bus Example */}
          <button
            type="button"
            onClick={onSelect3Bus}
            className="group text-left flex flex-col justify-between p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-blue-700">
                  Opción 2
                </span>
                <GitBranch className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Sistema de ejemplo de 3 barras
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Red triangular sin susceptancia shunt, ideal para validar límites de generación reactiva Q_min y Q_max en barra PV.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-700">
              <span className="font-mono tabular-nums">3 barras · 100 MVA</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>

          {/* Option 3: Manual Entry */}
          <button
            type="button"
            onClick={() => setShowManualForm(true)}
            aria-expanded={showManualForm}
            className={`group text-left flex flex-col justify-between p-5 rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer ${
              showManualForm
                ? 'border-blue-600 bg-blue-50/60'
                : 'border-slate-200 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-mono font-semibold text-blue-700">
                  Opción 3
                </span>
                <SlidersHorizontal className="w-4 h-4 text-slate-400 group-hover:text-blue-700 transition-colors" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                Ingresar datos manualmente
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Defina la potencia base S_base, la cantidad de barras y líneas para construir la matriz editable desde cero.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs font-medium text-slate-700 group-hover:text-blue-700">
              <span>Configuración personalizada</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>

        {/* Interactive Questionnaire for Manual System Creation */}
        {showManualForm && (
          <form
            onSubmit={handleManualSubmit}
            className="mt-6 pt-6 border-t border-slate-200"
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-1">
              Dimensionamiento inicial del sistema manual
            </h3>
            <p className="text-xs text-slate-600 mb-4">
              Responda estas tres preguntas para generar las tablas tipo matriz. Luego podrá agregar o quitar filas libremente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="manual-sbase"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Potencia base S_base [MVA]
                </label>
                <input
                  id="manual-sbase"
                  type="number"
                  step="any"
                  min="0.001"
                  value={sBaseStr}
                  onChange={(e) => setSBaseStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  Use 100 para MW/Mvar, o 1 si ya está en p.u.
                </span>
              </div>

              <div>
                <label
                  htmlFor="manual-barras"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Número total de barras
                </label>
                <input
                  id="manual-barras"
                  type="number"
                  min="2"
                  max="20"
                  value={nBarrasStr}
                  onChange={(e) => setNBarrasStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  Mínimo 2 barras (incluye 1 Slack).
                </span>
              </div>

              <div>
                <label
                  htmlFor="manual-lineas"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Número total de líneas
                </label>
                <input
                  id="manual-lineas"
                  type="number"
                  min="1"
                  max="40"
                  value={nLineasStr}
                  onChange={(e) => setNLineasStr(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  Enlaces en modelo π entre barras.
                </span>
              </div>
            </div>

            {manualError && (
              <p
                role="alert"
                className="mt-3 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {manualError}
              </p>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
              >
                Crear matrices de configuración
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

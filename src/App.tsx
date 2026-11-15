import { useMemo, useState } from 'react';
import { IterationParamsStep } from './components/IterationParamsStep';
import { NetworkMatrixStep } from './components/NetworkMatrixStep';
import { ResultsStep } from './components/ResultsStep';
import { AppStep, TopBar } from './components/TopBar';
import { WelcomeStep } from './components/WelcomeStep';
import { resolverFlujoGaussSeidel, validarSistema } from './core/powerFlow';
import {
  cargarEjemploStevenson92,
  cargarSistemaEjemplo3Barras,
  crearSistemaManual,
} from './core/presets';
import {
  BusInput,
  LineInput,
  PowerFlowResult,
  SystemPreset,
} from './core/types';

function getInitialState(): {
  step: AppStep;
  preset: SystemPreset | null;
  nIter: number;
} {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      return {
        step: 'config',
        preset: cargarEjemploStevenson92(),
        nIter: 16,
      };
    }
  }
  return {
    step: 'welcome',
    preset: null,
    nIter: 16,
  };
}

export default function App() {
  const initial = useMemo(() => getInitialState(), []);

  const [step, setStep] = useState<AppStep>(initial.step);
  const [titulo, setTitulo] = useState<string>(initial.preset?.titulo ?? '');
  const [sBase, setSBase] = useState<number>(initial.preset?.S_base ?? 100);
  const [barras, setBarras] = useState<BusInput[]>(
    initial.preset?.barras ?? []
  );
  const [lineas, setLineas] = useState<LineInput[]>(
    initial.preset?.lineas ?? []
  );
  const [indicaciones, setIndicaciones] = useState<string[]>(
    initial.preset?.indicaciones ?? []
  );
  const [sugerenciasIter, setSugerenciasIter] = useState<
    { label: string; n_iter: number; tol: number }[] | undefined
  >(initial.preset?.sugerenciasIter);

  const [nIter, setNIter] = useState<number>(initial.nIter);
  const [tol, setTol] = useState<number>(1e-6);
  const [alpha, setAlpha] = useState<number>(1.0);
  const [result, setResult] = useState<PowerFlowResult | null>(null);

  const hasSystem = barras.length > 0;
  const validation = useMemo(
    () =>
      hasSystem
        ? validarSistema(barras, lineas, sBase)
        : { valid: false, errors: [] },
    [hasSystem, barras, lineas, sBase]
  );

  const loadPreset = (preset: SystemPreset, defaultIter: number) => {
    setTitulo(preset.titulo);
    setSBase(preset.S_base);
    setBarras(preset.barras);
    setLineas(preset.lineas);
    setIndicaciones(preset.indicaciones);
    setSugerenciasIter(preset.sugerenciasIter);
    setNIter(defaultIter);
    setTol(1e-6);
    setAlpha(1.0);
    setResult(null);
    setStep('config');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectStevenson = () => {
    loadPreset(cargarEjemploStevenson92(), 16);
  };

  const handleSelect3Bus = () => {
    loadPreset(cargarSistemaEjemplo3Barras(), 20);
  };

  const handleCreateManual = (
    nBarras: number,
    nLineas: number,
    manualSBase: number
  ) => {
    loadPreset(crearSistemaManual(nBarras, nLineas, manualSBase), 25);
  };

  const handleSolve = () => {
    if (!validation.valid) {
      setStep('config');
      return;
    }
    const solved = resolverFlujoGaussSeidel(barras, lineas, nIter, tol, alpha);
    setResult(solved);
    setStep('results');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrimaryAction = () => {
    if (step === 'welcome') {
      handleSelectStevenson();
      return;
    }
    handleSolve();
  };

  const handleNavigate = (target: AppStep) => {
    if (target === 'results' && !result) return;
    if ((target === 'config' || target === 'params') && !hasSystem) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        currentStep={step}
        hasSystem={hasSystem}
        hasResults={result !== null}
        canCalculate={validation.valid}
        onNavigate={handleNavigate}
        onPrimaryAction={handlePrimaryAction}
      />

      <main className="flex-1">
        {step === 'welcome' && (
          <WelcomeStep
            onSelectStevenson={handleSelectStevenson}
            onSelect3Bus={handleSelect3Bus}
            onCreateManual={handleCreateManual}
          />
        )}

        {step === 'config' && hasSystem && (
          <NetworkMatrixStep
            titulo={titulo}
            sBase={sBase}
            barras={barras}
            lineas={lineas}
            indicaciones={indicaciones}
            validation={validation}
            onChangeSBase={(v) => {
              setSBase(v);
              setResult(null);
            }}
            onChangeBarras={(b) => {
              setBarras(b);
              setResult(null);
            }}
            onChangeLineas={(l) => {
              setLineas(l);
              setResult(null);
            }}
            onBack={() => setStep('welcome')}
            onContinue={() => {
              if (validation.valid) {
                setStep('params');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          />
        )}

        {step === 'params' && hasSystem && (
          <IterationParamsStep
            titulo={titulo}
            sBase={sBase}
            barras={barras}
            lineas={lineas}
            indicaciones={indicaciones}
            sugerenciasIter={sugerenciasIter}
            nIter={nIter}
            tol={tol}
            alpha={alpha}
            onChangeNIter={setNIter}
            onChangeTol={setTol}
            onChangeAlpha={setAlpha}
            onBack={() => setStep('config')}
            onSolve={handleSolve}
          />
        )}

        {step === 'results' && result && (
          <ResultsStep
            titulo={titulo}
            sBase={sBase}
            barras={barras}
            lineas={lineas}
            indicaciones={indicaciones}
            nIter={nIter}
            tol={tol}
            alpha={alpha}
            result={result}
            onEditConfig={() => setStep('config')}
            onEditParams={() => setStep('params')}
          />
        )}
      </main>
    </div>
  );
}

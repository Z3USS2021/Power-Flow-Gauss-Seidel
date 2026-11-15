import React from 'react';

export type AppStep = 'welcome' | 'config' | 'params' | 'results';

interface TopBarProps {
  currentStep: AppStep;
  hasSystem: boolean;
  hasResults: boolean;
  canCalculate: boolean;
  onNavigate: (step: AppStep) => void;
  onPrimaryAction: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentStep,
  hasSystem,
  hasResults,
  canCalculate,
  onNavigate,
  onPrimaryAction,
}) => {
  const navItems: { id: AppStep; label: string; enabled: boolean }[] = [
    { id: 'welcome', label: 'Bienvenida', enabled: true },
    { id: 'config', label: 'Configuración', enabled: hasSystem },
    { id: 'params', label: 'Parámetros', enabled: hasSystem },
    { id: 'results', label: 'Resultados', enabled: hasResults },
  ];

  const primaryLabel =
    currentStep === 'welcome'
      ? 'Cargar ejemplo 9.2'
      : currentStep === 'results'
      ? 'Recalcular flujo'
      : 'Calcular flujo';

  const primaryDisabled =
    currentStep !== 'welcome' && (!hasSystem || !canCalculate);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 h-12 md:h-14 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Brand wordmark (single text element) */}
        <button
          type="button"
          onClick={() => onNavigate('welcome')}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-blue-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded cursor-pointer"
        >
          Flujo de Potencia GS
        </button>

        {/* Zone 2 (Desktop): Concise single-line step links */}
        <nav
          aria-label="Pasos del análisis"
          className="hidden md:flex items-center gap-6 h-full"
        >
          {navItems.map((item) => {
            const isActive = currentStep === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={!item.enabled}
                onClick={() => item.enabled && onNavigate(item.id)}
                className={`relative h-full inline-flex items-center px-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer ${
                  isActive
                    ? 'text-blue-700 font-semibold'
                    : item.enabled
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-300 cursor-not-allowed'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="shrink-0">
          <button
            type="button"
            disabled={primaryDisabled}
            onClick={onPrimaryAction}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
              primaryDisabled
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-700 text-white hover:bg-blue-800 cursor-pointer'
            }`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>

      {/* Mobile compact step bar (<= 40px height, keeps total sticky header <= 88px < 15% of 844px) */}
      <nav
        aria-label="Pasos del análisis móvil"
        className="md:hidden border-t border-slate-100 bg-slate-50/80 px-2 h-9 grid grid-cols-4 gap-1"
      >
        {navItems.map((item) => {
          const isActive = currentStep === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={!item.enabled}
              onClick={() => item.enabled && onNavigate(item.id)}
              className={`relative h-full flex items-center justify-center text-[11px] font-medium whitespace-nowrap truncate px-1 transition-colors ${
                isActive
                  ? 'text-blue-700 font-semibold'
                  : item.enabled
                  ? 'text-slate-600'
                  : 'text-slate-300'
              }`}
            >
              {item.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-blue-700"
                />
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

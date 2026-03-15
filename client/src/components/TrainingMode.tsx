import {
  createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode
} from 'react';
import {
  X, ChevronRight, ChevronLeft, Zap, BookOpen, Bot, GraduationCap
} from 'lucide-react';

// ─── Tour Steps Definition ─────────────────────────────────────────────────

interface TourStep {
  id: string;
  title: string;
  description: string;
  selector: string | null;
  position?: 'center' | 'right' | 'left' | 'below' | 'above' | 'auto';
  floraQuestion?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '👋 Bem-vindo ao treinamento!',
    description: 'Este tour rápido vai mostrar as principais áreas do VivaFrutaz. Leva apenas 2 minutos. Use os botões abaixo para navegar.',
    selector: null,
    position: 'center',
  },
  {
    id: 'dashboard',
    title: '📊 Painel Principal',
    description: 'Esta é a visão geral do sistema. Aqui você vê pedidos do dia, alertas críticos, métricas de faturamento e movimentação em tempo real.',
    selector: '[href="/admin"]',
    floraQuestion: 'O que mostra o painel principal do sistema?',
  },
  {
    id: 'orders',
    title: '📦 Pedidos',
    description: 'Central de pedidos dos clientes. Aqui você visualiza, aprova, fatura, gera DANFEs e exporta para o Bling ERP.',
    selector: '[href="/admin/orders"]',
    floraQuestion: 'Como funciona o módulo de pedidos?',
  },
  {
    id: 'contracts',
    title: '📋 Gestão de Contratos',
    description: 'Configure escopos contratuais para clientes fixos. Defina produtos, quantidades e dias de entrega — os pedidos são gerados automaticamente toda semana.',
    selector: '[href="/admin/contracts"]',
    floraQuestion: 'Como funciona o escopo contratual?',
  },
  {
    id: 'purchase_planning',
    title: '🛒 Planejamento de Compras',
    description: 'Pedidos do escopo contratual aparecem aqui consolidados por produto. Planeje e registre suas compras semanais com controle de fornecedores.',
    selector: '[href="/admin/purchase-planning"]',
    floraQuestion: 'Como funciona o planejamento de compras?',
  },
  {
    id: 'products',
    title: '🍎 Produtos',
    description: 'Catálogo completo de produtos. Configure preços base, ID de produto, disponibilidade por categoria de cliente e alertas de variação de custo.',
    selector: '[href="/admin/products"]',
    floraQuestion: 'Como cadastrar um novo produto no sistema?',
  },
  {
    id: 'fiscal',
    title: '🧾 Gestão de Notas Fiscais',
    description: 'Central de faturamento. Emita DANFEs, exporte para o Bling, importe notas de entrada via OCR e acompanhe o cálculo automático de custo médio.',
    selector: '[href="/admin/fiscal"]',
    floraQuestion: 'Como funciona a gestão de notas fiscais e a exportação para o Bling?',
  },
  {
    id: 'inventory',
    title: '📦 Estoque / Inventário',
    description: 'Acompanhe os níveis de estoque em tempo real. Visualize custo médio por produto, alertas de estoque baixo e histórico de entradas e saídas.',
    selector: '[href="/admin/inventory"]',
    floraQuestion: 'Como funciona o controle de estoque e custo médio?',
  },
  {
    id: 'companies',
    title: '🏢 Empresas / Clientes',
    description: 'Cadastro completo de clientes. Configure portal de acesso, grupos de preço, tipo de contrato (avulso, mensal ou contratual) e escopo de produtos.',
    selector: '[href="/admin/companies"]',
    floraQuestion: 'Como cadastrar e configurar uma nova empresa cliente?',
  },
  {
    id: 'flora',
    title: '🌿 Flora IA — sua assistente',
    description: 'A Flora está sempre disponível no canto da tela. Use-a para consultas instantâneas, exportações em Excel, análises de risco e tirar dúvidas sobre qualquer funcionalidade.',
    selector: '[data-testid="button-virtual-assistant"]',
    floraQuestion: 'O que você pode fazer para me ajudar no dia a dia?',
  },
  {
    id: 'complete',
    title: '🎉 Treinamento Concluído!',
    description: 'Parabéns! Você conheceu as principais áreas do VivaFrutaz. Lembre-se: a Flora IA está sempre disponível para tirar dúvidas — basta clicar no botão verde.',
    selector: null,
    position: 'center',
  },
];

const STORAGE_KEY = 'vf_training_completed_v1';

// ─── Context ──────────────────────────────────────────────────────────────

interface TrainingContextValue {
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTraining: () => void;
  stopTraining: () => void;
  isCompleted: boolean;
}

const TrainingContext = createContext<TrainingContextValue>({
  isActive: false,
  currentStep: 0,
  totalSteps: TOUR_STEPS.length,
  startTraining: () => {},
  stopTraining: () => {},
  isCompleted: false,
});

export const useTraining = () => useContext(TrainingContext);

// ─── Tooltip Balloon ─────────────────────────────────────────────────────

interface TooltipProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onAskFlora: (q: string) => void;
}

function TooltipBalloon({ step, stepIndex, totalSteps, targetRect, onNext, onPrev, onSkip, onAskFlora }: TooltipProps) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;
  const isCentered = step.position === 'center' || !targetRect;

  let style: React.CSSProperties = {};

  if (isCentered) {
    style = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 10001,
    };
  } else if (targetRect) {
    // Position tooltip: prefer right of element if space exists, else left; prefer below if enough space
    const TOOLTIP_W = 320;
    const TOOLTIP_H = 200;
    const GAP = 16;
    const VW = window.innerWidth;
    const VH = window.innerHeight;

    const rightSpace = VW - (targetRect.right + GAP);
    const leftSpace = targetRect.left - GAP - TOOLTIP_W;
    const belowSpace = VH - (targetRect.bottom + GAP);
    const aboveSpace = targetRect.top - GAP - TOOLTIP_H;

    let top: number;
    let left: number;

    if (rightSpace >= TOOLTIP_W) {
      // Right
      left = targetRect.right + GAP;
      top = Math.min(Math.max(targetRect.top, 16), VH - TOOLTIP_H - 16);
    } else if (leftSpace >= 0) {
      // Left
      left = targetRect.left - TOOLTIP_W - GAP;
      top = Math.min(Math.max(targetRect.top, 16), VH - TOOLTIP_H - 16);
    } else if (belowSpace >= TOOLTIP_H) {
      // Below
      top = targetRect.bottom + GAP;
      left = Math.min(Math.max(targetRect.left, 16), VW - TOOLTIP_W - 16);
    } else {
      // Above
      top = Math.max(targetRect.top - TOOLTIP_H - GAP, 16);
      left = Math.min(Math.max(targetRect.left, 16), VW - TOOLTIP_W - 16);
    }

    style = { position: 'fixed', top, left, zIndex: 10001, width: TOOLTIP_W };
  }

  return (
    <div
      style={style}
      className="w-80 bg-card border-2 border-primary/30 rounded-3xl shadow-2xl shadow-black/40 overflow-hidden"
      data-testid="training-tooltip"
    >
      {/* Header */}
      <div className="bg-primary p-4 text-primary-foreground">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-primary-foreground/60 uppercase tracking-wider mb-0.5">
              Passo {stepIndex + 1} de {totalSteps}
            </p>
            <h3 className="font-display font-bold text-base leading-tight">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onSkip}
            data-testid="button-training-skip"
            className="w-7 h-7 rounded-xl bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center flex-shrink-0 transition-colors"
            title="Pular treinamento"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-1.5 bg-primary-foreground/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-foreground rounded-full transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>

        {step.floraQuestion && (
          <button
            type="button"
            onClick={() => onAskFlora(step.floraQuestion!)}
            data-testid="button-training-ask-flora"
            className="mt-3 w-full flex items-center gap-2 px-3 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-semibold transition-colors"
          >
            <Bot className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-left leading-tight">Perguntar à Flora sobre isto</span>
          </button>
        )}
      </div>

      {/* Navigation */}
      <div className="px-4 pb-4 flex items-center gap-2">
        {!isFirst && (
          <button
            type="button"
            onClick={onPrev}
            data-testid="button-training-prev"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted hover:bg-muted/80 text-muted-foreground text-xs font-semibold transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Voltar
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          data-testid="button-training-next"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold transition-colors hover:bg-primary/90"
        >
          {isLast ? (
            <><Zap className="w-3.5 h-3.5" /> Finalizar treinamento</>
          ) : (
            <>Próximo <ChevronRight className="w-3.5 h-3.5" /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Training Mode Provider ───────────────────────────────────────────────

interface ProviderProps {
  children: ReactNode;
  onAskFlora?: (message: string) => void;
}

export function TrainingModeProvider({ children, onAskFlora }: ProviderProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isCompleted, setIsCompleted] = useState(() => !!localStorage.getItem(STORAGE_KEY));
  const prevElementRef = useRef<HTMLElement | null>(null);

  const getTargetElement = useCallback((selector: string | null): HTMLElement | null => {
    if (!selector) return null;
    return document.querySelector<HTMLElement>(selector);
  }, []);

  const applySpotlight = useCallback((el: HTMLElement | null) => {
    // Remove from previous element
    if (prevElementRef.current) {
      prevElementRef.current.style.removeProperty('position');
      prevElementRef.current.style.removeProperty('z-index');
      prevElementRef.current.style.removeProperty('border-radius');
      prevElementRef.current.style.removeProperty('outline');
      prevElementRef.current.style.removeProperty('outline-offset');
      prevElementRef.current = null;
    }

    if (!el) {
      setTargetRect(null);
      return;
    }

    // Apply spotlight styles to target element
    el.style.setProperty('position', 'relative');
    el.style.setProperty('z-index', '10000');
    el.style.setProperty('border-radius', '10px');
    el.style.setProperty('outline', '3px solid hsl(var(--primary))');
    el.style.setProperty('outline-offset', '4px');
    prevElementRef.current = el;

    // Scroll into view smoothly
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

    // Get rect after a small delay (for scroll to complete)
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    }, 300);
  }, []);

  const goToStep = useCallback((idx: number) => {
    const step = TOUR_STEPS[idx];
    const el = getTargetElement(step.selector);
    applySpotlight(el);
    setCurrentStep(idx);
    if (!step.selector) setTargetRect(null);
  }, [getTargetElement, applySpotlight]);

  const cleanupSpotlight = useCallback(() => {
    if (prevElementRef.current) {
      prevElementRef.current.style.removeProperty('position');
      prevElementRef.current.style.removeProperty('z-index');
      prevElementRef.current.style.removeProperty('border-radius');
      prevElementRef.current.style.removeProperty('outline');
      prevElementRef.current.style.removeProperty('outline-offset');
      prevElementRef.current = null;
    }
  }, []);

  const startTraining = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
    const step = TOUR_STEPS[0];
    const el = getTargetElement(step.selector);
    applySpotlight(el);
  }, [getTargetElement, applySpotlight]);

  const stopTraining = useCallback(() => {
    cleanupSpotlight();
    setIsActive(false);
    setTargetRect(null);
  }, [cleanupSpotlight]);

  const finishTraining = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsCompleted(true);
    cleanupSpotlight();
    setIsActive(false);
    setTargetRect(null);
  }, [cleanupSpotlight]);

  const handleNext = useCallback(() => {
    const nextIdx = currentStep + 1;
    if (nextIdx >= TOUR_STEPS.length) {
      finishTraining();
    } else {
      goToStep(nextIdx);
    }
  }, [currentStep, goToStep, finishTraining]);

  const handlePrev = useCallback(() => {
    const prevIdx = currentStep - 1;
    if (prevIdx >= 0) goToStep(prevIdx);
  }, [currentStep, goToStep]);

  const handleAskFlora = useCallback((question: string) => {
    stopTraining();
    if (onAskFlora) onAskFlora(question);
  }, [stopTraining, onAskFlora]);

  // Update rect on window resize
  useEffect(() => {
    if (!isActive) return;
    const step = TOUR_STEPS[currentStep];
    const el = getTargetElement(step.selector);
    if (!el) return;
    const handleResize = () => {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isActive, currentStep, getTargetElement]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanupSpotlight();
  }, [cleanupSpotlight]);

  const step = TOUR_STEPS[currentStep];

  return (
    <TrainingContext.Provider value={{ isActive, currentStep, totalSteps: TOUR_STEPS.length, startTraining, stopTraining, isCompleted }}>
      {children}

      {isActive && (
        <>
          {/* Dim overlay */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'all' }}
            className="bg-black/65"
            data-testid="training-overlay"
          />

          {/* Spotlight cutout — appears above the overlay, below the highlighted element */}
          {targetRect && (
            <div
              style={{
                position: 'fixed',
                top: targetRect.top - 10,
                left: targetRect.left - 10,
                width: targetRect.width + 20,
                height: targetRect.height + 20,
                zIndex: 9998,
                pointerEvents: 'none',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                boxShadow: '0 0 0 9999px rgba(0,0,0,0)',
              }}
            />
          )}

          {/* Tooltip */}
          <TooltipBalloon
            step={step}
            stepIndex={currentStep}
            totalSteps={TOUR_STEPS.length}
            targetRect={targetRect}
            onNext={handleNext}
            onPrev={handlePrev}
            onSkip={stopTraining}
            onAskFlora={handleAskFlora}
          />
        </>
      )}
    </TrainingContext.Provider>
  );
}

// ─── Training Mode Trigger Button ─────────────────────────────────────────

export function TrainingModeButton() {
  const { isActive, startTraining, stopTraining, isCompleted } = useTraining();

  return (
    <button
      type="button"
      onClick={isActive ? stopTraining : startTraining}
      data-testid="button-training-mode"
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
        isActive
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
          : 'bg-primary/5 hover:bg-primary/10 text-primary'
      }`}
    >
      <GraduationCap className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-left">
        {isActive ? 'Parar treinamento' : 'Modo Treinamento'}
      </span>
      {!isActive && isCompleted && (
        <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full font-bold">
          ✓
        </span>
      )}
      {!isActive && !isCompleted && (
        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-bold">
          Novo
        </span>
      )}
    </button>
  );
}

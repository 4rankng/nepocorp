// TourController — the persistent tour chrome rendered at the app root (a
// sibling of <AppRoutes/>, OUTSIDE the agent Drawer so it survives route changes
// and never inherits the drawer's navigate-close behavior). Renders nothing
// unless a tour is active or a resume prompt is pending. Fixed bottom-right,
// styled to match the .agent-tutorial card family.
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useTourController } from '../../context/TourControllerContext';
import { getInProgressStep } from '../../lib/tourProgress';
import { TourStepBody } from './TourStepBody';
import './agent.css';

export function TourController() {
  const {
    tour,
    currentStep,
    highlightMissed,
    resumable,
    start,
    next,
    prev,
    skip,
    complete,
    dismissResume,
  } = useTourController();

  if (resumable && !tour) {
    return (
      <div className="agent-tour agent-tour--resume" role="dialog" aria-label="Tiếp tục hướng dẫn">
        <div className="agent-tour__resume-body">
          <div className="agent-tour__resume-eyebrow">Tiếp tục hướng dẫn?</div>
          <div className="agent-tour__resume-name">{resumable.title}</div>
        </div>
        <div className="agent-tour__resume-actions">
          <button
            type="button"
            className="agent-tour__btn agent-tour__btn--ghost"
            onClick={dismissResume}
          >
            Để sau
          </button>
          <button
            type="button"
            className="agent-tour__btn agent-tour__btn--primary"
            onClick={() => start(resumable.id, getInProgressStep(resumable.id) ?? 0)}
          >
            Tiếp tục
          </button>
        </div>
      </div>
    );
  }

  if (!tour) return null;

  const step = tour.steps[currentStep];
  const isLast = currentStep >= tour.steps.length - 1;

  return (
    <div className="agent-tour" role="dialog" aria-label={`Hướng dẫn: ${tour.title}`}>
      <div className="agent-tour__head">
        <div className="agent-tour__title">{tour.title}</div>
        <button
          type="button"
          className="agent-tour__close"
          aria-label="Bỏ qua hướng dẫn"
          onClick={skip}
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="agent-tour__progress">
        Bước {currentStep + 1} / {tour.steps.length}
      </div>

      <div className="agent-tour__step">
        <TourStepBody step={step} index={currentStep} />
      </div>

      {highlightMissed && (
        <div className="agent-tour__note">
          Không thấy phần tử trên trang — bấm “Tiếp theo” để sang bước kế.
        </div>
      )}

      <div className="agent-tour__actions">
        <button
          type="button"
          className="agent-tour__btn agent-tour__btn--ghost"
          onClick={prev}
          disabled={currentStep === 0}
        >
          <ArrowLeft size={15} aria-hidden="true" /> Trước
        </button>
        {isLast ? (
          <button
            type="button"
            className="agent-tour__btn agent-tour__btn--primary"
            onClick={complete}
          >
            <Check size={15} aria-hidden="true" /> Xong
          </button>
        ) : (
          <button
            type="button"
            className="agent-tour__btn agent-tour__btn--primary"
            onClick={next}
          >
            Tiếp theo <ArrowRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

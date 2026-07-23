import type { Move } from './generated/cube-data.js';

export type RouteKind = 'custom' | 'solution' | null;

interface TimelineState {
  route: readonly Move[];
  positionMoves: readonly Move[];
  routeKind: RouteKind;
  routeIndex: number;
}

export class TimelineView {
  constructor(
    private readonly timeline: HTMLDivElement,
    private readonly label: HTMLSpanElement,
    private readonly count: HTMLSpanElement,
  ) {}

  render(state: TimelineState, goTo: (index: number) => void): void {
    const { route, positionMoves, routeKind, routeIndex } = state;
    this.timeline.replaceChildren();
    const showingRoute = route.length > 0;
    const moves = showingRoute ? route : positionMoves;
    this.label.textContent = showingRoute
      ? routeKind === 'custom'
        ? 'Loaded route'
        : 'Solution'
      : 'Your moves';
    this.count.textContent = String(moves.length);
    this.timeline.classList.toggle('position-history', !showingRoute);

    if (!moves.length) {
      const empty = document.createElement('span');
      empty.className = 'timeline-empty';
      empty.textContent = 'Face turns and scrambles appear here.';
      this.timeline.append(empty);
      return;
    }

    moves.forEach((move, index) => {
      const chip = document.createElement(showingRoute ? 'button' : 'span');
      chip.className = showingRoute ? 'move-chip' : 'history-chip';
      chip.dataset.face = move[0];

      const number = document.createElement('span');
      number.className = 'move-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const notation = document.createElement('strong');
      notation.textContent = move;
      chip.append(number, notation);

      if (showingRoute) {
        (chip as HTMLButtonElement).type = 'button';
        if (index < routeIndex) chip.classList.add('done');
        if (index === routeIndex) chip.classList.add('active');
        chip.title = `Go to move ${index + 1}`;
        chip.addEventListener('click', () => goTo(index));
      }
      this.timeline.append(chip);
    });
    this.centerActiveMove();
  }

  private centerActiveMove(): void {
    const active = this.timeline.querySelector<HTMLElement>('.active');
    if (!active) return;
    const timelineBounds = this.timeline.getBoundingClientRect();
    const activeBounds = active.getBoundingClientRect();
    const centeredTop =
      this.timeline.scrollTop +
      activeBounds.top -
      timelineBounds.top -
      (this.timeline.clientHeight - activeBounds.height) / 2;
    this.timeline.scrollTo({
      top: Math.max(0, centeredTop),
      behavior: 'smooth',
    });
  }
}

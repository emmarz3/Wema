/**
 * Simulated simulation engine.
 *
 * The engine owns the simulation clock and every control action: start,
 * pause, resume, stop, mode changes and cadence changes. It belongs to the
 * data source — React components only read this state and send control
 * commands; they never advance the clock themselves.
 */
import { uuid } from '../../lib/utils';
import type {
  SimulationControlEntry,
  SimulationError,
  SimulationMode,
  SimulationState,
  SimulationStatus,
} from '../../types/domain';

const DEFAULT_INTERVAL_SECONDS = 15;
const MIN_INTERVAL_SECONDS = 5;
const MAX_INTERVAL_SECONDS = 300;
const ENVIRONMENT_NAME =
  (import.meta.env?.VITE_APP_ENV as string | undefined) || 'Hackathon Demonstration';

const ERROR_MESSAGES = [
  'Payment provider did not respond within the simulated timeout.',
  'Event queue delay exceeded the configured threshold.',
  'Webhook delivery rejected by the destination during simulation.',
];

/** World surface the engine needs to emit events into. */
export interface SimulationWorldBinding {
  onHeartbeat: (status: SimulationStatus) => void;
  onError: () => string;
}

class SimulatedEngine {
  private state: SimulationState = 'running';
  private mode: SimulationMode = 'live';
  private intervalSeconds = DEFAULT_INTERVAL_SECONDS;
  private heartbeatAt = new Date().toISOString();
  private lastActivityAt = new Date().toISOString();
  private startedAt: string | null = new Date().toISOString();
  private stoppedAt: string | null = null;
  private activeScenarioName: string | null = null;
  private generatedEventCount = 0;
  private history: SimulationControlEntry[] = [];
  private errors: SimulationError[] = [];
  private listeners = new Set<(status: SimulationStatus) => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private binding: SimulationWorldBinding | null = null;
  private tickCount = 0;

  constructor() {
    // Recorded control history so the workspace shows a real audit trail.
    // Newest first.
    const now = Date.now();
    this.history = [
      {
        id: uuid('ctl'),
        action: 'interval_changed',
        at: new Date(now - 48_000).toISOString(),
        actor: 'Tunde Bello',
        detail: 'Event interval changed from 30s to 15s.',
        fromState: 'running',
        toState: 'running',
      },
      {
        id: uuid('ctl'),
        action: 'started',
        at: new Date(now - 90_000).toISOString(),
        actor: 'Amara Okafor',
        detail: 'Simulation started in live simulation mode at a 15s cadence.',
        fromState: 'stopped',
        toState: 'running',
      },
    ];
    this.errors = [
      {
        id: uuid('err'),
        at: new Date(now - 3 * 60_000).toISOString(),
        code: 'provider_timeout',
        message: 'Payment provider did not respond within the simulated timeout.',
      },
    ];
    this.startClock();
  }

  /* ------------------------------------------------------------- read side */

  getStatus(): SimulationStatus {
    return {
      state: this.state,
      mode: this.mode,
      eventIntervalSeconds: this.intervalSeconds,
      heartbeatAt: this.heartbeatAt,
      lastActivityAt: this.lastActivityAt,
      startedAt: this.startedAt,
      stoppedAt: this.stoppedAt,
      activeScenarioName: this.activeScenarioName,
      generatedEventCount: this.generatedEventCount,
      nextActivityAt: this.nextActivityAt(),
      environmentName: ENVIRONMENT_NAME,
    };
  }

  getHistory(): SimulationControlEntry[] {
    // Newest first by construction: entries are prepended as they happen.
    // Sorting by timestamp alone would shuffle actions recorded within the
    // same millisecond.
    return this.history.slice();
  }

  getErrors(): SimulationError[] {
    return this.errors.slice(0, 10);
  }

  onChange(listener: (status: SimulationStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Binds the world so heartbeats can emit events into it. */
  bindWorld(binding: SimulationWorldBinding): void {
    this.binding = binding;
  }

  /* ---------------------------------------------------------- control side */

  private nextActivityAt(): string | null {
    if (this.state !== 'running') return null;
    const next = new Date(this.heartbeatAt).getTime() + this.intervalSeconds * 1000;
    return new Date(next).toISOString();
  }

  private record(
    action: SimulationControlEntry['action'],
    detail: string,
    from: SimulationState,
    to: SimulationState,
    actor: string,
  ): void {
    this.history = [
      {
        id: uuid('ctl'),
        action,
        at: new Date().toISOString(),
        actor,
        detail,
        fromState: from,
        toState: to,
      },
      ...this.history,
    ].slice(0, 50);
  }

  private emit(): void {
    const snapshot = this.getStatus();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private startClock(): void {
    this.stopClock();
    if (this.state !== 'running') return;
    this.timer = setInterval(() => this.tick(), this.intervalSeconds * 1000);
  }

  private stopClock(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** One configured-cadence tick of the simulation heartbeat. */
  private tick(): void {
    this.tickCount += 1;
    const now = new Date().toISOString();
    this.heartbeatAt = now;
    this.lastActivityAt = now;

    // Replay mode reports recorded activity; it generates nothing new.
    if (this.mode !== 'replay') {
      this.generatedEventCount += 1;
      this.binding?.onHeartbeat(this.getStatus());
    }

    // The simulated provider is degraded, so the simulation occasionally
    // records an error while running.
    if (this.tickCount % 3 === 0) {
      const message = ERROR_MESSAGES[this.tickCount % ERROR_MESSAGES.length];
      this.errors = [
        {
          id: uuid('err'),
          at: now,
          code: this.tickCount % 2 === 0 ? 'provider_timeout' : 'delivery_rejected',
          message,
        },
        ...this.errors,
      ].slice(0, 10);
      this.binding?.onError();
    }

    this.emit();
  }

  start(actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (this.state === 'running') {
      return { ok: false, code: 'invalid_state', message: 'The simulation is already running.' };
    }
    const from = this.state;
    this.state = 'running';
    this.stoppedAt = null;
    this.startedAt = new Date().toISOString();
    this.record('started', `Simulation started in ${this.mode} mode.`, from, 'running', actor);
    this.startClock();
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  pause(actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (this.state !== 'running') {
      return { ok: false, code: 'invalid_state', message: 'Only a running simulation can be paused.' };
    }
    const from = this.state;
    this.state = 'paused';
    this.record('paused', 'Simulation paused; generated activity is suspended.', from, 'paused', actor);
    this.stopClock();
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  resume(actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (this.state !== 'paused') {
      return { ok: false, code: 'invalid_state', message: 'Only a paused simulation can be resumed.' };
    }
    const from = this.state;
    this.state = 'running';
    this.record('resumed', 'Simulation resumed on the configured cadence.', from, 'running', actor);
    this.startClock();
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  stop(actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (this.state === 'stopped') {
      return { ok: false, code: 'invalid_state', message: 'The simulation is already stopped.' };
    }
    const from = this.state;
    this.state = 'stopped';
    this.stoppedAt = new Date().toISOString();
    this.record('stopped', 'Simulation stopped; activity generation halted.', from, 'stopped', actor);
    this.stopClock();
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  setMode(mode: SimulationMode, actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (!['live', 'scenario', 'replay'].includes(mode)) {
      return { ok: false, code: 'invalid_mode', message: 'Choose a supported simulation mode.' };
    }
    if (mode === this.mode) {
      return { ok: false, code: 'invalid_state', message: `The simulation is already in ${mode} mode.` };
    }
    const previous = this.mode;
    this.mode = mode;
    const detail =
      mode === 'live'
        ? 'Mode changed to live simulation: continuous generated activity.'
        : mode === 'scenario'
          ? 'Mode changed to scenario mode: controlled test cases run from the scenario workspace.'
          : 'Mode changed to replay mode: recorded activity is reported and nothing new is generated.';
    this.record('mode_changed', detail, this.state, this.state, actor);
    void previous;
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  setInterval(seconds: number, actor: string): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
    if (!Number.isFinite(seconds) || seconds < MIN_INTERVAL_SECONDS || seconds > MAX_INTERVAL_SECONDS) {
      return {
        ok: false,
        code: 'invalid_interval',
        message: `Choose a cadence between ${MIN_INTERVAL_SECONDS} and ${MAX_INTERVAL_SECONDS} seconds.`,
      };
    }
    const previous = this.intervalSeconds;
    this.intervalSeconds = Math.round(seconds);
    this.record(
      'interval_changed',
      `Event interval changed from ${previous}s to ${this.intervalSeconds}s.`,
      this.state,
      this.state,
      actor,
    );
    // The cadence is the heartbeat interval only; transaction lifecycle
    // timing is independent of it.
    this.startClock();
    this.emit();
    return { ok: true, status: this.getStatus() };
  }

  /** Records a scenario becoming active (used by the scenario workspace). */
  setActiveScenario(name: string | null, actor: string): void {
    this.activeScenarioName = name;
    this.record(
      'mode_changed',
      name ? `Scenario "${name}" selected for execution.` : 'Active scenario cleared.',
      this.state,
      this.state,
      actor,
    );
    this.emit();
  }
}

const engine = new SimulatedEngine();

export const INTERVAL_LIMITS = {
  min: MIN_INTERVAL_SECONDS,
  max: MAX_INTERVAL_SECONDS,
  default: DEFAULT_INTERVAL_SECONDS,
};

export function observeSimulationStatus(
  listener: (status: SimulationStatus) => void,
): () => void {
  return engine.onChange(listener);
}

export function simulationStatus(): SimulationStatus {
  return engine.getStatus();
}

export function simulationHistory(): SimulationControlEntry[] {
  return engine.getHistory();
}

export function simulationErrors(): SimulationError[] {
  return engine.getErrors();
}

export function bindSimulationWorld(binding: SimulationWorldBinding): void {
  engine.bindWorld(binding);
}

export function setActiveScenario(name: string | null, actor: string): void {
  engine.setActiveScenario(name, actor);
}

export type SimulationCommand =
  | { kind: 'start'; actor: string }
  | { kind: 'pause'; actor: string }
  | { kind: 'resume'; actor: string }
  | { kind: 'stop'; actor: string }
  | { kind: 'mode'; mode: SimulationMode; actor: string }
  | { kind: 'interval'; seconds: number; actor: string };

/** Runs a control command against the engine. */
export function runSimulationCommand(
  command: SimulationCommand,
): { ok: true; status: SimulationStatus } | { ok: false; code: string; message: string } {
  switch (command.kind) {
    case 'start':
      return engine.start(command.actor);
    case 'pause':
      return engine.pause(command.actor);
    case 'resume':
      return engine.resume(command.actor);
    case 'stop':
      return engine.stop(command.actor);
    case 'mode':
      return engine.setMode(command.mode, command.actor);
    case 'interval':
      return engine.setInterval(command.seconds, command.actor);
  }
}

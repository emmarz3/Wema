import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  INTERVAL_LIMITS,
  observeSimulationStatus,
  runSimulationCommand,
  simulationErrors,
  simulationHistory,
  simulationStatus,
} from '../api/simulated/clock';
import { createClientForTests } from './apiTestClient';

/** Drives the shared engine to a known state, re-reading after each command. */
function resetEngine() {
  if (simulationStatus().state === 'running') {
    runSimulationCommand({ kind: 'pause', actor: 'Test' });
  }
  if (simulationStatus().state === 'paused') {
    runSimulationCommand({ kind: 'stop', actor: 'Test' });
  }
  if (simulationStatus().mode !== 'live') {
    runSimulationCommand({ kind: 'mode', mode: 'live', actor: 'Test' });
  }
  if (simulationStatus().eventIntervalSeconds !== INTERVAL_LIMITS.default) {
    runSimulationCommand({
      kind: 'interval',
      seconds: INTERVAL_LIMITS.default,
      actor: 'Test',
    });
  }
}

describe('simulation engine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetEngine();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts from a known state', async () => {
    const status = simulationStatus();
    expect(status.state).toBe('stopped');
    expect(status.mode).toBe('live');
    expect(status.eventIntervalSeconds).toBe(INTERVAL_LIMITS.default);
    expect(status.nextActivityAt).toBeNull();
  });

  it('starts, pauses, resumes and stops', () => {
    const started = runSimulationCommand({ kind: 'start', actor: 'Tester' });
    expect(started.ok).toBe(true);
    expect(simulationStatus().state).toBe('running');
    expect(simulationStatus().nextActivityAt).not.toBeNull();

    const paused = runSimulationCommand({ kind: 'pause', actor: 'Tester' });
    expect(paused.ok).toBe(true);
    expect(simulationStatus().state).toBe('paused');
    // No next activity can be promised while paused.
    expect(simulationStatus().nextActivityAt).toBeNull();

    const resumed = runSimulationCommand({ kind: 'resume', actor: 'Tester' });
    expect(resumed.ok).toBe(true);
    expect(simulationStatus().state).toBe('running');

    const stopped = runSimulationCommand({ kind: 'stop', actor: 'Tester' });
    expect(stopped.ok).toBe(true);
    expect(simulationStatus().state).toBe('stopped');
    expect(simulationStatus().stoppedAt).not.toBeNull();
  });

  it('refuses transitions the state does not allow', () => {
    expect(runSimulationCommand({ kind: 'pause', actor: 'Tester' }).ok).toBe(false);
    expect(runSimulationCommand({ kind: 'resume', actor: 'Tester' }).ok).toBe(false);
    expect(runSimulationCommand({ kind: 'stop', actor: 'Tester' }).ok).toBe(false);
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    expect(runSimulationCommand({ kind: 'start', actor: 'Tester' }).ok).toBe(false);
  });

  it('changes mode and refuses repeats and unknown modes', () => {
    const replay = runSimulationCommand({ kind: 'mode', mode: 'replay', actor: 'Tester' });
    expect(replay.ok).toBe(true);
    expect(simulationStatus().mode).toBe('replay');

    expect(runSimulationCommand({ kind: 'mode', mode: 'replay', actor: 'Tester' }).ok).toBe(
      false,
    );
    expect(
      runSimulationCommand({ kind: 'mode', mode: 'nope' as never, actor: 'Tester' }).ok,
    ).toBe(false);

    runSimulationCommand({ kind: 'mode', mode: 'live', actor: 'Tester' });
    expect(simulationStatus().mode).toBe('live');
  });

  it('configures the cadence within limits', () => {
    const changed = runSimulationCommand({ kind: 'interval', seconds: 30, actor: 'Tester' });
    expect(changed.ok).toBe(true);
    expect(simulationStatus().eventIntervalSeconds).toBe(30);
    expect(simulationStatus().nextActivityAt).toBeNull(); // still stopped

    for (const seconds of [1, 4, 999, Number.NaN]) {
      expect(runSimulationCommand({ kind: 'interval', seconds, actor: 'Tester' }).ok).toBe(
        false,
      );
    }
    expect(simulationStatus().eventIntervalSeconds).toBe(30);
  });

  it('generates heartbeat events while running and none while stopped', () => {
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    const before = simulationStatus().generatedEventCount;
    vi.advanceTimersByTime(INTERVAL_LIMITS.default * 1000 + 50);
    expect(simulationStatus().generatedEventCount).toBe(before + 1);
    expect(simulationStatus().heartbeatAt).not.toBe('');

    runSimulationCommand({ kind: 'stop', actor: 'Tester' });
    const afterStop = simulationStatus().generatedEventCount;
    vi.advanceTimersByTime(INTERVAL_LIMITS.default * 1000 * 3);
    expect(simulationStatus().generatedEventCount).toBe(afterStop);
  });

  it('generates no new heartbeat events in replay mode', () => {
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    runSimulationCommand({ kind: 'mode', mode: 'replay', actor: 'Tester' });
    const before = simulationStatus().generatedEventCount;
    vi.advanceTimersByTime(INTERVAL_LIMITS.default * 1000 * 2 + 50);
    expect(simulationStatus().generatedEventCount).toBe(before);
  });

  it('records every control action in history', () => {
    const before = simulationHistory().length;
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    runSimulationCommand({ kind: 'interval', seconds: 20, actor: 'Tester' });
    runSimulationCommand({ kind: 'mode', mode: 'scenario', actor: 'Tester' });
    runSimulationCommand({ kind: 'pause', actor: 'Tester' });

    const history = simulationHistory();
    expect(history.length).toBe(before + 4);
    expect(history[0].action).toBe('paused');
    expect(history[0].actor).toBe('Tester');
    expect(history[0].fromState).toBe('running');
    expect(history[0].toState).toBe('paused');
    // Newest first.
    expect(history[0].at >= history[1].at).toBe(true);
  });

  it('notifies subscribers when the state changes', () => {
    const seen: string[] = [];
    const unsubscribe = observeSimulationStatus((status) => seen.push(status.state));
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    runSimulationCommand({ kind: 'stop', actor: 'Tester' });
    unsubscribe();
    expect(seen).toContain('running');
    expect(seen).toContain('stopped');
  });

  it('records errors while running', () => {
    const before = simulationErrors().length;
    runSimulationCommand({ kind: 'start', actor: 'Tester' });
    // Errors are recorded on every third heartbeat.
    vi.advanceTimersByTime(INTERVAL_LIMITS.default * 1000 * 3 + 50);
    expect(simulationErrors().length).toBeGreaterThan(before);
  });
});

describe('simulation endpoints over the API client', () => {
  async function signedIn() {
    const client = createClientForTests();
    await client.signIn({
      email: 'amara.okafor@proofbank.test',
      password: 'demonstration1',
      role: 'super_admin',
    });
    return client;
  }

  it('rejects a control command the state does not allow', async () => {
    const client = await signedIn();
    // Drive the engine to a stopped state explicitly.
    let status = await client.simulationStatus();
    if (status.state === 'running') await client.pauseSimulation();
    status = await client.simulationStatus();
    if (status.state === 'paused') await client.stopSimulation();
    await expect(client.resumeSimulation()).rejects.toMatchObject({ status: 409 });
  });

  it('applies a cadence change and reports it', async () => {
    const client = await signedIn();
    const next = await client.setSimulationInterval(45);
    expect(next.eventIntervalSeconds).toBe(45);
    const status = await client.simulationStatus();
    expect(status.eventIntervalSeconds).toBe(45);
    await client.setSimulationInterval(15);
  });

  it('rejects an out-of-range cadence', async () => {
    const client = await signedIn();
    await expect(client.setSimulationInterval(1)).rejects.toMatchObject({ status: 400 });
    await expect(client.setSimulationInterval(999)).rejects.toMatchObject({ status: 400 });
  });

  it('changes the mode and reports it', async () => {
    const client = await signedIn();
    const status = await client.simulationStatus();
    const target = status.mode === 'replay' ? 'live' : 'replay';
    const next = await client.setSimulationMode(target);
    expect(next.mode).toBe(target);
    await client.setSimulationMode('live');
  });

  it('serves control history and errors', async () => {
    const client = await signedIn();
    const history = await client.simulationHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThan(0);
    expect(history[0]).toHaveProperty('action');
    expect(history[0]).toHaveProperty('actor');
    const errors = await client.simulationErrors();
    expect(Array.isArray(errors)).toBe(true);
  });
});

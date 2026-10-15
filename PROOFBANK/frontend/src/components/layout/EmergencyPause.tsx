import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Pause, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../state/auth';
import { useToast } from '../../state/toast';
import { useSimulationStatus } from '../../hooks/useSimulationStatus';
import { api } from '../../api';
import { ApiError } from '../../api/errors';

/**
 * Emergency pause — an obvious, non-disruptive panic action available from
 * anywhere in the simulation flows. Pausing suspends generated activity while
 * preserving all state, so it is a single deliberate click, not a
 * confirmation-gated stop.
 */
export function EmergencyPause() {
  const { can } = useAuth();
  const { show } = useToast();
  const queryClient = useQueryClient();
  const { data: status } = useSimulationStatus();
  const [pausing, setPausing] = useState(false);

  const permitted = can('control_simulation');
  const running = status?.state === 'running';

  let title: string;
  if (!permitted) {
    title = 'Your role cannot control the simulation.';
  } else if (running) {
    title =
      'Pause generated activity immediately. State is preserved — resume any time from Simulation Control.';
  } else if (status?.state === 'paused') {
    title = 'The simulation is already paused.';
  } else {
    title = 'The simulation is stopped. Start it from Simulation Control.';
  }

  async function pause() {
    setPausing(true);
    try {
      await api.pauseSimulation();
      await queryClient.invalidateQueries({ queryKey: ['simulation'] });
      show({
        tone: 'success',
        title: 'Simulation paused',
        description:
          'Generated activity is suspended and state is preserved. Resume from Simulation Control.',
      });
    } catch (error) {
      show({
        tone: 'danger',
        title: 'Emergency pause failed',
        description:
          error instanceof ApiError
            ? `${error.message} ${error.userGuidance}`
            : 'The simulation did not accept the pause command.',
      });
    } finally {
      setPausing(false);
    }
  }

  return (
    <Button
      variant="danger"
      size="sm"
      onClick={() => void pause()}
      disabled={!permitted || !running || pausing}
      loading={pausing}
      title={title}
      icon={
        running ? (
          <Pause aria-hidden className="size-4" />
        ) : (
          <ShieldAlert aria-hidden className="size-4" />
        )
      }
      aria-label="Emergency pause"
      className="shrink-0"
    >
      <span className="hidden sm:inline">Emergency pause</span>
    </Button>
  );
}

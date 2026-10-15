import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/utils';
import { Button } from '../components/ui/Button';
import { Badge, Chip } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { Field, Input, Switch } from '../components/ui/Field';
import { SegmentedControl, Tabs } from '../components/ui/Tabs';
import { CopyButton } from '../components/ui/CopyButton';
import { DropdownMenu, MenuItem } from '../components/ui/DropdownMenu';
import { useToast } from '../state/toast';

describe('Button', () => {
  it('disables while loading and announces busy', () => {
    render(<Button loading>Verify</Button>);
    const button = screen.getByRole('button', { name: /verify/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('fires click handlers', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Run</Button>);
    await user.click(screen.getByRole('button', { name: 'Run' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Badge', () => {
  it('renders status text alongside the tone', () => {
    render(<Badge tone="success">Verified</Badge>);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders neutral metadata chips', () => {
    render(<Chip>NGN</Chip>);
    expect(screen.getByText('NGN')).toBeInTheDocument();
  });
});

describe('Dialog', () => {
  it('opens with the right role and closes on Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open
          </button>
          <Dialog open={open} onClose={onClose} title="Revoke share link">
            <p>Consequence text</p>
          </Dialog>
        </>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(screen.getByRole('dialog', { name: 'Revoke share link' })).toBeInTheDocument();
    expect(screen.getByText('Consequence text')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Dialog open onClose={onClose} title="Test dialog">
        <p>Body</p>
      </Dialog>,
    );
    const backdrop = document.querySelector('.bg-plum\\/40');
    expect(backdrop).not.toBeNull();
    await user.click(backdrop as Element);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when closed', () => {
    render(
      <Dialog open={false} onClose={() => {}} title="Hidden">
        <p>Body</p>
      </Dialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Field', () => {
  it('associates label, input and error message', () => {
    render(
      <Field label="Transaction reference" htmlFor="ref" error="Required" required>
        <Input id="ref" invalid />
      </Field>,
    );
    const input = screen.getByLabelText(/transaction reference/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('renders a switch with accessible state', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Notify on mismatch" />);
    const control = screen.getByRole('switch', { name: 'Notify on mismatch' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    await user.click(control);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('Tabs & SegmentedControl', () => {
  it('exposes tab semantics and switches on click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        label="Preview modes"
        value="overview"
        onChange={onChange}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'verification', label: 'Verification' },
        ]}
      />,
    );
    await user.click(screen.getByRole('tab', { name: 'Verification' }));
    expect(onChange).toHaveBeenCalledWith('verification');
  });

  it('supports arrow-key navigation across tabs', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Tabs
        label="Modes"
        value="overview"
        onChange={onChange}
        tabs={[
          { value: 'overview', label: 'Overview' },
          { value: 'verification', label: 'Verification' },
        ]}
      />,
    );
    screen.getByRole('tab', { name: 'Overview' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenCalledWith('verification');
  });

  it('renders a radiogroup for segmented controls', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Time range"
        value="7d"
        onChange={onChange}
        options={[
          { value: '24h', label: '24h' },
          { value: '7d', label: '7d' },
        ]}
      />,
    );
    expect(screen.getByRole('radiogroup', { name: 'Time range' })).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '24h' }));
    expect(onChange).toHaveBeenCalledWith('24h');
  });
});

describe('CopyButton', () => {
  it('copies the value and confirms', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    render(<CopyButton value="PRF-2026-1043" />);
    await user.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByRole('button')).toHaveAccessibleName(/copied/i));
    expect(writeText).toHaveBeenCalledWith('PRF-2026-1043');
  });
});

describe('DropdownMenu', () => {
  it('opens with correct roles and closes after selecting', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        label="Row actions"
        trigger={(props) => (
          <button type="button" {...props}>
            Actions
          </button>
        )}
      >
        {(close) => (
          <MenuItem
            onClick={() => {
              onSelect();
              close();
            }}
          >
            Copy ID
          </MenuItem>
        )}
      </DropdownMenu>,
    );

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: 'Copy ID' }));
    expect(onSelect).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('toasts', () => {
  it('pushes and dismisses toasts', async () => {
    const user = userEvent.setup();
    function Harness() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => toast.push({ tone: 'success', title: 'Share link created' })}
        >
          Push
        </button>
      );
    }
    renderWithProviders(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Push' }));
    expect(await screen.findByText('Share link created')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /dismiss: share link created/i }));
    await waitFor(() => expect(screen.queryByText('Share link created')).not.toBeInTheDocument());
  });
});

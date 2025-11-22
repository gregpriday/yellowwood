import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { ProfileSelector } from '../../src/components/ProfileSelector.js';
import { ThemeProvider } from '../../src/theme/ThemeProvider.js';

const profiles = {
  default: { args: ['-r'], description: 'Standard recursive scan' },
  minimal: { args: ['--tree-only'], description: 'Structure only' },
  debug: { args: ['--verbose'], description: 'Verbose logging' },
};

const tick = () => new Promise(resolve => setTimeout(resolve, 0));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeProvider mode="dark">
      {component}
    </ThemeProvider>
  );

describe('ProfileSelector', () => {
  it('renders profile names and descriptions', () => {
    const { lastFrame } = renderWithTheme(
      <ProfileSelector
        profiles={profiles}
        currentProfile="default"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const frame = lastFrame();
    expect(frame).toContain('default');
    expect(frame).toContain('(Standard recursive scan)');
    expect(frame).toContain('debug');
  });

  it('highlights the current profile', () => {
    const { lastFrame } = renderWithTheme(
      <ProfileSelector
        profiles={profiles}
        currentProfile="debug"
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );

    expect(lastFrame()).toContain('→ debug');
  });

  it('selects the highlighted profile on enter', async () => {
    const onSelect = vi.fn();
    const { stdin } = renderWithTheme(
      <ProfileSelector
        profiles={profiles}
        currentProfile="minimal"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await tick();
    stdin.write('\r');
    await tick();

    expect(onSelect).toHaveBeenCalledWith('minimal');
  });

  it('moves selection with arrow keys', async () => {
    const onSelect = vi.fn();
    const { stdin, lastFrame } = renderWithTheme(
      <ProfileSelector
        profiles={profiles}
        currentProfile="default"
        onSelect={onSelect}
        onClose={vi.fn()}
      />
    );

    await tick();
    await tick();
    stdin.write('\x1B[B');
    await tick();
    await tick();
    expect(lastFrame()).toContain('→ minimal');
    stdin.write('\r');
    await tick();

    expect(onSelect).toHaveBeenCalledWith('minimal');
  });

  it('closes when escape is pressed', async () => {
    const onClose = vi.fn();
    const { stdin } = renderWithTheme(
      <ProfileSelector
        profiles={profiles}
        currentProfile="default"
        onSelect={vi.fn()}
        onClose={onClose}
      />
    );

    await tick();
    stdin.write('\x1B');
    await tick();

    expect(onClose).toHaveBeenCalled();
  });
});

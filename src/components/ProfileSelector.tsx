import React, { useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import SelectInput from 'ink-select-input';
import { useTheme } from '../theme/ThemeProvider.js';
import type { CopytreeProfile } from '../types/index.js';

interface ProfileSelectorProps {
  profiles: Record<string, CopytreeProfile>;
  currentProfile: string;
  onSelect: (profileName: string) => void;
  onClose: () => void;
}

interface SelectorItem {
  label: string;
  value: string;
  description?: string;
}

export const ProfileSelector: React.FC<ProfileSelectorProps> = ({
  profiles,
  currentProfile,
  onSelect,
  onClose,
}) => {
  const { palette } = useTheme();

  const selectorItems = useMemo<SelectorItem[]>(() => {
    return Object.entries(profiles || {}).map(([name, profile]) => ({
      label: name,
      value: name,
      description: profile.description || '',
    }));
  }, [profiles]);

  const initialIndex = useMemo(() => {
    const idx = selectorItems.findIndex(item => item.value === currentProfile);
    return idx >= 0 ? idx : 0;
  }, [currentProfile, selectorItems]);

  useInput((input, key) => {
    if (key.escape) {
      onClose();
    }
  });

  const renderItem = ({ label, isSelected }: { label: string; isSelected?: boolean }) => {
    const descriptor = selectorItems.find(item => item.label === label);
    return (
      <Box>
        <Text color={isSelected ? palette.selection.text : palette.text.primary}>
          {isSelected ? '→ ' : '  '}
          {label.padEnd(16)}
        </Text>
        {descriptor?.description ? (
          <Text color={palette.text.tertiary}>
            ({descriptor.description})
          </Text>
        ) : null}
      </Box>
    );
  };

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={palette.accent.primary} paddingX={1} width={60}>
      <Box marginBottom={1}>
        <Text bold color={palette.text.primary}>Select CopyTree Profile</Text>
      </Box>

      {selectorItems.length > 0 ? (
        <SelectInput
          items={selectorItems}
          initialIndex={initialIndex}
          onSelect={(item) => onSelect(item.value)}
          itemComponent={renderItem as any}
        />
      ) : (
        <Text color={palette.text.secondary}>No profiles configured.</Text>
      )}

      <Box marginTop={1} borderStyle="single" borderColor={palette.chrome.separator} paddingX={1}>
        <Text dimColor>↑↓ Navigate | Enter Apply | ESC Cancel</Text>
      </Box>
    </Box>
  );
};

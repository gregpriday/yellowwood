import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InlineInputProps {
  input: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export const InlineInput: React.FC<InlineInputProps> = ({
  input,
  onChange,
  onSubmit,
  onCancel,
}) => {
  const [suggestion, setSuggestion] = useState('');

  // Simple autocomplete logic (placeholder)
  // In a real implementation, this would filter against a list of commands
  useEffect(() => {
    const commands = ['filter', 'git', 'copy'];
    if (input.startsWith('/')) {
      const cmd = input.slice(1);
      const match = commands.find(c => c.startsWith(cmd));
      if (match) {
        setSuggestion(`/${match}`);
      } else {
        setSuggestion('');
      }
    } else {
      setSuggestion('');
    }
  }, [input]);

  useInput((_in, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.tab && suggestion && suggestion !== input) {
      onChange(suggestion + ' ');
    }
  });

  return (
    <Box>
      <Text color="cyan">
        {'> '}
      </Text>
      <TextInput
        value={input}
        onChange={onChange}
        onSubmit={onSubmit}
        showCursor={true}
      />
      {suggestion && suggestion.length > input.length && (
        <Text dimColor>
          {suggestion.slice(input.length)}
        </Text>
      )}
    </Box>
  );
};

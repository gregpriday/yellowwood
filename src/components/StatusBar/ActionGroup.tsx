import React from 'react';
import { Box, Text } from 'ink';

export const ActionGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <Box marginLeft={1}>
      {children}
    </Box>
  );
};

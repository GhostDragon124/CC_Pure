import * as React from 'react';
import { Box, Text } from '@anthropic/ink';
import type { PermissionRequestProps } from '../PermissionRequest.js';

export function MonitorPermissionRequest(_props: PermissionRequestProps): React.ReactElement {
  return (
    <Box>
      <Text>Monitor permission request</Text>
    </Box>
  );
}

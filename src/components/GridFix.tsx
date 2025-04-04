import React from 'react';
import { Grid as MuiGrid, GridProps, GridSize } from '@mui/material';

// MUI Grid의 래퍼 컴포넌트로 TypeScript 오류를 해결
interface CustomGridProps extends Omit<GridProps, 'item' | 'container'> {
  item?: boolean;
  container?: boolean;
  xs?: GridSize;
  sm?: GridSize;
  md?: GridSize;
  lg?: GridSize;
  xl?: GridSize;
}

export const Grid: React.FC<CustomGridProps> = (props) => {
  return <MuiGrid {...props} />;
};

export default Grid; 
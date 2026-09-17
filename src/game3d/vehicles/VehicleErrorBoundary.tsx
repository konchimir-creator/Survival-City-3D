'use client';
import React from 'react';

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

// Same pattern as PlayerErrorBoundary: if the GLB is missing/corrupted,
// fall back to the procedural body instead of breaking the whole Canvas.
export class VehicleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.warn('[VehicleErrorBoundary] GLB failed, fallback to procedural', error, info);
    (window as any).__vehicleRenderer = 'PROCEDURAL';
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

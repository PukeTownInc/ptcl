import { Component, type ReactNode } from 'react';
import { Logo } from './Logo';

interface Props {
  children: ReactNode;
}
interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(err: unknown): State {
    return { hasError: true, message: err instanceof Error ? err.message : 'Something went wrong' };
  }

  componentDidCatch(err: unknown) {
    console.error('App crashed:', err);
  }

  handleReload = () => {
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-ink-900 gap-6 px-6 text-center">
          <Logo large />
          <div>
            <h1 className="font-display font-black text-2xl text-radioactive-400 neon-text-yellow tracking-[0.3em]">
              CASH LAB
            </h1>
            <p className="text-[11px] text-toxic-100/50 font-mono mt-3 max-w-xs">
              Something went wrong and the app crashed. Your progress is safe — just reload to get back in.
            </p>
          </div>
          <button
            onClick={this.handleReload}
            className="toxic-btn px-8 py-3.5 flex items-center justify-center gap-2 text-sm"
          >
            Tap to Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  state: any;
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      let errorMessage = "Something went wrong.";
      
      try {
        // Try to parse if it's a Firestore JSON error
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error && parsed.operationType) {
          errorMessage = `Firestore Error (${parsed.operationType}): ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
          <div className="max-w-md w-full bg-white rounded-[2.5rem] p-10 shadow-xl border border-zinc-100 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-4">Application Error</h2>
            <p className="text-zinc-500 mb-8 leading-relaxed">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full h-14 bg-black text-white rounded-full font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

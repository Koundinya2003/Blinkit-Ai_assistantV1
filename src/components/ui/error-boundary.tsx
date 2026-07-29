"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-full bg-red-50 p-4">
            <RefreshCw className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-4 text-xl font-black">Something went wrong</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            We encountered an unexpected error. Please try again or contact support if the problem persists.
          </p>
          {this.state.error && (
            <details className="mt-4 w-full max-w-md text-left">
              <summary className="cursor-pointer text-sm font-semibold text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">
                {this.state.error.message}
              </pre>
            </details>
          )}
          <Button onClick={this.handleReset} className="mt-6">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
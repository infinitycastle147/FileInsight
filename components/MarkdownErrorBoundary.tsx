
import React, { ErrorInfo, ReactNode, Component } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallbackText?: string;
}

interface State {
  hasError: boolean;
}

/**
 * Standard React Error Boundary for catching rendering errors in Markdown content.
 */
export class MarkdownErrorBoundary extends Component<Props, State> {
  // Use constructor to ensure proper initialization and member visibility in some environments
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Markdown Rendering Error:", error, errorInfo);
  }

  public render(): ReactNode {
    // Destructuring members from this context helps resolve issues where members aren't directly seen on the class instance
    const { hasError } = this.state;
    const { children, fallbackText } = this.props;

    if (hasError) {
      return (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-red-800 text-xs italic">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>
            {fallbackText || "There was an error rendering the formatted response. Showing raw text instead."}
          </span>
        </div>
      );
    }

    return children;
  }
}

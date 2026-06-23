import '@testing-library/jest-dom';
import { vi } from 'vitest';

// 1. Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// 2. Mock next/navigation
vi.mock('next/navigation', () => {
  const router = {
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  };
  return {
    useRouter: () => router,
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
  };
});

// 3. Mock Clerk client hooks
vi.mock('@clerk/nextjs', () => {
  return {
    useAuth: () => ({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user_123',
    }),
    useClerk: () => ({
      signOut: vi.fn(),
      openSignIn: vi.fn(),
    }),
    useUser: () => ({
      isLoaded: true,
      isSignedIn: true,
      user: {
        id: 'user_123',
        fullName: 'Test User',
        imageUrl: '/test-pfp.png',
        primaryEmailAddress: {
          emailAddress: 'test@example.com',
        },
      },
    }),
    ClerkProvider: ({ children }: any) => children,
    SignedIn: ({ children }: any) => children,
    SignedOut: ({ children }: any) => null,
    SignOutButton: ({ children }: any) => children,
  };
});

// 4. Mock Clerk server-side functions
vi.mock('@clerk/nextjs/server', () => {
  return {
    currentUser: async () => ({
      id: 'user_123',
      fullName: 'Test User',
      imageUrl: '/test-pfp.png',
      primaryEmailAddress: {
        emailAddress: 'test@example.com',
      },
    }),
    auth: () => ({
      userId: 'user_123',
    }),
  };
});

// 5. Mock Radix UI
vi.mock('radix-ui', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Tabs: {
      Root: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'tabs-root', ...props }, children),
      List: ({ children, ...props }: any) => React.createElement('div', { 'data-testid': 'tabs-list', ...props }, children),
      Trigger: ({ children, value, onClick, ...props }: any) => React.createElement('button', {
        'data-testid': `tabs-trigger-${value}`,
        onClick: (e: any) => {
          if (onClick) onClick(e);
          if (props.onValueChange) props.onValueChange(value);
        },
        ...props
      }, children),
      Content: ({ children, value, ...props }: any) => React.createElement('div', { 'data-testid': `tabs-content-${value}`, ...props }, children),
    },
    Popover: {
      Root: ({ children }: any) => children,
      Trigger: ({ children, ...props }: any) => React.createElement('button', props, children),
      Portal: ({ children }: any) => children,
      Content: ({ children, ...props }: any) => React.createElement('div', props, children),
      Arrow: () => null,
    },
    Separator: {
      Root: () => React.createElement('hr'),
    },
    Switch: {
      Root: ({ children, onCheckedChange, ...props }: any) => React.createElement('button', {
        onClick: () => onCheckedChange?.(true),
        ...props
      }, children),
      Thumb: () => React.createElement('span'),
    },
    Dialog: {
      Root: ({ children }: any) => children,
      Trigger: ({ children, ...props }: any) => React.createElement('button', props, children),
      Portal: ({ children }: any) => children,
      Overlay: () => React.createElement('div'),
      Content: ({ children, ...props }: any) => React.createElement('div', props, children),
      Title: ({ children }: any) => React.createElement('h2', {}, children),
      Description: ({ children }: any) => React.createElement('p', {}, children),
      Close: ({ children, ...props }: any) => React.createElement('button', props, children),
    },
    Toast: {
      Provider: ({ children }: any) => children,
      Root: ({ children, open, onOpenChange, ...props }: any) => open ? React.createElement('div', { 'data-testid': 'toast-root', ...props }, children) : null,
      Title: ({ children, ...props }: any) => React.createElement('div', props, children),
      Description: ({ children, ...props }: any) => React.createElement('div', props, children),
      Action: ({ children, asChild, ...props }: any) => children,
      Close: ({ children, ...props }: any) => React.createElement('button', props, children),
      Viewport: () => React.createElement('div', { 'data-testid': 'toast-viewport' }),
    },
    Label: {
      Root: ({ children, ...props }: any) => React.createElement('label', props, children),
    },
    ToggleGroup: {
      Root: ({ children, ...props }: any) => React.createElement('div', props, children),
      Item: ({ children, ...props }: any) => React.createElement('button', props, children),
    }
  };
});

// 6. Mock recharts
vi.mock('recharts', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: any) => React.createElement('div', { 'data-testid': 'recharts-responsive-container' }, children),
    LineChart: ({ children }: any) => React.createElement('div', {}, children),
    Line: () => null,
    BarChart: ({ children }: any) => React.createElement('div', {}, children),
    Bar: () => null,
    PieChart: ({ children }: any) => React.createElement('div', {}, children),
    Pie: ({ children }: any) => children || null,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    Legend: () => null,
  };
});

// 7. Mock pg / database module
const mockDb = {
  query: vi.fn().mockImplementation(async () => {
    return { rows: [] };
  }),
  connect: vi.fn().mockImplementation(async () => {
    return {
      query: vi.fn().mockImplementation(async () => {
        return { rows: [] };
      }),
      release: vi.fn(),
    };
  }),
  on: vi.fn(),
};

vi.mock('@/app/services/database', () => ({
  default: mockDb,
}));

// Mock Audio
global.Audio = class {
  volume = 1;
  play() {
    return Promise.resolve();
  }
} as any;

// Mock window.alert
global.alert = vi.fn();

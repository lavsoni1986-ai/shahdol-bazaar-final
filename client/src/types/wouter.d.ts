// Type declarations for wouter v3
// Since @types/wouter doesn't exist, we declare the module ourselves

declare module 'wouter' {
  import { ComponentType, ReactNode, MouseEventHandler } from 'react';

  // Link component
  export interface LinkProps {
    href: string;
    className?: string;
    children?: ReactNode;
    onClick?: MouseEventHandler<HTMLAnchorElement>;
    target?: string;
    rel?: string;
    replace?: boolean;
    prefetch?: boolean;
    style?: React.CSSProperties;
    id?: string;
    title?: string;
    'aria-label'?: string;
  }

  export const Link: ComponentType<LinkProps>;

  // useLocation hook
  export interface UseLocationReturn {
    (): [string, (path: string, options?: { replace?: boolean }) => void];
  }

  export const useLocation: UseLocationReturn;

  // useRoute hook - returns whether the current location matches a pattern
  export interface UseRouteReturn {
    (pattern: string | RegExp): [boolean, params: Record<string, string>];
  }

  export const useRoute: UseRouteReturn;

  // Route component
  export interface RouteProps {
    path: string | RegExp;
    component?: ComponentType<any>;
    children?: ReactNode;
  }

  export const Route: ComponentType<RouteProps>;

  // Switch component
  export interface SwitchProps {
    children: ReactNode;
    location?: string;
  }

  export const Switch: ComponentType<SwitchProps>;

  // Redirect component
  export interface RedirectProps {
    to: string;
    replace?: boolean;
  }

  export const Redirect: ComponentType<RedirectProps>;

  // useParams hook
  export interface UseParamsReturn {
    <T extends Record<string, string> = Record<string, string>>(): T;
  }

  export const useParams: UseParamsReturn;

  // useRouter hook
  export interface RouterContextValue {
    base: string;
    readonly prefetch?: (path: string) => void;
    navigate: (path: string, options?: { replace?: boolean }) => void;
  }

  export const useRouter: () => RouterContextValue;

  // Router component (if used)
  export interface RouterProps {
    base?: string;
    children?: ReactNode;
    notFound?: ComponentType<any>;
  }

  export const Router: ComponentType<RouterProps>;

  // MatcherResult type
  export type MatcherResult = [boolean, Record<string, string>];

  // Default exports for convenience
  export default {
    Link,
    useLocation,
    useRoute,
    Route,
    Switch,
    Redirect,
    useParams,
    useRouter,
    Router,
  };
}

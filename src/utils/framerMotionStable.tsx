import React, { Fragment, forwardRef } from 'react';

const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'variants', 'transition', 'custom',
  'whileHover', 'whileTap', 'whileFocus', 'whileDrag', 'whileInView',
  'viewport', 'layout', 'layoutId', 'layoutDependency', 'layoutScroll',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum', 'dragDirectionLock',
  'onDrag', 'onDragStart', 'onDragEnd', 'onDragTransitionEnd',
  'onViewportEnter', 'onViewportLeave', 'transformTemplate',
]);
function cleanProps(props: Record<string, any>) { const next: Record<string, any> = {}; for (const [key, value] of Object.entries(props)) if (!MOTION_PROPS.has(key)) next[key] = value; return next; }
const cache = new Map<string, React.ComponentType<any>>();
const createMotionComponent = (tag: string) => { const cached = cache.get(tag); if (cached) return cached; const Component = forwardRef<any, any>((props, ref) => React.createElement(tag, { ...cleanProps(props), ref })); Component.displayName = `StableMotion(${tag})`; cache.set(tag, Component); return Component; };
export const motion = new Proxy({} as Record<string, React.ComponentType<any>>, { get: (_target, property: string) => createMotionComponent(property) });
export const AnimatePresence = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;
export const MotionConfig = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;
export const LayoutGroup = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;
export const LazyMotion = ({ children }: { children?: React.ReactNode }) => <Fragment>{children}</Fragment>;
export const domAnimation = {};
export const domMax = {};
export const useReducedMotion = () => true;
export const useAnimation = () => ({ start: async () => undefined, stop: () => undefined, set: () => undefined });
export function useMotionValue<T>(initial: T) { return { get: () => initial, set: () => undefined, on: () => () => undefined } as any; }

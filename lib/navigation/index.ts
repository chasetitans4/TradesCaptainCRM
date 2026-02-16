/**
 * Navigation Module
 *
 * Contextual navigation system for the Trades Captain app.
 * Provides stack-based navigation with dynamic back labels
 * and scroll position preservation.
 */

export {
  NavigationProvider,
  useNavigationContext,
  type NavigationEntry,
} from './navigation-context';

export {
  useNavigation,
  useContextualBack,
  type NavigateOptions,
} from './use-navigation';

import AppTabs from '@/components/app-tabs';

/**
 * The tab group's layout. `AppTabs` is the NativeTabs navigator (Home / Explore);
 * both screens live in this `(tabs)` group so the parent root Stack can push the
 * job-detail screen *over* the whole tab bar — a pushed stack screen covers this
 * group, so the tabs disappear on the detail view without any manual hiding.
 */
export default function TabsLayout() {
  return <AppTabs />;
}

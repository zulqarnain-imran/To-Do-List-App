/** Single source of truth for navigation, so shell and highlights cannot drift. */

export interface NavItem {
  href: string;
  label: string;
  icon: string;
  /** Shown in the mobile bottom bar. */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Today", icon: "home", primary: true },
  { href: "/tasks", label: "Tasks", icon: "circle-check", primary: true },
  { href: "/calendar", label: "Calendar", icon: "calendar", primary: true },
  { href: "/categories", label: "Categories", icon: "tag" },
  { href: "/progress", label: "Progress", icon: "chart", primary: true },
  { href: "/settings", label: "Settings", icon: "sliders", primary: true },
  { href: "/profile", label: "Profile", icon: "user" },
];

/** The five items that fit in a phone's bottom bar. */
export const MOBILE_NAV = NAV_ITEMS.filter((item) => item.primary);

/** Matches /tasks and /calendar but not /, and is exact for /categories. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

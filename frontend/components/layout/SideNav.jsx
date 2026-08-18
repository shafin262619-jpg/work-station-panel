import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'Projects' },
  { href: '/accounts', label: 'AI Accounts' },
  { href: '/settings', label: 'Settings' },
];

export default function SideNav() {
  return (
    <nav className="sidenav" aria-label="Main navigation">
      <div className="sidenav__brand">Work Station Panel</div>
      <ul className="sidenav__list">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link className="sidenav__link" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

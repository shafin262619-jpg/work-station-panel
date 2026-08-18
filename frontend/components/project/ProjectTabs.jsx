import Link from 'next/link';

const TABS = [
  { id: 'overview', label: 'Overview', href: '' },
  { id: 'plan', label: 'Plan', href: 'plan' },
  { id: 'coding', label: 'Coding', href: 'coding' },
  { id: 'support', label: 'Support Claude', href: 'support' },
  { id: 'checker', label: 'Checker Claude', href: 'checker' },
];

export default function ProjectTabs({ projectId, activeTab }) {
  return (
    <nav className="tabs" aria-label="Project tabs">
      <ul className="tabs__list">
        {TABS.map((tab) => {
          const href = tab.href
            ? `/project/${projectId}/${tab.href}`
            : `/project/${projectId}`;
          const isActive = tab.id === activeTab;
          return (
            <li key={tab.id}>
              <Link
                className={`tabs__tab${isActive ? ' tabs__tab--active' : ''}`}
                href={href}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

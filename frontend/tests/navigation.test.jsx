import { render, screen } from '@testing-library/react';
import SideNav from '../components/layout/SideNav';

describe('Main navigation rail', () => {
  it('renders links to all top-level routes', () => {
    render(<SideNav />);
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'AI Accounts' })).toHaveAttribute('href', '/accounts');
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  });
});

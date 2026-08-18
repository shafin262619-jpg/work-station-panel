import { render, screen } from '@testing-library/react';
import AccountsPage from '../app/accounts/page';

describe('Route /accounts — AI Accounts', () => {
  it('renders the AI Accounts page heading', () => {
    render(<AccountsPage />);
    expect(screen.getByRole('heading', { name: 'AI Accounts' })).toBeInTheDocument();
  });

  it('shows an empty-state placeholder', () => {
    render(<AccountsPage />);
    expect(screen.getByText(/No accounts configured yet/i)).toBeInTheDocument();
  });
});

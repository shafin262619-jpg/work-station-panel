import { render, screen } from '@testing-library/react';
import SettingsPage from '../app/settings/page';

describe('Route /settings — Settings', () => {
  it('renders the Settings page heading', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument();
  });

  it('shows a placeholder', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Settings UI lands in a later chunk/i)).toBeInTheDocument();
  });
});

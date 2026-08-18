import { render, screen } from '@testing-library/react';
import HomePage from '../app/page';

describe('Route / — Projects home', () => {
  it('renders the Projects page heading', () => {
    render(<HomePage />);
    expect(screen.getByRole('heading', { name: 'Projects' })).toBeInTheDocument();
  });

  it('shows an empty-state placeholder', () => {
    render(<HomePage />);
    expect(screen.getByText(/No projects yet/i)).toBeInTheDocument();
  });
});

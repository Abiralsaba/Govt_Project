import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

describe('React route protection', () => {
  it('redirects an unauthenticated dashboard request to the citizen login', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard.html?from=bookmark']}>
        <AuthProvider><App /></AuthProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('button', { name: /Login to Portal/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'গণপ্রজাতন্ত্রী বাংলাদেশ' })).toBeInTheDocument();
  });
});

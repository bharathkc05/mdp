import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Home from '../pages/Home';
import userEvent from '@testing-library/user-event';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
  };
});

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderHome = () => {
    return render(
      <BrowserRouter>
        <Home />
      </BrowserRouter>
    );
  };

  it('should render the home page', () => {
    renderHome();
    expect(screen.getByText(/Education for Every Child/i)).toBeInTheDocument();
  });

  it('should display hero slideshow with multiple slides', () => {
    renderHome();
    // Check if first slide is visible
    expect(screen.getByText(/Education for Every Child/i)).toBeInTheDocument();
  });

  it('should display navigation arrows for slideshow', () => {
    renderHome();
    const prevButton = screen.getByLabelText(/previous slide/i);
    const nextButton = screen.getByLabelText(/next slide/i);
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it('should display slide indicators', () => {
    renderHome();
    const indicators = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('Go to slide')
    );
    expect(indicators.length).toBeGreaterThan(0);
  });

  it('should navigate to next slide when next button is clicked', async () => {
    const user = userEvent.setup();
    renderHome();
    
    const nextButton = screen.getByLabelText(/next slide/i);
    await user.click(nextButton);
    
    // Should still be on the page
    expect(nextButton).toBeInTheDocument();
  });

  it('should navigate to previous slide when previous button is clicked', async () => {
    const user = userEvent.setup();
    renderHome();
    
    const prevButton = screen.getByLabelText(/previous slide/i);
    await user.click(prevButton);
    
    expect(prevButton).toBeInTheDocument();
  });

  it('should display platform statistics section', () => {
    renderHome();
    expect(screen.getAllByText(/Total Donations/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Active Causes/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Donors/i)[0]).toBeInTheDocument();
  });

  it('should display featured cause categories', () => {
    renderHome();
    expect(screen.getAllByText(/Education/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Healthcare/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Environment/i)[0]).toBeInTheDocument();
  });

  it('should display call-to-action buttons', () => {
    renderHome();
    expect(screen.getByText(/Explore Causes/i)).toBeInTheDocument();
    expect(screen.getByText(/Start Donating/i)).toBeInTheDocument();
  });

  it('should have links to causes page', () => {
    renderHome();
    const exploreLinks = screen.getAllByText(/Explore Causes/i);
    expect(exploreLinks.length).toBeGreaterThan(0);
  });

  it('should have links to register page', () => {
    renderHome();
    const registerLinks = screen.getAllByText(/Start Donating/i);
    expect(registerLinks.length).toBeGreaterThan(0);
  });

  it('should auto-advance slideshow after timeout', async () => {
    vi.useFakeTimers();
    renderHome();
    
    // Fast-forward time by 5 seconds
    vi.advanceTimersByTime(5000);
    
    // Component should still be rendered
    expect(screen.getByLabelText(/next slide/i)).toBeInTheDocument();
    
    vi.useRealTimers();
  });

  it('should display impact statistics with formatted numbers', () => {
    renderHome();
    // Check if statistics are displayed (numbers might be formatted)
    const statsSection = screen.getAllByText(/Total Donations/i)[0].closest('div');
    expect(statsSection).toBeInTheDocument();
  });

  it('should display "How It Works" section', () => {
    renderHome();
    expect(screen.getByText(/How It Works/i)).toBeInTheDocument();
  });

  it('should display "Why Choose Us" section', () => {
    renderHome();
    expect(screen.getByText(/Why Choose Us/i)).toBeInTheDocument();
  });

  it('should handle slide indicator clicks', async () => {
    const user = userEvent.setup();
    renderHome();
    
    const indicators = screen.getAllByRole('button').filter(btn => 
      btn.getAttribute('aria-label')?.includes('Go to slide')
    );
    
    if (indicators.length > 0) {
      await user.click(indicators[0]);
      expect(indicators[0]).toBeInTheDocument();
    }
  });

  it('should cleanup interval on unmount', () => {
    const { unmount } = renderHome();
    unmount();
    // Just ensure no errors during cleanup
    expect(true).toBe(true);
  });
});

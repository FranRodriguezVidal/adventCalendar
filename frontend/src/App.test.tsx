import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App from './App'

describe('App routes', () => {
  it('renders the landing page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Diseña calendarios de Adviento/i)).toBeInTheDocument()
  })

  it('renders the admin page', () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Panel de administración/i)).toBeInTheDocument()
  })
})

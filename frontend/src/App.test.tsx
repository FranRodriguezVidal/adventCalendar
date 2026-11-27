import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import App, { resolveCalendarAccessState } from './App'

describe('App routes', () => {
  it('renders the landing page', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByText(/Diseña calendarios de Adviento/i)).toBeInTheDocument()
  })

  it('renders the admin page', async () => {
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Panel de administración/i)).toBeInTheDocument()
    })
  })

  it('treats explicit public mode as public and otherwise keeps a saved protected password visible', () => {
    expect(resolveCalendarAccessState('ADV-ABC12345')).toEqual({
      password: 'ADV-ABC12345',
      isPublicWithoutCode: false,
    })

    expect(resolveCalendarAccessState('   ')).toEqual({
      password: '',
      isPublicWithoutCode: false,
    })

    expect(resolveCalendarAccessState('ADV-XYZ98765', true)).toEqual({
      password: 'ADV-XYZ98765',
      isPublicWithoutCode: true,
    })
  })
})

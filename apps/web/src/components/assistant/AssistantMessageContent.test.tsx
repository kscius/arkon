import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { AssistantMessageContent } from './AssistantMessageContent';

function renderAssistant(content: string, variant: 'assistant' | 'user' | 'error' = 'assistant') {
  return render(
    <MemoryRouter>
      <AssistantMessageContent content={content} variant={variant} />
    </MemoryRouter>,
  );
}

function renderWithRouter(content: string) {
  return render(
    <MemoryRouter initialEntries={['/asistente']}>
      <Routes>
        <Route
          path="/asistente"
          element={<AssistantMessageContent content={content} variant="assistant" />}
        />
        <Route path="/obras/:id" element={<div>Obra detail</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('AssistantMessageContent', () => {
  it('renders markdown headings and emphasis for assistant messages', () => {
    renderAssistant('### Análisis\n\nTexto con **riesgo alto** y una lista:\n\n- Item uno\n- Item dos');

    expect(screen.getByRole('heading', { level: 4, name: 'Análisis' })).toBeInTheDocument();
    expect(screen.getByText('riesgo alto').tagName).toBe('STRONG');
    expect(screen.getByText('Item uno')).toBeInTheDocument();
    expect(screen.getByText('Item dos')).toBeInTheDocument();
  });

  it('renders plain error text without markdown styling side effects', () => {
    renderAssistant('No se pudo conectar con la API.', 'error');
    expect(screen.getByText('No se pudo conectar con la API.')).toHaveClass('text-red-700');
  });

  it('navigates in-app for internal hash links', () => {
    renderWithRouter('Ver [Pavimentación](/#/obras/abc-123) para detalle.');

    const link = screen.getByRole('button', { name: 'Pavimentación' });
    expect(link).toBeInTheDocument();

    fireEvent.click(link);
    expect(screen.getByText('Obra detail')).toBeInTheDocument();
  });

  it('renders external links as anchor with target blank', () => {
    renderAssistant('Visita [CONAGUA](https://www.conagua.gob.mx)');

    const link = screen.getByRole('link', { name: 'CONAGUA' });
    expect(link).toHaveAttribute('href', 'https://www.conagua.gob.mx');
    expect(link).toHaveAttribute('target', '_blank');
  });
});

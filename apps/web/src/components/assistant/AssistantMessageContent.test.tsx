import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssistantMessageContent } from './AssistantMessageContent';

describe('AssistantMessageContent', () => {
  it('renders markdown headings and emphasis for assistant messages', () => {
    render(
      <AssistantMessageContent
        content={'### Análisis\n\nTexto con **riesgo alto** y una lista:\n\n- Item uno\n- Item dos'}
        variant="assistant"
      />,
    );

    expect(screen.getByRole('heading', { level: 4, name: 'Análisis' })).toBeInTheDocument();
    expect(screen.getByText('riesgo alto').tagName).toBe('STRONG');
    expect(screen.getByText('Item uno')).toBeInTheDocument();
    expect(screen.getByText('Item dos')).toBeInTheDocument();
  });

  it('renders plain error text without markdown styling side effects', () => {
    render(<AssistantMessageContent content="No se pudo conectar con la API." variant="error" />);
    expect(screen.getByText('No se pudo conectar con la API.')).toHaveClass('text-red-700');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './ui';

describe('Field', () => {
  it('shows a server-provided field error beside the input', () => {
    render(
      <Field label="제목" error="must not be blank">
        <input />
      </Field>,
    );
    const input = screen.getByLabelText('제목');
    const error = screen.getByText('must not be blank');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', error.id);
  });
});

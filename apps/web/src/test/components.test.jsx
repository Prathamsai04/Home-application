import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Badge, Button, ConfirmDialog, EmptyState, Pagination, SearchBar, StatusBadge, Table } from '../components/ui';

describe('Button', () => {
  it('disables and marks busy while loading', () => {
    render(<Button loading>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('fires click handlers', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Badges', () => {
  it('humanizes domain statuses', () => {
    render(
      <>
        <StatusBadge status="checked_in" />
        <StatusBadge status="partially_paid" />
        <Badge tone="red">Custom</Badge>
      </>,
    );
    expect(screen.getByText('Checked In')).toBeInTheDocument();
    expect(screen.getByText('Partially Paid')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });
});

describe('Pagination', () => {
  it('shows range and navigates pages', async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={3} total={25} pageSize={10} onPageChange={onPageChange} />);
    expect(screen.getByText('11')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('renders nothing without results', () => {
    const { container } = render(<Pagination page={1} totalPages={1} total={0} pageSize={10} onPageChange={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('Table', () => {
  const columns = [
    { key: 'name', header: 'Name', sortKey: 'name' },
    { key: 'city', header: 'City' },
  ];

  it('renders rows and toggles sort order', async () => {
    const onSort = vi.fn();
    render(<Table columns={columns} rows={[{ id: '1', name: 'Ana', city: 'Goa' }]} sortBy="name" sortOrder="asc" onSort={onSort} />);
    expect(screen.getByText('Goa')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Name/ }));
    expect(onSort).toHaveBeenCalledWith('name', 'desc');
  });

  it('shows an empty state', () => {
    render(<Table columns={columns} rows={[]} empty={<EmptyState title="Nothing here" />} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});

describe('SearchBar', () => {
  it('debounces search input', () => {
    vi.useFakeTimers();
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Search guests" delay={300} />);
    fireEvent.change(screen.getByPlaceholderText('Search guests'), { target: { value: 'ana' } });
    expect(onSearch).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onSearch).toHaveBeenCalledWith('ana');
    vi.useRealTimers();
  });
});

describe('ConfirmDialog', () => {
  it('confirms and cancels', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<ConfirmDialog open title="Delete?" message="Gone forever" confirmLabel="Delete" onConfirm={onConfirm} onClose={onClose} />);
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Delete?');
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

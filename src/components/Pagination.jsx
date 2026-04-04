import React from 'react';

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const Pagination = ({ currentPage, totalPages, onPageChange, pageSize, onPageSizeChange, total, pageSizeOptions }) => {
  const sizeOptions = pageSizeOptions || DEFAULT_PAGE_SIZE_OPTIONS;
  // Guarantee the current page size is always visible in the dropdown
  const mergedOptions = sizeOptions.includes(pageSize)
    ? sizeOptions
    : [...sizeOptions, pageSize].sort((a, b) => a - b);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="pagination">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <span className="pagination-info">
          {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, total)} з {total}
        </span>

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          style={{
            padding: '0.3rem 0.625rem',
            border: '1px solid var(--bd-1)',
            borderRadius: 'var(--r-md)',
            fontSize: '0.8125rem',
            fontFamily: 'var(--font-sans)',
            background: 'var(--surface)',
            color: 'var(--tx-2)',
            cursor: 'pointer',
            transition: 'all var(--t-base)'
          }}
        >
          {mergedOptions.map(size => (
            <option key={size} value={size}>{size} на сторінці</option>
          ))}
        </select>
      </div>

      <div className="pagination-controls">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="pagination-btn"
          style={{ minWidth: '80px' }}
        >
          ← Попередня
        </button>

        {getPageNumbers().map((page, index) =>
          page === '...' ? (
            <span key={`dots-${index}`} className="pagination-dots">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={`pagination-btn${currentPage === page ? ' active' : ''}`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="pagination-btn"
          style={{ minWidth: '80px' }}
        >
          Наступна →
        </button>
      </div>
    </div>
  );
};

export default Pagination;

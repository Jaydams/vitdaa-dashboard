interface Props {
  totalPages: number;
  currentPage: number;
}

/**
 * Generates an array of pagination buttons based on the total number of pages and the current page.
 * @param props - Object containing totalPages and currentPage.
 * @param props.totalPages - The total number of pages.
 * @param props.currentPage - The current page.
 * @returns An array of pagination buttons.
 */

export const getPaginationButtons = ({ totalPages, currentPage }: Props) => {
  const paginationButtons: (number | "...")[] = [];

  // Safety checks for invalid values
  const safeTotalPages = Math.max(totalPages || 0, 0);
  const safeCurrentPage = Math.max(currentPage || 1, 1);

  // If no pages, return empty array
  if (safeTotalPages === 0) {
    return paginationButtons;
  }

  // Total pages less than 8 pages
  if (safeTotalPages < 8) {
    for (let i = 1; i <= safeTotalPages; i++) {
      paginationButtons.push(i);
    }

    return paginationButtons;
  }

  // Current page in first 5 pages
  if (safeCurrentPage < 5) {
    for (let i = 1; i < 6; i++) {
      paginationButtons.push(i);
    }

    paginationButtons.push("...");
    paginationButtons.push(safeTotalPages);

    return paginationButtons;
  }

  // Current page in last five pages
  if (safeTotalPages - safeCurrentPage < 4) {
    paginationButtons.push(1);
    paginationButtons.push("...");

    for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) {
      paginationButtons.push(i);
    }

    return paginationButtons;
  }

  // Current page not in first or last five pages
  paginationButtons.push(1);
  paginationButtons.push("...");

  for (let i = safeCurrentPage - 1; i <= safeCurrentPage + 1; i++) {
    paginationButtons.push(i);
  }

  paginationButtons.push("...");
  paginationButtons.push(safeTotalPages);

  return paginationButtons;
};

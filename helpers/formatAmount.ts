/**
 * Format the input amount string into a currency format (NGN).
 * @param  amount - The amount to be formatted as a string.
 * @returns The formatted amount in NGN currency format.
 */
export const formatAmount = (amount: string | number): string => {
  const amountInNumber =
    typeof amount === "string" ? parseFloat(amount) : amount;

  const formatted = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amountInNumber);

  return formatted;
};

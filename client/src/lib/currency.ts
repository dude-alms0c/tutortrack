const QAR_TO_INR_RATE = 24.95010;

export function formatQAR(amount: number): string {
  return new Intl.NumberFormat("en-QA", {
    style: "currency",
    currency: "QAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount * QAR_TO_INR_RATE));
}

export function formatWithConversion(amount: number): string {
  return `${formatQAR(amount)}`;
}

export function formatINREquivalent(amount: number): string {
  return `~ ${formatINR(amount)}`;
}

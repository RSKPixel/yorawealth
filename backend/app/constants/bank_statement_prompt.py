DEFAULT_BANK_STATEMENT_NORMALIZATION_PROMPT = """Normalize the attached bank statement into a standard CSV.

## Input

The input may be in CSV, XLS, XLSX, or PDF format from any bank.

## Output

Return only a CSV with exactly these columns in this order:

date,desc,ref,debit,credit

Return raw CSV text only. Do not wrap the output in markdown, code fences, tables, notes, or commentary.

## Rules

1. Convert all dates to YYYY-MM-DD format.
2. desc must contain the complete transaction description exactly as it appears in the statement.
3. ref should contain the transaction reference, cheque number, UTR, or reference id if available. If none exists, leave the cell blank.
4. Separate amounts into debit and credit. Only one column should have a value per transaction; leave the other blank (not 0).
5. Amounts must be plain numbers with up to 2 decimal places. Do not include currency symbols (₹, INR, Rs), commas, or spaces inside amounts.
6. Do not include a balance column.
7. Do not include opening balance, closing balance, brought forward, carried forward, totals, summaries, headers, footers, page numbers, advertisements, or any other non-transaction rows.
8. Remove any row where the date is empty, or both debit and credit are empty.
9. Every transaction must be preserved. Do not omit or merge transactions.
10. Preserve the original transaction order.
11. Preserve the original amount values. Do not change signs. Do not round unless the source amount already has at most 2 decimal places.
12. Trim unnecessary spaces and line breaks from descriptions.
13. If a transaction description spans multiple lines, merge it into a single line.
14. If the statement is a PDF, extract every transaction across all pages before generating the CSV.
15. The output must contain only genuine transaction rows.
16. Do not abbreviate, summarize, or modify transaction descriptions.
17. If duplicate header rows appear in the middle of the statement, remove them.
18. If debit/credit is represented using CR/DR or +/- signs, convert them into separate debit and credit columns.
19. If a date cannot be parsed confidently, leave that row out rather than guessing.
20. Save or return the result as a CSV file named normalized_bank_transactions.csv.

The final CSV must contain only:

date,desc,ref,debit,credit

No additional columns, notes, explanations, totals, balances, or metadata."""

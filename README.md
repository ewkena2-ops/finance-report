# Group Finance Reporting

Reporting system for the group finance controller: nine reports with fixed deadlines, sent to the Chairman. Report 6 also goes to the finance officer.

**Live:** https://ewkena2-ops.github.io/finance-report/

| # | Report | Deadline |
|---|---|---|
| 1 | Daily Group Cash Report | Daily 9:00 AM |
| 2 | 7-Day Cash Flow Forecast | Daily 9:00 AM |
| 3 | Daily Personal Cash Flow Report | Daily 9:00 AM |
| 4 | 4-Week Projection | Thursday 5:00 PM |
| 5 | Finance Control Report | Friday 5:00 PM |
| 6 | Bank Reconciliation | Monday 12:00 PM (Chairman + finance officer) |
| 7 | Monthly Consolidated Financial Statement | By the 7th of the following month |
| 8 | Finance Staff Performance Review | By the 5th of the following month |
| 9 | Incident Report | Immediately |

The **Deadlines & status** view shows whether each report was sent on time, from the "Mark as sent" log. **Compensation & accountability** applies the bonus rules to that log, the incidents and missed loan/tax deadlines.

## Login, roles and privacy

Figures are shared online through a small server on Cloudflare (Worker + D1 database, free plan). Everyone signs in with email and password.

| Role | Who | Sees | Can change |
|---|---|---|---|
| Owner | Chairman | Everything | Everything, and who has access (**Team & access**) |
| Controller | Kidan | Everything | All figures and settings |
| Staff | Selam, Sabella, Rahel | Only the company data sheets they fill in | Balances, transactions, forecast, reconciliation items, monthly results |

Staff never see reports, personal cash, salaries/bonuses or staff reviews. The server enforces this, not only the page.

**Adding people:** there is no self sign-up. The Chairman opens **Data sheet → Team & access**, types the person's name, a login (e.g. `selam@klever.local`, it does not need to be a real email) and a password, picks the role and taps *Give access*, then sends the person the link, login and password. A forgotten password is reset there with *Set password*. Removing a person also deletes their login.

Salary and bonus amounts are private settings stored on the server; they are never in this repository. This site has no "publish data" button. Back up with **Export Excel** and send reports as **PDF**.

To use the page on one device only (no login), leave `apiUrl` empty in `config.js`.

### Server

- API: https://klever-finance-api.ewkena2.workers.dev (code in `server/src/worker.js`, tables in `server/schema.sql`)
- Deploy: `cd server && npx wrangler deploy`
- Passwords are stored as salted PBKDF2 hashes; login tokens are stored hashed; wrong passwords are rate limited.

## Data sheet

Accounts → Daily balances (book + bank statement) → Transactions → Forecast → Loans & tax → Reconciliation items → Monthly results → Staff reviews → Team assessment → Incidents → Submission log → Settings.

Amharic text in PDFs uses the bundled Abyssinica SIL font (`fonts/`, SIL Open Font License).

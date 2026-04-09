# Integrations & API Surface

## Internal API Domains

- /api/auth
- /api/members
- /api/care
- /api/attendance
- /api/finance
- /api/notifications

## External Integrations

- Payments: Paystack, Flutterwave, Stripe
- SMS: Termii, Twilio
- Streaming: YouTube Live, Mixlr, Church Online

## Example Endpoints

```
POST /api/auth/login
POST /api/members/register
GET  /api/care/board
POST /api/care/request
GET  /api/finance/ledger
POST /api/integrations/sms/send
POST /api/integrations/payments/charge
```


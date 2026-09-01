# WA Registration Notifications

Registration success must trigger an optional WhatsApp message to the configured tournament admin number. Verification success must trigger an optional WhatsApp message to the participant's responsible WhatsApp number.

Database persistence is always completed before opening WhatsApp. Both numbers are normalized to Indonesian international format. Messages include registration code, category, both players, clubs, payment/status context, and a concise next-step note.

// Subscriber storage backed by Resend Contacts API
// Towns are stored in the contact's first_name field as a JSON array

import { Resend } from "resend";

const AUDIENCE_ID = "bc8822aa-cb4d-4db6-a4cc-17e035e31395";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function subscribe(email, towns) {
  const resend = getResend();
  const existing = await getContact(email);

  // Merge with existing towns
  const merged = [...new Set([...(existing?.towns || []), ...towns])];

  if (existing?.id) {
    await resend.contacts.update({
      audienceId: AUDIENCE_ID,
      id: existing.id,
      firstName: JSON.stringify(merged),
    });
  } else {
    await resend.contacts.create({
      audienceId: AUDIENCE_ID,
      email,
      firstName: JSON.stringify(merged),
      unsubscribed: false,
    });
  }

  return merged;
}

export async function unsubscribe(email) {
  const resend = getResend();
  const contact = await getContact(email);
  if (contact?.id) {
    await resend.contacts.remove({
      audienceId: AUDIENCE_ID,
      id: contact.id,
    });
  }
}

async function getContact(email) {
  const resend = getResend();
  const { data } = await resend.contacts.list({ audienceId: AUDIENCE_ID });
  const contacts = data?.data || [];
  const match = contacts.find(
    (c) => c.email.toLowerCase() === email.toLowerCase()
  );
  if (!match) return null;

  let towns = [];
  try {
    towns = JSON.parse(match.first_name || "[]");
  } catch {
    towns = [];
  }

  return { id: match.id, email: match.email, towns };
}

export async function getSubscribers() {
  const resend = getResend();
  const { data } = await resend.contacts.list({ audienceId: AUDIENCE_ID });
  const contacts = data?.data || [];

  const grouped = {};
  for (const c of contacts) {
    if (c.unsubscribed) continue;
    let towns = [];
    try {
      towns = JSON.parse(c.first_name || "[]");
    } catch {
      continue;
    }
    if (towns.length > 0) {
      grouped[c.email] = towns;
    }
  }
  return grouped;
}

export async function getTownsForEmail(email) {
  const contact = await getContact(email);
  return contact?.towns || [];
}

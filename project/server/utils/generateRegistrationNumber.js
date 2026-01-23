import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

export function generateRegistrationNumber() {
  const year = new Date().getFullYear();
  return `KM${year}-${nanoid()}`;
}


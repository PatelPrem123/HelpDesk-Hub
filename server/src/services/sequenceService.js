import { Counter } from '../models/Counter.js';

export async function getNextTicketNumber() {
  const currentYear = new Date().getFullYear();
  const counterId = `ticketSeq_${currentYear}`;

  // Atomic increment with upsert guarantees race-condition-free sequences (DEC-005)
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { currentSeq: 1 } },
    { new: true, upsert: true }
  );

  const paddedSequence = String(counter.currentSeq).padStart(4, '0');
  return `HD-${currentYear}-${paddedSequence}`;
}

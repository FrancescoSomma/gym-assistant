// ponytail: native confirm (works in iOS Home Screen apps). Replace with a Sheet here, in one
// place, if a custom look or custom button labels are ever needed.
export function confirmAction(message: string): boolean {
  return window.confirm(message);
}
